import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import type { Product, ProductRow } from "../types/product";
import { buildSearchLikePattern, normalizeSearchText, productNormValues } from "../lib/searchNormalize";

/** Vercel serverless: yalnızca /tmp yazılabilir; yerelde backend/data kullanılır. */
function resolveDataDir(): string {
  if (process.env.VERCEL) {
    return path.join("/tmp", "aknsoftfiyatgor-data");
  }
  return path.join(__dirname, "../../data");
}

let sqliteDb: Database.Database | null = null;

const SCHEMA_VERSION = 12;
const NAME_SEARCH_LIMIT = 30;

function tableColumns(database: Database.Database, table: string): Set<string> {
  const rows = database.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return new Set(rows.map((r) => r.name));
}

function addColumnIfMissing(
  database: Database.Database,
  table: string,
  column: string,
  definition: string
): void {
  if (!tableColumns(database, table).has(column)) {
    database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

/** fromVersion → fromVersion+1 adımı. Eski tablolara dokunan adımlar,
 *  tablo/kolon zaten yoksa initSqliteDatabase'in ana bloğuna bırakır. */
function applyMigrationStep(database: Database.Database, fromVersion: number): void {
  switch (fromVersion) {
    case 4:
      addColumnIfMissing(database, "products", "purchase_price_1", "REAL");
      addColumnIfMissing(database, "products", "purchase_price_2", "REAL");
      return;
    case 5:
      database.exec(`
        CREATE TABLE IF NOT EXISTS employees (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          username TEXT NOT NULL COLLATE NOCASE,
          password_hash TEXT NOT NULL,
          active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_username ON employees(username);
      `);
      return;
    case 6:
      addColumnIfMissing(
        database,
        "employees",
        "permissions",
        `TEXT NOT NULL DEFAULT '["scan"]'`
      );
      return;
    case 7:
      database.exec(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          actor_type TEXT NOT NULL,
          actor_id TEXT,
          actor_name TEXT,
          action TEXT NOT NULL,
          resource_type TEXT,
          resource_id TEXT,
          message TEXT,
          metadata TEXT,
          ip TEXT,
          user_agent TEXT,
          success INTEGER NOT NULL DEFAULT 1
        );
        CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_type, actor_id);
      `);
      return;
    case 8:
      addColumnIfMissing(database, "products", "stock_code_norm", "TEXT");
      addColumnIfMissing(database, "products", "name_norm", "TEXT");
      addColumnIfMissing(database, "products", "barcode_norm", "TEXT");
      addColumnIfMissing(database, "products", "group_name_norm", "TEXT");
      database.exec(`
        CREATE INDEX IF NOT EXISTS idx_products_name_norm ON products(name_norm);
        CREATE INDEX IF NOT EXISTS idx_products_stock_code_norm ON products(stock_code_norm);
        CREATE INDEX IF NOT EXISTS idx_products_barcode_norm ON products(barcode_norm);
      `);
      return;
    case 9:
      database.exec(`
        CREATE TABLE IF NOT EXISTS stock_count_state (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          active INTEGER NOT NULL DEFAULT 0,
          started_at TEXT
        );
        INSERT OR IGNORE INTO stock_count_state (id, active) VALUES (1, 0);
        CREATE TABLE IF NOT EXISTS stock_count_items (
          stock_code TEXT PRIMARY KEY,
          status TEXT NOT NULL CHECK (status IN ('updated', 'unchanged'))
        );
      `);
      return;
    case 10: {
      const orderCols = tableColumns(database, "orders");
      if (orderCols.size > 0) {
        if (!orderCols.has("order_code")) {
          database.exec(`ALTER TABLE orders ADD COLUMN order_code TEXT`);
        }
        database.exec(
          `CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_code ON orders(order_code)`
        );
      }
      return;
    }
    case 11:
      database.exec(`
        CREATE TABLE IF NOT EXISTS product_images (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          stock_code TEXT NOT NULL,
          object_key TEXT NOT NULL UNIQUE,
          url TEXT NOT NULL,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (stock_code) REFERENCES products(stock_code) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_product_images_stock_code
          ON product_images(stock_code, sort_order, id);
      `);
      return;
    default:
      return;
  }
}

function migrate(database: Database.Database): void {
  const startVersion = database.pragma("user_version", { simple: true }) as number;

  if (startVersion >= SCHEMA_VERSION) return;

  if (startVersion >= 4) {
    for (let v = startVersion; v < SCHEMA_VERSION; v++) {
      applyMigrationStep(database, v);
      database.pragma(`user_version = ${v + 1}`);
    }
    return;
  }

  // v4 öncesi (ve sıfırdan kurulum): products güncel şemayla yeniden kurulur;
  // kalan tabloları initSqliteDatabase'in ana bloğu güncel halleriyle oluşturur.
  database.exec(`
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
      stock_code_norm TEXT,
      name_norm TEXT,
      barcode_norm TEXT,
      group_name_norm TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
    CREATE INDEX IF NOT EXISTS idx_products_name_norm ON products(name_norm);
    CREATE INDEX IF NOT EXISTS idx_products_stock_code_norm ON products(stock_code_norm);
    CREATE INDEX IF NOT EXISTS idx_products_barcode_norm ON products(barcode_norm);
  `);
  database.pragma(`user_version = ${SCHEMA_VERSION}`);
}

export function initSqliteDatabase(): void {
  if (sqliteDb) return;

  const dataDir = resolveDataDir();
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, "products.db");
  sqliteDb = new Database(dbPath);

  migrate(sqliteDb);

  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      permissions TEXT NOT NULL DEFAULT '["scan"]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_username ON employees(username);
  `);

  const employeeCols = sqliteDb.prepare(`PRAGMA table_info(employees)`).all() as { name: string }[];
  if (!employeeCols.some((c) => c.name === "permissions")) {
    sqliteDb.exec(
      `ALTER TABLE employees ADD COLUMN permissions TEXT NOT NULL DEFAULT '["scan"]'`
    );
  }

  sqliteDb.exec(`
    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
    UPDATE products SET barcode = NULL WHERE barcode = '';
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_code TEXT UNIQUE,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      phone TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      stock_code TEXT NOT NULL,
      product_name TEXT NOT NULL,
      unit TEXT,
      barcode TEXT,
      quantity REAL NOT NULL DEFAULT 1,
      sale_price REAL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      actor_type TEXT NOT NULL,
      actor_id TEXT,
      actor_name TEXT,
      action TEXT NOT NULL,
      resource_type TEXT,
      resource_id TEXT,
      message TEXT,
      metadata TEXT,
      ip TEXT,
      user_agent TEXT,
      success INTEGER NOT NULL DEFAULT 1
    );
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_type, actor_id);
    CREATE INDEX IF NOT EXISTS idx_products_name_norm ON products(name_norm);
    CREATE INDEX IF NOT EXISTS idx_products_stock_code_norm ON products(stock_code_norm);
    CREATE INDEX IF NOT EXISTS idx_products_barcode_norm ON products(barcode_norm);
    CREATE TABLE IF NOT EXISTS expense_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT,
      icon TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS expense_people (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT,
      icon TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT,
      amount REAL,
      category_id INTEGER REFERENCES expense_categories(id) ON DELETE SET NULL,
      person_id INTEGER REFERENCES expense_people(id) ON DELETE SET NULL,
      paid_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at DESC);
    CREATE TABLE IF NOT EXISTS product_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stock_code TEXT NOT NULL,
      object_key TEXT NOT NULL UNIQUE,
      url TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (stock_code) REFERENCES products(stock_code) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_product_images_stock_code
      ON product_images(stock_code, sort_order, id);
  `);
}

function getDb(): Database.Database {
  if (!sqliteDb) initSqliteDatabase();
  return sqliteDb!;
}

const selectFields = `
  stock_code, name, unit, barcode,
  sale_price_1, sale_price_2, purchase_price_1, purchase_price_2,
  remaining_qty, description_1, description_2, group_name
`;

export type SearchBy = "barcode" | "stockCode" | "name" | "group";

export function upsertProducts(products: Product[]): number {
  const db = getDb();

  const clearBarcodeOwnerStmt = db.prepare(`
    UPDATE products
    SET barcode = NULL, updated_at = datetime('now')
    WHERE barcode IS NOT NULL AND barcode = ? AND stock_code != ?
  `);

  const upsertStmt = db.prepare(`
    INSERT INTO products (
      stock_code, name, unit, barcode,
      sale_price_1, sale_price_2, purchase_price_1, purchase_price_2,
      remaining_qty, description_1, description_2, group_name,
      stock_code_norm, name_norm, barcode_norm, group_name_norm,
      updated_at
    )
    VALUES (
      @stock_code, @name, @unit, @barcode,
      @sale_price_1, @sale_price_2, @purchase_price_1, @purchase_price_2,
      @remaining_qty, @description_1, @description_2, @group_name,
      @stock_code_norm, @name_norm, @barcode_norm, @group_name_norm,
      datetime('now')
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
      stock_code_norm = excluded.stock_code_norm,
      name_norm = excluded.name_norm,
      barcode_norm = excluded.barcode_norm,
      group_name_norm = excluded.group_name_norm,
      updated_at = datetime('now')
  `);

  const insertMany = db.transaction((items: Product[]) => {
    for (const p of items) {
      const barcode = p.barcode?.trim() || null;
      const norms = productNormValues({
        stockCode: p.stockCode,
        name: p.name,
        barcode,
        group: p.group,
      });
      if (barcode) clearBarcodeOwnerStmt.run(barcode, p.stockCode);
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
        stock_code_norm: norms.stockCodeNorm,
        name_norm: norms.nameNorm,
        barcode_norm: norms.barcodeNorm,
        group_name_norm: norms.groupNameNorm,
      });
    }
    return items.length;
  });

  return insertMany(products);
}

