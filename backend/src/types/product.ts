/** Zorunlu Excel kolonları */
export const EXCEL_COLUMNS = {
  stockCode: "Stok Kodu",
  barcode: "Barkodu",
  name: "Stok Adı",
  salePrice1: "Satış Fiyatı 1",
  salePrice2: "Satış Fiyatı 2",
  remainingQty: "Kalan Miktar",
  unit: "Birimi",
  description1: "Açıklama 1",
  description2: "Açıklama 2",
  group: "Grubu",
} as const;

/** Opsiyonel — dosyada varsa içe aktarılır */
export const OPTIONAL_EXCEL_COLUMNS = {
  purchasePrice1: "Alış Fiyatı 1",
  purchasePrice2: "Alış Fiyatı 2",
} as const;

export const EXCEL_COLUMN_ALIASES: Partial<Record<keyof typeof EXCEL_COLUMNS, string[]>> = {
  remainingQty: ["Kalan Miktar", "Kalan Mikta"],
};

export type ExcelColumnKey = keyof typeof EXCEL_COLUMNS;
export type OptionalExcelColumnKey = keyof typeof OPTIONAL_EXCEL_COLUMNS;

export interface Product {
  stockCode: string;
  name: string;
  unit: string | null;
  barcode: string | null;
  salePrice1: number | null;
  salePrice2: number | null;
  purchasePrice1: number | null;
  purchasePrice2: number | null;
  remainingQty: number | null;
  description1: string | null;
  description2: string | null;
  group: string | null;
}

export interface ProductRow {
  stock_code: string;
  name: string;
  unit: string | null;
  barcode: string | null;
  sale_price_1: number | null;
  sale_price_2: number | null;
  purchase_price_1: number | null;
  purchase_price_2: number | null;
  remaining_qty: number | null;
  description_1: string | null;
  description_2: string | null;
  group_name: string | null;
}
