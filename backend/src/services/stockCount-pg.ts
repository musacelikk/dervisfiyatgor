import { getPool } from "../lib/database";
import type { StockCountItemStatus, StockCountState } from "../types/stockCount";

async function ensureTables(): Promise<void> {
  await getPool().query(`
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

export async function isStockCountActive(): Promise<boolean> {
  await ensureTables();
  const { rows } = await getPool().query(
    `SELECT active FROM stock_count_state WHERE id = 1`
  );
  return Boolean(rows[0]?.active);
}

export async function getStockCountState(): Promise<StockCountState> {
  await ensureTables();
  const { rows } = await getPool().query(
    `SELECT active, started_at FROM stock_count_state WHERE id = 1`
  );
  const row = rows[0] as { active: boolean; started_at: string | null } | undefined;
  return {
    active: Boolean(row?.active),
    startedAt: row?.started_at ?? null,
  };
}

export async function startStockCount(): Promise<StockCountState> {
  await ensureTables();
  const startedAt = new Date().toISOString();
  const pool = getPool();
  await pool.query(`DELETE FROM stock_count_items`);
  await pool.query(
    `UPDATE stock_count_state SET active = TRUE, started_at = $1 WHERE id = 1`,
    [startedAt]
  );
  return { active: true, startedAt };
}

export async function stopStockCount(): Promise<StockCountState> {
  await ensureTables();
  const pool = getPool();
  await pool.query(`DELETE FROM stock_count_items`);
  await pool.query(
    `UPDATE stock_count_state SET active = FALSE, started_at = NULL WHERE id = 1`
  );
  return { active: false, startedAt: null };
}

export async function recordStockCountItem(
  stockCode: string,
  status: StockCountItemStatus
): Promise<void> {
  if (!(await isStockCountActive())) return;
  await ensureTables();
  await getPool().query(
    `INSERT INTO stock_count_items (stock_code, status)
     VALUES ($1, $2)
     ON CONFLICT (stock_code) DO UPDATE SET status = EXCLUDED.status`,
    [stockCode.trim(), status]
  );
}

export async function getStockCountStatuses(
  stockCodes: string[]
): Promise<Record<string, StockCountItemStatus>> {
  if (stockCodes.length === 0) return {};
  await ensureTables();
  const unique = [...new Set(stockCodes.map((c) => c.trim()).filter(Boolean))];
  const { rows } = await getPool().query(
    `SELECT stock_code, status FROM stock_count_items WHERE stock_code = ANY($1::text[])`,
    [unique]
  );

  const map: Record<string, StockCountItemStatus> = {};
  for (const row of rows as { stock_code: string; status: StockCountItemStatus }[]) {
    map[row.stock_code] = row.status;
  }
  return map;
}