export function searchProducts(by: SearchBy, query: string): ProductRow[] {
  const db = getDb();
  const q = query.trim();
  if (!q) return [];
  const normQ = normalizeSearchText(q);

  switch (by) {
    case "barcode": {
      const row = db
        .prepare(
          `SELECT ${selectFields} FROM products WHERE barcode_norm IS NOT NULL AND barcode_norm = ? LIMIT 1`
        )
        .get(normQ) as ProductRow | undefined;
      return row ? [row] : [];
    }
    case "stockCode": {
      const row = db
        .prepare(`SELECT ${selectFields} FROM products WHERE stock_code_norm = ? LIMIT 1`)
        .get(normQ) as ProductRow | undefined;
      return row ? [row] : [];
    }
    case "name": {
      const pattern = buildSearchLikePattern(q);
      return db
        .prepare(
          `SELECT ${selectFields} FROM products WHERE name_norm LIKE ? ESCAPE '\\' ORDER BY name LIMIT ?`
        )
        .all(pattern, NAME_SEARCH_LIMIT) as ProductRow[];
    }
    case "group": {
      const pattern = buildSearchLikePattern(q);
      return db
        .prepare(
          `SELECT ${selectFields} FROM products WHERE group_name_norm LIKE ? ESCAPE '\\' ORDER BY group_name, name LIMIT ?`
        )
        .all(pattern, NAME_SEARCH_LIMIT) as ProductRow[];
    }
    default:
      return [];
  }
}

