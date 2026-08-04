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

const SHOP_CLOSED_DAYS = "shop_closed_days";

export interface ClosedDay {
  date: string; // YYYY-MM-DD
  note: string | null;
}

/** Dükkanın izinli/kapalı olduğu günler — bu günlerde personel "Gelmedi" sayılmaz. */
export async function getClosedDays(): Promise<ClosedDay[]> {
  const value = await getSetting(SHOP_CLOSED_DAYS);
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (d): d is ClosedDay => Boolean(d) && typeof d === "object" && typeof d.date === "string"
      )
      .map((d) => ({ date: d.date, note: typeof d.note === "string" ? d.note : null }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

async function setClosedDays(days: ClosedDay[]): Promise<void> {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  await setSetting(SHOP_CLOSED_DAYS, JSON.stringify(sorted));
}

export async function addClosedDay(date: string, note: string | null): Promise<ClosedDay[]> {
  const days = await getClosedDays();
  const filtered = days.filter((d) => d.date !== date);
  filtered.push({ date, note: note?.trim() || null });
  await setClosedDays(filtered);
  return getClosedDays();
}

export async function removeClosedDay(date: string): Promise<ClosedDay[]> {
  const days = await getClosedDays();
  const filtered = days.filter((d) => d.date !== date);
  await setClosedDays(filtered);
  return filtered;
}
