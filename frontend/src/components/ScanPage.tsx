"use client";

import { useCallback, useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import BarcodeScanner from "@/components/BarcodeScanner";
import BottomSheet from "@/components/BottomSheet";
import ProductDetailView from "@/components/ProductDetailView";
import ProductResultList from "@/components/store/ProductResultList";
import SearchField from "@/components/SearchField";
import CartSheet from "@/components/store/CartSheet";
import StoreFloatingCart from "@/components/store/StoreFloatingCart";
import StoreToast from "@/components/store/StoreToast";
import { IconBarcode, IconLayers, IconSearch, IconTag } from "@/components/store/StoreIcons";
import { getHealth } from "@/lib/api";
import { cartTotal } from "@/lib/cart";
import { useStoreCart } from "@/lib/use-store-cart";
import {
  buildCriteria,
  lookupByScannedCode,
  runProductSearch,
  validateCriteria,
} from "@/lib/search";
import { hasPermission, type PermissionId } from "@/lib/permissions";
import type { Product } from "@/types/product";

function StatusBanner({
  variant,
  children,
}: {
  variant: "error" | "warn";
  children: React.ReactNode;
}) {
  const styles = {
    error: "bg-red-50 text-red-700 ring-red-200/80",
    warn: "bg-amber-50 text-amber-800 ring-amber-200/80",
  };
  return (
    <p
      className={`shrink-0 rounded-xl px-3 py-2 text-center text-xs font-medium ring-1 ${styles[variant]}`}
      role="alert"
    >
      {children}
    </p>
  );
}

interface ScanPageProps {
  variant?: "store" | "manager";
  permissions?: PermissionId[];
  personnelName?: string;
}

export default function ScanPage({
  variant = "store",
  permissions = [],
  personnelName,
}: ScanPageProps) {
  const isManager = variant === "manager";
  const showPurchasePrices =
    isManager && hasPermission(permissions, "prices.purchase");
  // Mağaza (müşteri) ekranında zaten alış/2. fiyat mantığı yok; kısıt personele uygulanır.
  const showSalePrice2 = !isManager || hasPermission(permissions, "prices.sale2");
  const [barcode, setBarcode] = useState("");
  const [stockCode, setStockCode] = useState("");
  const [productName, setProductName] = useState("");
  const [productGroup, setProductGroup] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetView, setSheetView] = useState<"list" | "detail">("list");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sheetTitle, setSheetTitle] = useState("Sonuçlar");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catalogCount, setCatalogCount] = useState<number | null>(null);
  const [apiOnline, setApiOnline] = useState(true);
  const [barcodeLookup, setBarcodeLookup] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const { lines, setLines, addProduct, itemCount: cartCount, priceTier, setPriceTier } = useStoreCart(
    isManager ? "personnel" : "store"
  );
  const cartSum = cartTotal(lines, priceTier);
  const hasCart = cartCount > 0;

  const refreshHealth = useCallback(async () => {
    try {
      const h = await getHealth();
      setCatalogCount(h.productCount);
      setApiOnline(true);
      return h.productCount;
    } catch {
      setCatalogCount(null);
      setApiOnline(false);
      return null;
    }
  }, []);

  useEffect(() => {
    void refreshHealth();
  }, [refreshHealth]);

  const openResults = useCallback(
    (products: Product[], options?: { fromBarcode?: boolean }) => {
      setResults(products);

      if (products.length === 1 && options?.fromBarcode) {
        setSelectedProduct(products[0]);
        setSheetView("detail");
        setSheetTitle("Ürün detayı");
      } else {
        setSelectedProduct(null);
        setSheetView("list");
        setSheetTitle(
          products.length > 0
            ? `${products.length} ürün bulundu`
            : "Sonuç bulunamadı"
        );
      }

      setSheetOpen(true);
    },
    []
  );

  const executeSearch = useCallback(
    async (fields: {
      barcode: string;
      stockCode: string;
      productName: string;
      productGroup: string;
      fromBarcode?: boolean;
    }) => {
      const criteria = buildCriteria(fields);
      const validationError = validateCriteria(criteria);
      if (validationError) {
        setError(validationError);
        return;
      }

      if (!apiOnline) {
        setError("Sunucuya ulaşılamıyor. Bağlantınızı kontrol edin.");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const products = await runProductSearch(criteria);
        openResults(products, { fromBarcode: fields.fromBarcode });
      } catch (err) {
        setResults([]);
        setError(err instanceof Error ? err.message : "Arama başarısız.");
      } finally {
        setLoading(false);
      }
    },
    [apiOnline, openResults]
  );

  const handleFilter = useCallback(() => {
    void executeSearch({
      barcode,
      stockCode,
      productName,
      productGroup,
    });
  }, [barcode, stockCode, productName, productGroup, executeSearch]);

  const handleBarcodeScan = useCallback(
    async (code: string) => {
      const trimmed = code.trim();
      if (!trimmed) return;

      setBarcode(trimmed);
      setError(null);
      setBarcodeLookup(true);
      setSheetOpen(true);
      setSheetView("detail");
      setSelectedProduct(null);
      setSheetTitle("Aranıyor…");

      if (!apiOnline) {
        setBarcodeLookup(false);
        setSheetOpen(false);
        setError("Sunucuya ulaşılamıyor. Bağlantınızı kontrol edin.");
        return;
      }

      try {
        const products = await lookupByScannedCode(trimmed);
        setResults(products);

        if (products.length > 0) {
          setSelectedProduct(products[0]);
          setSheetView("detail");
          setSheetTitle("Ürün detayı");
        } else {
          setSheetView("list");
          setSheetTitle("Ürün bulunamadı");
        }
      } catch (err) {
        setSheetOpen(false);
        setError(err instanceof Error ? err.message : "Ürün aranırken hata oluştu.");
      } finally {
        setBarcodeLookup(false);
      }
    },
    [apiOnline]
  );

  const clearFields = () => {
    setBarcode("");
    setStockCode("");
    setProductName("");
    setProductGroup("");
    setError(null);
  };

  const hasAnyField =
    barcode.trim() || stockCode.trim() || productName.trim() || productGroup.trim();

  const closeSheet = () => {
    setSheetOpen(false);
    setSheetView("list");
    setSelectedProduct(null);
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setSheetView("detail");
    setSheetTitle("Ürün detayı");
  };

  const handleAddToCart = (product: Product, quantity = 1) => {
    addProduct(product, quantity);
    setToast(`${product.name} sepete eklendi`);
  };

  const storeHasCart = !isManager && hasCart;
  const employeeHasCart = isManager && hasCart;

  return (
    <div className={isManager ? "employee-scan-page" : "store-page store-page-shell flex flex-col"}>
      {!isManager && (
        <AppHeader
          productCount={catalogCount}
          apiOnline={apiOnline}
          cartCount={cartCount}
          onCartClick={() => setCartOpen(true)}
        />
      )}

      <main
        className={
          isManager
            ? `employee-main-scan${employeeHasCart ? " employee-main-scan-with-cart" : ""}`
            : `store-main${storeHasCart ? " store-main-with-cart" : ""}`
        }
      >
        {!isManager && (
          <div className="store-hero">
            <h1 className="store-hero-title">Ürün ara & sipariş ver</h1>
            <p className="store-hero-desc">Barkod okutun, fiyatı görün, sepete ekleyin</p>
          </div>
        )}

        {(!apiOnline || (apiOnline && catalogCount === 0) || error) && (
          <div className="flex shrink-0 flex-col gap-2">
            {!apiOnline && (
              <StatusBanner variant="error">Sunucuya bağlanılamıyor.</StatusBanner>
            )}
            {apiOnline && catalogCount === 0 && (
              <StatusBanner variant="warn">
                Katalog henüz yüklenmemiş. Lütfen daha sonra tekrar deneyin.
              </StatusBanner>
            )}
            {error && <StatusBanner variant="error">{error}</StatusBanner>}
          </div>
        )}

        <BarcodeScanner onScan={handleBarcodeScan} variant={isManager ? "default" : "store"} />

        {!isManager && (
          <div className="store-divider">
            <span>veya manuel ara</span>
          </div>
        )}

        <section className={isManager ? "app-card flex flex-col p-4" : "store-search-card shrink-0"}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="store-search-card-icon">
                <IconSearch className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">Manuel arama</h2>
                {!isManager && (
                  <p className="text-[11px] text-zinc-500">Bir alan yeterli</p>
                )}
                {isManager && (
                  <p className="text-xs text-zinc-500">Satış ve alış fiyatları dahil</p>
                )}
              </div>
            </div>
            {hasAnyField && (
              <button type="button" onClick={clearFields} className="store-clear-btn">
                Temizle
              </button>
            )}
          </div>

          <div className="store-search-fields">
            <SearchField
              label="Barkod"
              value={barcode}
              onChange={setBarcode}
              placeholder="Barkod numarası"
              inputMode="numeric"
              icon={<IconBarcode />}
            />
            <SearchField
              label="Stok kodu"
              value={stockCode}
              onChange={setStockCode}
              placeholder="Örn. ST03407"
              icon={<IconTag />}
            />
            <SearchField
              label="Ürün adı"
              value={productName}
              onChange={setProductName}
              placeholder="Ürün adında ara"
              icon={<IconSearch />}
            />
            <SearchField
              label="Grup"
              value={productGroup}
              onChange={setProductGroup}
              placeholder="Örn. ORSA"
              icon={<IconLayers />}
            />
          </div>

          <button
            type="button"
            onClick={handleFilter}
            disabled={loading || !apiOnline}
            className={isManager ? "btn-primary mt-4" : "store-search-btn mt-3"}
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Aranıyor…
              </>
            ) : (
              <>
                {!isManager && <IconSearch className="h-4 w-4" />}
                Ürün ara
              </>
            )}
          </button>
        </section>
      </main>

      <BottomSheet
        open={sheetOpen}
        onClose={closeSheet}
        onBack={
          sheetView === "detail" && results.length > 1
            ? () => {
                setSheetView("list");
                setSheetTitle(`${results.length} ürün bulundu`);
              }
            : undefined
        }
        title={sheetTitle}
        subtitle={
          sheetView === "list"
            ? "Sepete ekleyin veya detay için dokunun"
            : selectedProduct?.stockCode
        }
      >
        {barcodeLookup ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-accent" />
            <p className="text-sm text-zinc-500">Ürün aranıyor…</p>
          </div>
        ) : sheetView === "list" ? (
          <ProductResultList
            products={results}
            onSelect={handleSelectProduct}
            storeMode
            onAddToCart={handleAddToCart}
          />
        ) : selectedProduct ? (
          <ProductDetailView
            product={selectedProduct}
            showPurchasePrices={showPurchasePrices}
            showSalePrice2={showSalePrice2}
            onAddToCart={(quantity) => {
              handleAddToCart(selectedProduct, quantity);
              setCartOpen(true);
            }}
          />
        ) : (
          <p className="py-10 text-center text-sm text-zinc-500">
            Bu barkoda ait ürün katalogda bulunamadı.
          </p>
        )}
      </BottomSheet>

      <StoreFloatingCart
        itemCount={cartCount}
        total={cartSum}
        onOpen={() => setCartOpen(true)}
        hidden={cartOpen || (!storeHasCart && !employeeHasCart)}
        className={isManager ? "store-floating-cart-wrap--employee" : undefined}
      />
      <StoreToast
        message={toast}
        onClear={() => setToast(null)}
        aboveFloatingCart={(storeHasCart || employeeHasCart) && !cartOpen}
        className={isManager ? "store-toast--employee" : undefined}
      />
      <CartSheet
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        lines={lines}
        onLinesChange={setLines}
        mode={isManager ? "personnel" : "store"}
        personnelName={personnelName}
        priceTier={priceTier}
        onPriceTierChange={setPriceTier}
        allowPrice2={showSalePrice2}
      />
    </div>
  );
}
