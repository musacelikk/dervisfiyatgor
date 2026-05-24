import type { StockCountItemStatus, StockCountState } from "../types/stockCount";
import { db as getDb } from "./db-sqlite";

function ensureTables(): void {
  getDb().exec(`
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
}

export function isStockCountActive(): boolean {
  ensureTables();
  const row = getDb()
    .prepare(`SELECT active FROM stock_count_state WHERE id = 1`)
    .get() as { active: number } | undefined;
  return Boolean(row?.active);
}

export function getStockCountState(): StockCountState {
  ensureTables();
  const row = getDb()
    .prepare(`SELECT active, started_at FROM stock_count_state WHERE id = 1`)
    .get() as { active: number; started_at: string | null } | undefined;

  return {
    active: Boolean(row?.active),
    startedAt: row?.started_at ?? null,
  };
}

export function startStockCount(): StockCountState {
  ensureTables();
  const db = getDb();
  const startedAt = new Date().toISOString();
  db.prepare(`DELETE FROM stock_count_items`).run();
  db.prepare(
    `UPDATE stock_count_state SET active = 1, started_at = ? WHERE id = 1`
  ).run(startedAt);
  return { active: true, startedAt };
}

export function stopStockCount(): StockCountState {
  ensureTables();
  const db = getDb();
  db.prepare(`DELETE FROM stock_count_items`).run();
  db.prepare(
    `UPDATE stock_count_state SET active = 0, started_at = NULL WHERE id = 1`
  ).run();
  return { active: false, startedAt: null };
}

export function recordStockCountItem(
  stockCode: string,
  status: StockCountItemStatus
): void {
  if (!isStockCountActive()) return;
  ensureTables();
  getDb()
    .prepare(
      `INSERT INTO stock_count_items (stock_code, status)
       VALUES (?, ?)
       ON CONFLICT(stock_code) DO UPDATE SET status = excluded.status`
    )
    .run(stockCode.trim(), status);
}

export function getStockCountStatuses(
  stockCodes: string[]
): Record<string, StockCountItemStatus> {
  if (stockCodes.length === 0) return {};
  ensureTables();
  const unique = [...new Set(stockCodes.map((c) => c.trim()).filter(Boolean))];
  const placeholders = unique.map(() => "?").join(", ");
  const rows = getDb()
    .prepare(
      `SELECT stock_code, status FROM stock_count_items WHERE stock_code IN (${placeholders})`
    )
    .all(...unique) as { stock_code: string; status: StockCountItemStatus }[];

  const map: Record<string, StockCountItemStatus> = {};
  for (const row of rows) {
    map[row.stock_code] = row.status;
  }
  return map;
}