export function getProductByCode(code: string): ProductRow | undefined {
  return searchProducts("barcode", code)[0] ?? searchProducts("stockCode", code)[0];
}

export function getProductCount(): number {
  const row = getDb().prepare(`SELECT COUNT(*) as count FROM products`).get() as { count: number };
  return row.count;
}

export function listAllProducts(): ProductRow[] {
  return getDb()
    .prepare(`SELECT ${selectFields} FROM products ORDER BY name COLLATE NOCASE`)
    .all() as ProductRow[];
}

export function getProductByStockCode(stockCode: string): ProductRow | undefined {
  const normCode = normalizeSearchText(stockCode);
  return getDb()
    .prepare(`SELECT ${selectFields} FROM products WHERE stock_code_norm = ? LIMIT 1`)
    .get(normCode) as ProductRow | undefined;
}

export function listProductsPaged(options: {
  q?: string;
  page: number;
  limit: number | "all";
}): { rows: ProductRow[]; total: number } {
  const db = getDb();
  const page = Math.max(1, options.page);
  const unlimited = options.limit === "all";
  const limitNum =
    typeof options.limit === "number"
      ? Math.min(100_000, Math.max(1, options.limit))
      : 25;
  const limit = unlimited ? getProductCount() || 1 : limitNum;
  const offset = unlimited ? 0 : (page - 1) * limit;
  const q = options.q?.trim() ?? "";

  if (!q) {
    const total = getProductCount();
    const rows = unlimited
      ? (db
          .prepare(`SELECT ${selectFields} FROM products ORDER BY name COLLATE NOCASE`)
          .all() as ProductRow[])
      : (db
          .prepare(
            `SELECT ${selectFields} FROM products ORDER BY name COLLATE NOCASE LIMIT ? OFFSET ?`
          )
          .all(limit, offset) as ProductRow[]);
    return { rows, total };
  }

  const pattern = buildSearchLikePattern(q);
  const where = `
    name_norm LIKE ? ESCAPE '\\'
    OR stock_code_norm LIKE ? ESCAPE '\\'
    OR barcode_norm LIKE ? ESCAPE '\\'
    OR group_name_norm LIKE ? ESCAPE '\\'
  `;
  const countRow = db
    .prepare(`SELECT COUNT(*) as count FROM products WHERE ${where}`)
    .get(pattern, pattern, pattern, pattern) as { count: number };
  const rows = unlimited
    ? (db
        .prepare(
          `SELECT ${selectFields} FROM products WHERE ${where} ORDER BY name COLLATE NOCASE`
        )
        .all(pattern, pattern, pattern, pattern) as ProductRow[])
    : (db
        .prepare(
          `SELECT ${selectFields} FROM products WHERE ${where} ORDER BY name COLLATE NOCASE LIMIT ? OFFSET ?`
        )
        .all(pattern, pattern, pattern, pattern, limit, offset) as ProductRow[]);

  return { rows, total: countRow.count };
}

