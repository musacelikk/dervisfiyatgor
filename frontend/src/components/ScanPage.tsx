"use client";

import { useCallback, useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import BarcodeScanner from "@/components/BarcodeScanner";
import BottomSheet from "@/components/BottomSheet";
import ManagerHeader from "@/components/ManagerHeader";
import MobileMenu from "@/components/MobileMenu";
import ProductDetailView from "@/components/ProductDetailView";
import ProductResultList from "@/components/ProductResultList";
import SearchField from "@/components/SearchField";
import { getHealth } from "@/lib/api";
import {
  buildCriteria,
  lookupByScannedCode,
  runProductSearch,
  validateCriteria,
} from "@/lib/search";
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
}

export default function ScanPage({ variant = "store" }: ScanPageProps) {
  const isManager = variant === "manager";
  const [menuOpen, setMenuOpen] = useState(false);
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

  return (
    <div
      className="flex min-h-[100dvh] flex-col bg-surface"
    >
      {isManager ? (
        <ManagerHeader productCount={catalogCount} />
      ) : (
        <>
          <AppHeader
            menuOpen={menuOpen}
            onMenuClick={() => setMenuOpen((o) => !o)}
            productCount={catalogCount}
          />
          <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
        </>
      )}

      <main className="mx-auto flex w-full max-w-md min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {(!apiOnline || (apiOnline && catalogCount === 0) || error) && (
          <div className="flex shrink-0 flex-col gap-2">
            {!apiOnline && (
              <StatusBanner variant="error">Sunucuya bağlanılamıyor.</StatusBanner>
            )}
            {apiOnline && catalogCount === 0 && (
              <StatusBanner variant="warn">
                Katalog boş. Admin panelinden Excel yükleyin.
              </StatusBanner>
            )}
            {error && <StatusBanner variant="error">{error}</StatusBanner>}
          </div>
        )}

        <BarcodeScanner onScan={handleBarcodeScan} />

        <section className="app-card flex flex-col p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Manuel arama</h2>
              <p className="text-xs text-zinc-500">
                {isManager
                  ? "Satış ve alış fiyatları dahil detay gösterilir"
                  : "Alanlardan birini doldurmanız yeterli"}
              </p>
            </div>
            {hasAnyField && (
              <button
                type="button"
                onClick={clearFields}
                className="shrink-0 text-xs font-medium text-zinc-400 transition hover:text-accent"
              >
                Temizle
              </button>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <SearchField
              label="Barkod"
              value={barcode}
              onChange={setBarcode}
              placeholder="Barkod numarası"
              inputMode="numeric"
              autoComplete="off"
            />
            <SearchField
              label="Stok kodu"
              value={stockCode}
              onChange={setStockCode}
              placeholder="Örn. ST03407"
              autoComplete="off"
            />
            <SearchField
              label="Ürün adı"
              value={productName}
              onChange={setProductName}
              placeholder="Ürün adında ara"
              autoComplete="off"
            />
            <SearchField
              label="Grup"
              value={productGroup}
              onChange={setProductGroup}
              placeholder="Örn. ORSA"
              autoComplete="off"
            />
          </div>

          <button
            type="button"
            onClick={handleFilter}
            disabled={loading || !apiOnline}
            className="btn-primary mt-4"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Aranıyor…
              </>
            ) : (
              "Ara"
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
            ? "Detay için satıra dokunun"
            : selectedProduct?.stockCode
        }
      >
        {barcodeLookup ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-accent" />
            <p className="text-sm text-zinc-500">Ürün aranıyor…</p>
          </div>
        ) : sheetView === "list" ? (
          <ProductResultList products={results} onSelect={handleSelectProduct} />
        ) : selectedProduct ? (
          <ProductDetailView
            product={selectedProduct}
            showPurchasePrices={isManager}
          />
        ) : (
          <p className="py-10 text-center text-sm text-zinc-500">
            Bu barkoda ait ürün katalogda bulunamadı.
          </p>
        )}
      </BottomSheet>
    </div>
  );
}
