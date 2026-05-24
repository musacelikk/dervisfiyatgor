import { isPostgres } from "../lib/database";
import type { Product, ProductRow } from "../types/product";
import * as sqlite from "./db-sqlite";
import * as pg from "./db-pg";

export type SearchBy = sqlite.SearchBy;

/** Aynı dosyada tekrarlayan barkodlarda son satır kazanır (eski tek tek ekleme davranışı). */
function normalizeImportBarcodes(products: Product[]): Product[] {
  const winnerByBarcode = new Map<string, string>();
  for (const p of products) {
    const bc = p.barcode?.trim();
    if (bc) winnerByBarcode.set(bc, p.stockCode);
  }
  if (winnerByBarcode.size === 0) return products;

  return products.map((p) => {
    const bc = p.barcode?.trim();
    if (!bc || winnerByBarcode.get(bc) === p.stockCode) return p;
    return { ...p, barcode: null };
  });
}

export async function upsertProducts(products: Product[]): Promise<number> {
  const normalized = normalizeImportBarcodes(products);
  if (isPostgres()) return pg.upsertProducts(normalized);
  return sqlite.upsertProducts(normalized);
}

export async function searchProducts(by: SearchBy, query: string): Promise<ProductRow[]> {
  if (isPostgres()) return pg.searchProducts(by, query);
  return sqlite.searchProducts(by, query);
}

export async function getProductByCode(code: string): Promise<ProductRow | undefined> {
  return (
    (await searchProducts("barcode", code))[0] ??
    (await searchProducts("stockCode", code))[0]
  );
}

export async function getProductCount(): Promise<number> {
  if (isPostgres()) return pg.getProductCount();
  return sqlite.getProductCount();
}

export async function listAllProducts(): Promise<ProductRow[]> {
  if (isPostgres()) return pg.listAllProducts();
  return sqlite.listAllProducts();
}

export async function getProductByStockCode(stockCode: string): Promise<ProductRow | undefined> {
  if (isPostgres()) return pg.getProductByStockCode(stockCode);
  return sqlite.getProductByStockCode(stockCode);
}

export async function listProductsPaged(options: {
  q?: string;
  page: number;
  limit: number | "all";
}): Promise<{ rows: ProductRow[]; total: number }> {
  if (isPostgres()) return pg.listProductsPaged(options);
  return sqlite.listProductsPaged(options);
}

export async function createProduct(product: Product): Promise<void> {
  if (isPostgres()) return pg.createProduct(product);
  return sqlite.createProduct(product);
}

export async function updateProduct(
  stockCode: string,
  updates: Partial<Product>
): Promise<Product> {
  if (isPostgres()) return pg.updateProduct(stockCode, updates);
  return sqlite.updateProduct(stockCode, updates);
}

export async function deleteProduct(stockCode: string): Promise<void> {
  if (isPostgres()) return pg.deleteProduct(stockCode);
  return sqlite.deleteProduct(stockCode);
}

export async function clearProducts(): Promise<void> {
  if (isPostgres()) return pg.clearProducts();
  return sqlite.clearProducts();
}
