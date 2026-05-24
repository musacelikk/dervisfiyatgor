const SEARCH_LOCALE = "tr-TR";

/** Türkçe/İngilizce büyük-küçük harf duyarsız arama (İ/I, ş/Ş vb.) */
export function normalizeSearchText(value: string): string {
  return value.trim().toLocaleLowerCase(SEARCH_LOCALE);
}

export function escapeLike(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/** Normalize edilmiş metin üzerinde LIKE deseni */
export function buildSearchLikePattern(query: string): string {
  const normalized = normalizeSearchText(query);
  if (!normalized) return "%";
  return `%${escapeLike(normalized)}%`;
}

export function productNormValues(product: {
  stockCode: string;
  name: string;
  barcode?: string | null;
  group?: string | null;
}): {
  stockCodeNorm: string;
  nameNorm: string;
  barcodeNorm: string | null;
  groupNameNorm: string | null;
} {
  const barcode = product.barcode?.trim() || null;
  const group = product.group?.trim() || null;
  return {
    stockCodeNorm: normalizeSearchText(product.stockCode),
    nameNorm: normalizeSearchText(product.name),
    barcodeNorm: barcode ? normalizeSearchText(barcode) : null,
    groupNameNorm: group ? normalizeSearchText(group) : null,
  };
}
