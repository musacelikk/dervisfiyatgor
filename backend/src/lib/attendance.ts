/** Yoklama kuralları: 11:00'a kadar giriş = Tam Gün, sonrası = Yarım Gün,
 *  hiç giriş yoksa = Gelmedi (kayıt tutulmaz, listelemede türetilir).
 *
 *  Geç giriş ayrı bir boyuttur: personelin vardiyası (1. / 2.) ve Ayarlar'dan
 *  belirlenen vardiya sınır saati karşılaştırılarak hesaplanır. Sınır saatin
 *  kendisi hâlâ "zamanında"dır; sınırı geçen ilk dakika geç giriştir. */

export const ATTENDANCE_STATUSES = ["full", "half"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];
/** Listelemede kullanılan, kaydı olmayan personel için türetilen durum.
 *  "off" — dükkanın izinli/kapalı olduğu bir gün, kaydı olmayan personel devamsız sayılmaz. */
export type AttendanceStatusOrAbsent = AttendanceStatus | "absent" | "off";

/** Takvim/rozet renklendirmesi için gün durumu. */
export const ATTENDANCE_DAY_STATUSES = ["onTime", "late", "absent", "off", "future"] as const;
export type AttendanceDayStatus = (typeof ATTENDANCE_DAY_STATUSES)[number];

/** Personelin bağlı olduğu vardiya. */
export const EMPLOYEE_SHIFTS = ["1", "2"] as const;
export type EmployeeShift = (typeof EMPLOYEE_SHIFTS)[number];
export const DEFAULT_EMPLOYEE_SHIFT: EmployeeShift = "1";

const DEFAULT_HALF_DAY_AFTER = "11:00";
const ISTANBUL_TZ = "Europe/Istanbul";

/** "HH:MM" — env ile değiştirilebilir (ATTENDANCE_HALF_DAY_AFTER). */
export function halfDayCutoff(): { hour: number; minute: number; label: string } {
  const raw = (process.env.ATTENDANCE_HALF_DAY_AFTER ?? DEFAULT_HALF_DAY_AFTER).trim();
  const parsed = parseHourMinute(raw);
  if (!parsed) {
    return { hour: 11, minute: 0, label: DEFAULT_HALF_DAY_AFTER };
  }
  return { ...parsed, label: formatHourMinute(parsed.hour, parsed.minute) };
}

/** "HH:MM" → {hour, minute}; geçersizse null. */
export function parseHourMinute(value: unknown): { hour: number; minute: number } | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

export function formatHourMinute(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** "HH:MM" → gün başından itibaren dakika; geçersizse null. */
export function hourMinuteToMinutes(value: unknown): number | null {
  const parsed = parseHourMinute(value);
  return parsed ? parsed.hour * 60 + parsed.minute : null;
}

/** Verilen anın İstanbul saatiyle saat/dakikası. */
export function istanbulHourMinute(date: Date): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ISTANBUL_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return { hour, minute };
}

export function statusForCheckIn(checkInAt: Date): AttendanceStatus {
  const cutoff = halfDayCutoff();
  const { hour, minute } = istanbulHourMinute(checkInAt);
  const minutes = hour * 60 + minute;
  const cutoffMinutes = cutoff.hour * 60 + cutoff.minute;
  return minutes <= cutoffMinutes ? "full" : "half";
}

export function isAttendanceStatus(value: unknown): value is AttendanceStatus {
  return typeof value === "string" && (ATTENDANCE_STATUSES as readonly string[]).includes(value);
}

export function isEmployeeShift(value: unknown): value is EmployeeShift {
  return typeof value === "string" && (EMPLOYEE_SHIFTS as readonly string[]).includes(value);
}

export function normalizeShift(value: unknown): EmployeeShift {
  return isEmployeeShift(value) ? value : DEFAULT_EMPLOYEE_SHIFT;
}

/** Geç giriş hesabı — sınır saatin kendisi zamanında sayılır (08:30 sınırında 08:30 → zamanında,
 *  08:31 → 1 dk geç). */
export function lateness(
  checkInAt: Date,
  limit: string
): { isLate: boolean; lateMinutes: number } {
  const limitMinutes = hourMinuteToMinutes(limit);
  if (limitMinutes === null) return { isLate: false, lateMinutes: 0 };
  const { hour, minute } = istanbulHourMinute(checkInAt);
  const diff = hour * 60 + minute - limitMinutes;
  return diff > 0 ? { isLate: true, lateMinutes: diff } : { isLate: false, lateMinutes: 0 };
}

/** "YYYY-MM-DD" → haftanın günü (0 = Pazar … 6 = Cumartesi). */
export function weekdayOf(workDate: string): number {
  const [y, m, d] = workDate.split("-").map(Number);
  if (!y || !m || !d) return -1;
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** "YYYY-MM-DD" + "HH:MM" → o günün İstanbul saatiyle UTC Date karşılığı.
 *  Türkiye 2016'dan beri sabit UTC+3 (DST yok). */
export function istanbulDateTimeToUtc(workDate: string, time: string): Date {
  const parsed = parseHourMinute(time);
  if (!parsed) throw new Error("Saat formatı HH:MM olmalı.");
  const [y, m, d] = workDate.split("-").map(Number);
  if (!y || !m || !d) throw new Error("Tarih formatı YYYY-MM-DD olmalı.");
  return new Date(Date.UTC(y, m - 1, d, parsed.hour - 3, parsed.minute, 0));
}
