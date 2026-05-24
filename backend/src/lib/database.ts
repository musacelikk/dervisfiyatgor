import { Pool } from "pg";

let pool: Pool | null = null;

function buildConnectionString(): string | null {
  if (process.env.DATABASE_URL?.trim()) {
    return process.env.DATABASE_URL.trim();
  }
  const host = process.env.PGHOST?.trim();
  const user = process.env.PGUSER?.trim();
  const password = process.env.PGPASSWORD;
  const database = process.env.PGDATABASE?.trim();
  const port = process.env.PGPORT?.trim() || "5432";
  if (host && user && password !== undefined && database) {
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`;
  }
  return null;
}

export function isPostgres(): boolean {
  return buildConnectionString() !== null;
}

export function getPool(): Pool {
  if (!pool) {
    throw new Error("PostgreSQL havuzu başlatılmadı. initDatabase() çağrıldı mı?");
  }
  return pool;
}

function needsSsl(connectionString: string): boolean {
  try {
    const url = new URL(connectionString);
    return url.hostname !== "localhost" && url.hostname !== "127.0.0.1";
  } catch {
    return false;
  }
}

async function migratePostgres(): Promise<void> {
  const p = getPool();
  await p.query(`
    CREATE TABLE IF NOT EXISTS products (
      stock_code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      unit TEXT,
      barcode TEXT UNIQUE,
      sale_price_1 DOUBLE PRECISION,
      sale_price_2 DOUBLE PRECISION,
      purchase_price_1 DOUBLE PRECISION,
      purchase_price_2 DOUBLE PRECISION,
      remaining_qty DOUBLE PRECISION,
      description_1 TEXT,
      description_2 TEXT,
      group_name TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

    CREATE TABLE IF NOT EXISTS employees (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      permissions TEXT NOT NULL DEFAULT '["scan"]',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_username_lower
      ON employees (LOWER(username));

    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      phone TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      stock_code TEXT NOT NULL,
      product_name TEXT NOT NULL,
      unit TEXT,
      barcode TEXT,
      quantity DOUBLE PRECISION NOT NULL DEFAULT 1,
      sale_price DOUBLE PRECISION
    );

    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      actor_type TEXT NOT NULL,
      actor_id TEXT,
      actor_name TEXT,
      action TEXT NOT NULL,
      resource_type TEXT,
      resource_id TEXT,
      message TEXT,
      metadata JSONB,
      ip TEXT,
      user_agent TEXT,
      success BOOLEAN NOT NULL DEFAULT TRUE
    );

    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_type, actor_id);

    UPDATE products SET barcode = NULL WHERE barcode = '';

    ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_code_norm TEXT;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS name_norm TEXT;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode_norm TEXT;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS group_name_norm TEXT;
    CREATE INDEX IF NOT EXISTS idx_products_name_norm ON products(name_norm);
    CREATE INDEX IF NOT EXISTS idx_products_stock_code_norm ON products(stock_code_norm);
    CREATE INDEX IF NOT EXISTS idx_products_barcode_norm ON products(barcode_norm);

    CREATE TABLE IF NOT EXISTS stock_count_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      active BOOLEAN NOT NULL DEFAULT FALSE,
      started_at TIMESTAMPTZ
    );
    INSERT INTO stock_count_state (id, active)
    VALUES (1, FALSE)
    ON CONFLICT (id) DO NOTHING;

    CREATE TABLE IF NOT EXISTS stock_count_items (
      stock_code TEXT PRIMARY KEY,
      status TEXT NOT NULL CHECK (status IN ('updated', 'unchanged'))
    );
  `);
}

export async function initDatabase(): Promise<void> {
  const connectionString = buildConnectionString();
  if (connectionString) {
    pool = new Pool({
      connectionString,
      ssl: needsSsl(connectionString) ? { rejectUnauthorized: false } : undefined,
    });
    await pool.query("SELECT 1");
    await migratePostgres();
    console.log("PostgreSQL bağlantısı hazır.");
    return;
  }

  const { initSqliteDatabase } = await import("../services/db-sqlite");
  initSqliteDatabase();
  console.log("SQLite veritabanı hazır.");
}
