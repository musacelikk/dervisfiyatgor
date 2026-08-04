export type ProductImage = {
  id: number;
  url: string;
  sortOrder?: number;
  objectKey?: string;
  stockCode?: string;
  createdAt?: string;
};

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
  images?: ProductImage[];
  imageUrl?: string | null;
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

/** Herkese açık katalog yalnızca bu alanları döner (alış fiyatı, stok,
 *  barkod ve açıklamalar bilinçli olarak yok). */
export type CatalogProduct = Pick<
  Product,
  "stockCode" | "name" | "unit" | "group" | "salePrice1" | "salePrice2"
> & {
  images: ProductImage[];
  imageUrl: string | null;
};

export interface CatalogListResult {
  products: CatalogProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  query: string;
  /** Admin ayarı: satış kataloğunda fiyat gösterilsin mi */
  showPrices: boolean;
}

export interface HealthStatus {
  status: string;
  productCount: number;
  employeeCount?: number;
  timestamp: string;
}
