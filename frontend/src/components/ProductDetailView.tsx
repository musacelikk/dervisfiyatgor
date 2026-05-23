import type { Product } from "@/types/product";

interface ProductDetailViewProps {
  product: Product;
  showPurchasePrices?: boolean;
}

function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatQty(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 2,
  }).format(value);
}

function DetailRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-start justify-between gap-4 border-b py-2.5 text-sm last:border-0 ${
        highlight ? "border-amber-200/60" : "border-zinc-100"
      }`}
    >
      <span className={`shrink-0 ${highlight ? "text-amber-800" : "text-zinc-500"}`}>
        {label}
      </span>
      <span
        className={`text-right font-medium tabular-nums ${
          highlight ? "text-amber-950" : "text-zinc-900"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export default function ProductDetailView({
  product,
  showPurchasePrices = false,
}: ProductDetailViewProps) {
  const mainSale = product.salePrice1 ?? product.salePrice2;
  const altSale =
    product.salePrice1 != null &&
    product.salePrice2 != null &&
    product.salePrice1 !== product.salePrice2
      ? product.salePrice1 === mainSale
        ? product.salePrice2
        : product.salePrice1
      : null;

  return (
    <div className="pb-2">
      <div className="mb-4 rounded-2xl bg-accent-soft px-4 py-5 text-center ring-1 ring-red-100">
        <p className="text-xs font-medium uppercase tracking-wider text-accent">
          Satış fiyatı 1
        </p>
        <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-zinc-900">
          {formatMoney(mainSale)}
        </p>
        {altSale != null && (
          <p className="mt-1 text-sm text-zinc-600">
            Satış fiyatı 2:{" "}
            <span className="font-semibold tabular-nums">{formatMoney(altSale)}</span>
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
                {formatMoney(product.purchasePrice1)}
              </p>
            </div>
            <div className="rounded-xl bg-amber-50 px-3 py-3 ring-1 ring-amber-200/80">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-800">
                Alış 2
              </p>
              <p className="mt-0.5 text-lg font-bold tabular-nums text-amber-950">
                {formatMoney(product.purchasePrice2)}
              </p>
            </div>
          </div>
        )}

      <p className="mb-3 text-base font-semibold leading-snug text-zinc-900">{product.name}</p>

      <div className="rounded-xl bg-zinc-50 px-4 ring-1 ring-zinc-200/80">
        <DetailRow label="Stok kodu" value={product.stockCode} />
        <DetailRow label="Barkod" value={product.barcode ?? "—"} />
        <DetailRow label="Kalan miktar" value={formatQty(product.remainingQty)} />
        <DetailRow label="Birim" value={product.unit ?? "—"} />
        <DetailRow label="Grup" value={product.group ?? "—"} />
        {(product.description1 || product.description2) && (
          <>
            <DetailRow label="Açıklama 1" value={product.description1 ?? "—"} />
            <DetailRow label="Açıklama 2" value={product.description2 ?? "—"} />
          </>
        )}
        {!showPurchasePrices && product.salePrice2 != null && altSale == null && (
          <DetailRow label="Satış fiyatı 2" value={formatMoney(product.salePrice2)} />
        )}
      </div>
    </div>
  );
}
