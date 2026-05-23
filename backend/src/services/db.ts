import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import type { Product, ProductRow } from "../types/product";

/** Vercel serverless: yalnızca /tmp yazılabilir; yerelde backend/data kullanılır. */
function resolveDataDir(): string {
  if (process.env.VERCEL) {
    return path.join("/tmp", "aknsoftfiyatgor-data");
  }
  return path.join(__dirname, "../../data");
}

const dataDir = resolveDataDir();
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "products.db");
const db = new Database(dbPath);

const SCHEMA_VERSION = 5;
const NAME_SEARCH_LIMIT = 30;

function migrate(): void {
  const currentVersion = db.pragma("user_version", { simple: true }) as number;

  if (currentVersion >= SCHEMA_VERSION) return;

  if (currentVersion === 4) {
    db.exec(`
      ALTER TABLE products ADD COLUMN purchase_price_1 REAL;
      ALTER TABLE products ADD COLUMN purchase_price_2 REAL;
    `);
    db.pragma(`user_version = ${SCHEMA_VERSION}`);
    return;
  }

  db.exec(`
    DROP TABLE IF EXISTS products;
    CREATE TABLE products (
      stock_code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      unit TEXT,
      barcode TEXT UNIQUE,
      sale_price_1 REAL,
      sale_price_2 REAL,
      purchase_price_1 REAL,
      purchase_price_2 REAL,
      remaining_qty REAL,
      description_1 TEXT,
      description_2 TEXT,
      group_name TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
  `);
  db.pragma(`user_version = ${SCHEMA_VERSION}`);
}

migrate();

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
  UPDATE products SET barcode = NULL WHERE barcode = '';
`);

const clearBarcodeOwnerStmt = db.prepare(`
  UPDATE products
  SET barcode = NULL, updated_at = datetime('now')
  WHERE barcode IS NOT NULL AND barcode = ? AND stock_code != ?
`);

const upsertStmt = db.prepare(`
  INSERT INTO products (
    stock_code, name, unit, barcode,
    sale_price_1, sale_price_2, purchase_price_1, purchase_price_2,
    remaining_qty, description_1, description_2, group_name, updated_at
  )
  VALUES (
    @stock_code, @name, @unit, @barcode,
    @sale_price_1, @sale_price_2, @purchase_price_1, @purchase_price_2,
    @remaining_qty, @description_1, @description_2, @group_name, datetime('now')
  )
  ON CONFLICT(stock_code) DO UPDATE SET
    name = excluded.name,
    unit = excluded.unit,
    barcode = excluded.barcode,
    sale_price_1 = excluded.sale_price_1,
    sale_price_2 = excluded.sale_price_2,
    purchase_price_1 = excluded.purchase_price_1,
    purchase_price_2 = excluded.purchase_price_2,
    remaining_qty = excluded.remaining_qty,
    description_1 = excluded.description_1,
    description_2 = excluded.description_2,
    group_name = excluded.group_name,
    updated_at = datetime('now')
`);

const selectFields = `
  stock_code, name, unit, barcode,
  sale_price_1, sale_price_2, purchase_price_1, purchase_price_2,
  remaining_qty, description_1, description_2, group_name
`;

const findByBarcodeStmt = db.prepare(`
  SELECT ${selectFields}
  FROM products
  WHERE barcode IS NOT NULL AND barcode = ?
  LIMIT 1
`);

const findByStockCodeStmt = db.prepare(`
  SELECT ${selectFields}
  FROM products
  WHERE stock_code = ?
  LIMIT 1
`);

const findByNameStmt = db.prepare(`
  SELECT ${selectFields}
  FROM products
  WHERE name LIKE ? ESCAPE '\\'
  ORDER BY name
  LIMIT ?
`);

const findByGroupStmt = db.prepare(`
  SELECT ${selectFields}
  FROM products
  WHERE group_name LIKE ? ESCAPE '\\'
  ORDER BY group_name, name
  LIMIT ?
`);

const countStmt = db.prepare(`SELECT COUNT(*) as count FROM products`);

export type SearchBy = "barcode" | "stockCode" | "name" | "group";

function escapeLike(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export function upsertProducts(products: Product[]): number {
  const insertMany = db.transaction((items: Product[]) => {
    for (const p of items) {
      const barcode = p.barcode?.trim() || null;

      if (barcode) {
        clearBarcodeOwnerStmt.run(barcode, p.stockCode);
      }

      upsertStmt.run({
        stock_code: p.stockCode,
        name: p.name,
        unit: p.unit,
        barcode,
        sale_price_1: p.salePrice1,
        sale_price_2: p.salePrice2,
        purchase_price_1: p.purchasePrice1,
        purchase_price_2: p.purchasePrice2,
        remaining_qty: p.remainingQty,
        description_1: p.description1,
        description_2: p.description2,
        group_name: p.group,
      });
    }
    return items.length;
  });
  return insertMany(products);
}

export function searchProducts(by: SearchBy, query: string): ProductRow[] {
  const q = query.trim();
  if (!q) return [];

  switch (by) {
    case "barcode": {
      const row = findByBarcodeStmt.get(q) as ProductRow | undefined;
      return row ? [row] : [];
    }
    case "stockCode": {
      const row = findByStockCodeStmt.get(q) as ProductRow | undefined;
      return row ? [row] : [];
    }
    case "name": {
      const pattern = `%${escapeLike(q)}%`;
      return findByNameStmt.all(pattern, NAME_SEARCH_LIMIT) as ProductRow[];
    }
    case "group": {
      const pattern = `%${escapeLike(q)}%`;
      return findByGroupStmt.all(pattern, NAME_SEARCH_LIMIT) as ProductRow[];
    }
    default:
      return [];
  }
}

/** @deprecated use searchProducts */
export function getProductByCode(code: string): ProductRow | undefined {
  return (
    searchProducts("barcode", code)[0] ??
    searchProducts("stockCode", code)[0]
  );
}

export function getProductCount(): number {
  const row = countStmt.get() as { count: number };
  return row.count;
}

export function clearProducts(): void {
  db.exec("DELETE FROM products");
}

export { db };
