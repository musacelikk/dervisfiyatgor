import { getPool, isPostgres } from "../lib/database";
import { db as getSqliteDb } from "./db-sqlite";
import { formatHourMinute, parseHourMinute } from "../lib/attendance";

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

/** Tek seferlik veri taşımaları için bayrak (migration tekrar çalışmasın). */
export async function isFlagSet(key: string): Promise<boolean> {
  return (await getSetting(`flag_${key}`)) === "true";
}

export async function setFlag(key: string): Promise<void> {
  await setSetting(`flag_${key}`, "true");
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

/* ————————————————— İzinli / kapalı günler ————————————————— */

const SHOP_CLOSED_DAYS = "shop_closed_days";

/** "full" — tam gün kapalı, "half" — yarım gün izin. */
export type ClosedDayType = "full" | "half";

export interface ClosedDay {
  date: string; // YYYY-MM-DD
  note: string | null;
  type: ClosedDayType;
}

function normalizeClosedDayType(value: unknown): ClosedDayType {
  return value === "half" ? "half" : "full";
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
      .map((d) => ({
        date: d.date,
        note: typeof d.note === "string" ? d.note : null,
        type: normalizeClosedDayType(d.type),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

async function setClosedDays(days: ClosedDay[]): Promise<void> {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  await setSetting(SHOP_CLOSED_DAYS, JSON.stringify(sorted));
}

export async function addClosedDay(
  date: string,
  note: string | null,
  type: ClosedDayType = "full"
): Promise<ClosedDay[]> {
  const days = await getClosedDays();
  const filtered = days.filter((d) => d.date !== date);
  filtered.push({ date, note: note?.trim() || null, type: normalizeClosedDayType(type) });
  await setClosedDays(filtered);
  return getClosedDays();
}

export async function removeClosedDay(date: string): Promise<ClosedDay[]> {
  const days = await getClosedDays();
  const filtered = days.filter((d) => d.date !== date);
  await setClosedDays(filtered);
  return filtered;
}

/* ————————————————— Yoklama ayarları (vardiya / haftalık izin) ————————————————— */

const ATTENDANCE_SETTINGS = "attendance_settings";

export interface AttendanceSettings {
  /** 1. vardiya geç giriş sınırı "HH:MM" — bu saat dahil zamanında sayılır. */
  shift1LateAfter: string;
  /** 2. vardiya geç giriş sınırı "HH:MM". */
  shift2LateAfter: string;
  /** Otomatik izinli haftanın günleri (0 = Pazar … 6 = Cumartesi). */
  weeklyOffDays: number[];
}

export const DEFAULT_ATTENDANCE_SETTINGS: AttendanceSettings = {
  shift1LateAfter: "08:30",
  shift2LateAfter: "17:00",
  weeklyOffDays: [0], // Pazar — her ay elle işaretlemeye gerek kalmasın
};

function normalizeTime(value: unknown, fallback: string): string {
  const parsed = parseHourMinute(value);
  return parsed ? formatHourMinute(parsed.hour, parsed.minute) : fallback;
}

function normalizeWeeklyOffDays(value: unknown, fallback: number[]): number[] {
  if (!Array.isArray(value)) return [...fallback];
  const out = new Set<number>();
  for (const item of value) {
    const n = Number(item);
    if (Number.isInteger(n) && n >= 0 && n <= 6) out.add(n);
  }
  return [...out].sort((a, b) => a - b);
}

export async function getAttendanceSettings(): Promise<AttendanceSettings> {
  const raw = await getSetting(ATTENDANCE_SETTINGS);
  if (!raw) return { ...DEFAULT_ATTENDANCE_SETTINGS, weeklyOffDays: [...DEFAULT_ATTENDANCE_SETTINGS.weeklyOffDays] };
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      shift1LateAfter: normalizeTime(
        parsed.shift1LateAfter,
        DEFAULT_ATTENDANCE_SETTINGS.shift1LateAfter
      ),
      shift2LateAfter: normalizeTime(
        parsed.shift2LateAfter,
        DEFAULT_ATTENDANCE_SETTINGS.shift2LateAfter
      ),
      weeklyOffDays: normalizeWeeklyOffDays(
        parsed.weeklyOffDays,
        DEFAULT_ATTENDANCE_SETTINGS.weeklyOffDays
      ),
    };
  } catch {
    return { ...DEFAULT_ATTENDANCE_SETTINGS, weeklyOffDays: [...DEFAULT_ATTENDANCE_SETTINGS.weeklyOffDays] };
  }
}

export async function updateAttendanceSettings(
  updates: Partial<AttendanceSettings>
): Promise<AttendanceSettings> {
  const current = await getAttendanceSettings();
  const next: AttendanceSettings = {
    shift1LateAfter:
      updates.shift1LateAfter !== undefined
        ? normalizeTime(updates.shift1LateAfter, current.shift1LateAfter)
        : current.shift1LateAfter,
    shift2LateAfter:
      updates.shift2LateAfter !== undefined
        ? normalizeTime(updates.shift2LateAfter, current.shift2LateAfter)
        : current.shift2LateAfter,
    weeklyOffDays:
      updates.weeklyOffDays !== undefined
        ? normalizeWeeklyOffDays(updates.weeklyOffDays, current.weeklyOffDays)
        : current.weeklyOffDays,
  };
  await setSetting(ATTENDANCE_SETTINGS, JSON.stringify(next));
  return next;
}
