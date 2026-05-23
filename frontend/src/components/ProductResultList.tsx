import type { Product } from "@/types/product";

interface ProductResultListProps {
  products: Product[];
  onSelect?: (product: Product) => void;
}

function formatPrice(price: number | null): string {
  if (price === null) return "—";
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

export default function ProductResultList({
  products,
  onSelect,
}: ProductResultListProps) {
  if (products.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-zinc-500">Ürün bulunamadı.</p>
    );
  }

  return (
    <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl ring-1 ring-zinc-200/80">
      {products.map((p) => {
        const price = p.salePrice1 ?? p.salePrice2;
        return (
          <li key={p.stockCode}>
            <button
              type="button"
              onClick={() => onSelect?.(p)}
              className="flex w-full items-center gap-3 bg-white px-4 py-3.5 text-left transition hover:bg-zinc-50 active:bg-zinc-100"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-900">{p.name}</p>
                <p className="mt-0.5 font-mono text-xs text-zinc-500">{p.stockCode}</p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-accent">
                {formatPrice(price)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
