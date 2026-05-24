import type { Product } from "../types/product";

function normText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function normNum(value: number | null | undefined): number | null {
  return value == null ? null : value;
}

/** Ürün alanlarında gerçek bir değişiklik olup olmadığını kontrol eder. */
export function productDataChanged(before: Product, after: Product): boolean {
  return (
    normText(before.name) !== normText(after.name) ||
    normText(before.unit) !== normText(after.unit) ||
    normText(before.barcode) !== normText(after.barcode) ||
    normNum(before.salePrice1) !== normNum(after.salePrice1) ||
    normNum(before.salePrice2) !== normNum(after.salePrice2) ||
    normNum(before.purchasePrice1) !== normNum(after.purchasePrice1) ||
    normNum(before.purchasePrice2) !== normNum(after.purchasePrice2) ||
    normNum(before.remainingQty) !== normNum(after.remainingQty) ||
    normText(before.description1) !== normText(after.description1) ||
    normText(before.description2) !== normText(after.description2) ||
    normText(before.group) !== normText(after.group)
  );
}
