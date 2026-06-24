export function formatStorePrice(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function productSalePrice(product: {
  salePrice1: number | null;
  salePrice2: number | null;
}): number | null {
  return productUnitPrice(product, 1);
}

export function productUnitPrice(
  product: {
    salePrice1: number | null;
    salePrice2: number | null;
  },
  tier: 1 | 2 = 1
): number | null {
  return tier === 2
    ? (product.salePrice2 ?? product.salePrice1)
    : (product.salePrice1 ?? product.salePrice2);
}
