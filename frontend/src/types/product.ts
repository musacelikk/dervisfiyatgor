export interface Product {
  stockCode: string;
  name: string;
  unit: string | null;
  barcode: string | null;
  salePrice1: number | null;
  salePrice2: number | null;
  purchasePrice1?: number | null;
  purchasePrice2?: number | null;
  remainingQty: number | null;
  description1: string | null;
  description2: string | null;
  group: string | null;
  countStatus?: StockCountStatus;
}

export type StockCountStatus = "pending" | "updated" | "unchanged";

export interface StockCountState {
  active: boolean;
  startedAt: string | null;
}

export type SearchBy = "barcode" | "stockCode" | "name" | "group";

export interface SearchResult {
  by: SearchBy;
  query: string;
  products: Product[];
  count: number;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  totalRows: number;
  productCount: number;
  headers: string[];
  replace: boolean;
}

export interface ProductListResult {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  query: string;
  showAll?: boolean;
  stockCount?: StockCountState;
}

export interface HealthStatus {
  status: string;
  productCount: number;
  employeeCount?: number;
  timestamp: string;
}
