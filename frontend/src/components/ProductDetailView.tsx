"use client";

import { useMemo, useState } from "react";
import StoreQtyStepper from "@/components/store/StoreQtyStepper";
import { formatStorePrice, productSalePrice } from "@/lib/store-format";
import type { Product } from "@/types/product";

interface ProductDetailViewProps {
  product: Product;
  showPurchasePrices?: boolean;
  onAddToCart?: (quantity: number) => void;
}

function formatQty(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(value);
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="store-detail-row">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export default function ProductDetailView({
  product,
  showPurchasePrices = false,
  onAddToCart,
}: ProductDetailViewProps) {
  const [qty, setQty] = useState(1);
  const mainSale = productSalePrice(product);
  const altSale =
    product.salePrice1 != null &&
    product.salePrice2 != null &&
    product.salePrice1 !== product.salePrice2
      ? product.salePrice1 === mainSale
        ? product.salePrice2
        : product.salePrice1
      : null;

  const lineTotal = useMemo(
    () => (mainSale != null ? mainSale * qty : null),
    [mainSale, qty]
  );

  const isStore = Boolean(onAddToCart);

  return (
    <div className={isStore ? "store-detail" : "pb-2"}>
      <div className={isStore ? "store-detail-price-hero" : "mb-4 rounded-2xl bg-accent-soft px-4 py-5 text-center ring-1 ring-red-100"}>
        <p className={isStore ? "store-detail-price-label" : "text-xs font-medium uppercase tracking-wider text-accent"}>
          Satış fiyatı
        </p>
        <p className={isStore ? "store-detail-price-value" : "mt-1 text-3xl font-bold tabular-nums tracking-tight text-zinc-900"}>
          {formatStorePrice(mainSale)}
        </p>
        {altSale != null && (
          <p className={isStore ? "store-detail-price-alt" : "mt-1 text-sm text-zinc-600"}>
            {isStore ? (
              <>
                2. fiyat: <strong>{formatStorePrice(altSale)}</strong>
              </>
            ) : (
              <>
                Satış fiyatı 2:{" "}
                <span className="font-semibold tabular-nums">{formatStorePrice(altSale)}</span>
              </>
            )}
          </p>
        )}
      </div>

      {showPurchasePrices &&
        (product.purchasePrice1 != null || product.purchasePrice2 != null) && (
          <div className="mb-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-amber-50 px-3 py-3 ring-1 ring-amber-200/80">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-800">
                Alış 1
              </p>
              <p className="mt-0.5 text-lg font-bold tabular-nums text-amber-950">
                {formatStorePrice(product.purchasePrice1)}
              </p>
            </div>
            <div className="rounded-xl bg-amber-50 px-3 py-3 ring-1 ring-amber-200/80">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-800">
                Alış 2
              </p>
              <p className="mt-0.5 text-lg font-bold tabular-nums text-amber-950">
                {formatStorePrice(product.purchasePrice2)}
              </p>
            </div>
          </div>
        )}

      <p className={isStore ? "store-detail-name" : "mb-3 text-base font-semibold leading-snug text-zinc-900"}>
        {product.name}
      </p>

      <div className={isStore ? "store-detail-specs" : "rounded-xl bg-zinc-50 px-4 ring-1 ring-zinc-200/80"}>
        <DetailRow label="Stok kodu" value={product.stockCode} />
        <DetailRow label="Barkod" value={product.barcode ?? "—"} />
        <DetailRow label={isStore ? "Stok" : "Kalan miktar"} value={formatQty(product.remainingQty)} />
        <DetailRow label="Birim" value={product.unit ?? "—"} />
        <DetailRow label="Grup" value={product.group ?? "—"} />
      </div>

      {onAddToCart && (
        <div className="store-detail-footer">
          <StoreQtyStepper value={qty} onChange={setQty} />
          <button
            type="button"
            className="store-product-add-btn store-product-add-btn-lg"
            onClick={() => onAddToCart(qty)}
          >
            Sepete ekle · {formatStorePrice(lineTotal ?? mainSale)}
          </button>
        </div>
      )}
    </div>
  );
}
