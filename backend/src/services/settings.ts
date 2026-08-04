import { getPool, isPostgres } from "../lib/database";
import { db as getSqliteDb } from "./db-sqlite";

async function getSetting(key: string): Promise<string | null> {
  if (isPostgres()) {
    const { rows } = await getPool().query(
      `SELECT value FROM app_settings WHERE key = $1`,
      [key]
    );
    return rows[0] ? String(rows[0].value) : null;
  }
  const row = getSqliteDb()
    .prepare(`SELECT value FROM app_settings WHERE key = ?`)
    .get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

async function setSetting(key: string, value: string): Promise<void> {
  if (isPostgres()) {
    await getPool().query(
      `INSERT INTO app_settings (key, value, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      [key, value]
    );
    return;
  }
  getSqliteDb()
    .prepare(
      `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
    )
    .run(key, value);
}

const CATALOG_SHOW_PRICES = "catalog_show_prices";

/** satis.dervisplastik.com kataloğunda fiyat gösterilsin mi (varsayılan: hayır). */
export async function getCatalogShowPrices(): Promise<boolean> {
  const value = await getSetting(CATALOG_SHOW_PRICES);
  return value === "true";
}

export async function setCatalogShowPrices(show: boolean): Promise<void> {
  await setSetting(CATALOG_SHOW_PRICES, show ? "true" : "false");
}