export function createProduct(product: Product): void {
  const code = product.stockCode.trim();
  if (!code) throw new Error("Stok kodu gerekli.");
  if (!product.name?.trim()) throw new Error("Ürün adı gerekli.");

  if (getProductByStockCode(code)) {
    throw new Error("Bu stok kodu zaten kayıtlı.");
  }

  if (product.barcode?.trim()) {
    const other = getDb()
      .prepare(`SELECT ${selectFields} FROM products WHERE barcode = ? LIMIT 1`)
      .get(product.barcode.trim()) as ProductRow | undefined;
    if (other) throw new Error("Bu barkod başka bir üründe kullanılıyor.");
  }

  upsertProducts([{ ...product, stockCode: code, name: product.name.trim() }]);
}

export function updateProduct(stockCode: string, updates: Partial<Product>): Product {
  const row = getProductByStockCode(stockCode);
  if (!row) throw new Error("Ürün bulunamadı.");

  const current: Product = {
    stockCode: row.stock_code,
    name: row.name,
    unit: row.unit,
    barcode: row.barcode,
    salePrice1: row.sale_price_1,
    salePrice2: row.sale_price_2,
    purchasePrice1: row.purchase_price_1,
    purchasePrice2: row.purchase_price_2,
    remainingQty: row.remaining_qty,
    description1: row.description_1,
    description2: row.description_2,
    group: row.group_name,
  };

  const merged: Product = {
    ...current,
    ...updates,
    stockCode: current.stockCode,
    name: updates.name !== undefined ? updates.name.trim() : current.name,
  };

  if (!merged.name) throw new Error("Ürün adı gerekli.");

  if (merged.barcode?.trim()) {
    const other = getDb()
      .prepare(`SELECT ${selectFields} FROM products WHERE barcode = ? LIMIT 1`)
      .get(merged.barcode.trim()) as ProductRow | undefined;
    if (other && other.stock_code !== merged.stockCode) {
      throw new Error("Bu barkod başka bir üründe kullanılıyor.");
    }
  }

  upsertProducts([merged]);
  const updated = getProductByStockCode(merged.stockCode);
  if (!updated) throw new Error("Güncelleme başarısız.");
  return {
    stockCode: updated.stock_code,
    name: updated.name,
    unit: updated.unit,
    barcode: updated.barcode,
    salePrice1: updated.sale_price_1,
    salePrice2: updated.sale_price_2,
    purchasePrice1: updated.purchase_price_1,
    purchasePrice2: updated.purchase_price_2,
    remainingQty: updated.remaining_qty,
    description1: updated.description_1,
    description2: updated.description_2,
    group: updated.group_name,
  };
}

export function deleteProduct(stockCode: string): void {
  const result = getDb().prepare(`DELETE FROM products WHERE stock_code = ?`).run(stockCode.trim());
  if (result.changes === 0) throw new Error("Ürün bulunamadı.");
}

export function clearProducts(): void {
  getDb().exec("DELETE FROM products");
}

export { getDb as db };
