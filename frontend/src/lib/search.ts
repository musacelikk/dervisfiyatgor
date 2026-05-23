import { searchProducts } from "@/lib/api";
import type { Product, SearchBy } from "@/types/product";

export const FIELD_LABELS: Record<SearchBy, string> = {
  barcode: "Barkod",
  stockCode: "Stok Kodu",
  name: "Ürün Adı",
  group: "Grubu",
};

export type SearchCriterion = { by: SearchBy; value: string };

export function buildCriteria(fields: {
  barcode: string;
  stockCode: string;
  productName: string;
  productGroup: string;
}): SearchCriterion[] {
  const criteria: SearchCriterion[] = [];
  if (fields.barcode.trim()) criteria.push({ by: "barcode", value: fields.barcode.trim() });
  if (fields.stockCode.trim())
    criteria.push({ by: "stockCode", value: fields.stockCode.trim() });
  if (fields.productName.trim())
    criteria.push({ by: "name", value: fields.productName.trim() });
  if (fields.productGroup.trim())
    criteria.push({ by: "group", value: fields.productGroup.trim() });
  return criteria;
}

export function validateCriteria(criteria: SearchCriterion[]): string | null {
  if (criteria.length === 0) {
    return "En az bir arama alanı doldurun.";
  }
  for (const c of criteria) {
    if ((c.by === "name" || c.by === "group") && c.value.length < 2) {
      return `${FIELD_LABELS[c.by]} için en az 2 karakter girin.`;
    }
  }
  return null;
}

/** Barkod okutma: önce barkod, bulunamazsa stok kodu dene */
export async function lookupByScannedCode(code: string): Promise<Product[]> {
  const trimmed = code.trim();
  if (!trimmed) return [];

  const byBarcode = await searchProducts("barcode", trimmed);
  if (byBarcode.products.length > 0) return byBarcode.products;

  const byStock = await searchProducts("stockCode", trimmed);
  return byStock.products;
}

export async function runProductSearch(criteria: SearchCriterion[]): Promise<Product[]> {
  let merged: Product[] | null = null;

  for (const c of criteria) {
    const { products } = await searchProducts(c.by, c.value);
    if (merged === null) {
      merged = products;
    } else {
      const codes = new Set(products.map((p) => p.stockCode));
      merged = merged.filter((p) => codes.has(p.stockCode));
    }
  }

  return merged ?? [];
}
