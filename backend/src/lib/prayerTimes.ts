/**
 * Diyanet İşleri Başkanlığı'nın Şanlıurfa akşam ezanı vakitleri.
 * Tablolar `scripts/parse-prayer-times.mjs` ile PDF'ten üretilir.
 *
 * Yeni yıl eklerken:
 *   1. node scripts/parse-prayer-times.mjs <yeni-pdf> 2027
 *   2. Aşağıya import + PRAYER_TABLES kaydını ekleyin.
 */
import prayerTimes2026 from "../data/prayer-times-2026.json";

type PrayerTable = Record<string, string>;

const PRAYER_TABLES: Record<number, PrayerTable> = {
  2026: prayerTimes2026 as PrayerTable,
};

export function hasPrayerTable(year: number): boolean {
  return year in PRAYER_TABLES;
}

export function availablePrayerYears(): number[] {
  return Object.keys(PRAYER_TABLES)
    .map(Number)
    .sort((a, b) => a - b);
}

/** "YYYY-MM-DD" → "HH:MM" (İstanbul saati) veya tablo yoksa null. */
export function maghribTimeFor(workDate: string): string | null {
  const year = Number(workDate.slice(0, 4));
  const table = PRAYER_TABLES[year];
  return table?.[workDate] ?? null;
}
