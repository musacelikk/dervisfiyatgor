/** Yoklama kuralları: 11:00'a kadar giriş = Tam Gün, sonrası = Yarım Gün,
 *  hiç giriş yoksa = Gelmedi (kayıt tutulmaz, listelemede türetilir). */

export const ATTENDANCE_STATUSES = ["full", "half"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];
/** Listelemede kullanılan, kaydı olmayan personel için türetilen durum. */
export type AttendanceStatusOrAbsent = AttendanceStatus | "absent";

const DEFAULT_HALF_DAY_AFTER = "11:00";
const ISTANBUL_TZ = "Europe/Istanbul";

/** "HH:MM" — env ile değiştirilebilir (ATTENDANCE_HALF_DAY_AFTER). */
export function halfDayCutoff(): { hour: number; minute: number; label: string } {
  const raw = (process.env.ATTENDANCE_HALF_DAY_AFTER ?? DEFAULT_HALF_DAY_AFTER).trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(raw);
  if (!match) {
    return { hour: 11, minute: 0, label: DEFAULT_HALF_DAY_AFTER };
  }
  const hour = Math.min(23, Math.max(0, Number(match[1])));
  const minute = Math.min(59, Math.max(0, Number(match[2])));
  return {
    hour,
    minute,
    label: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
  };
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

/** "YYYY-MM-DD" + "HH:MM" → o günün İstanbul saatiyle UTC Date karşılığı.
 *  Türkiye 2016'dan beri sabit UTC+3 (DST yok). */
export function istanbulDateTimeToUtc(workDate: string, time: string): Date {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) throw new Error("Saat formatı HH:MM olmalı.");
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) throw new Error("Geçersiz saat.");
  const [y, m, d] = workDate.split("-").map(Number);
  if (!y || !m || !d) throw new Error("Tarih formatı YYYY-MM-DD olmalı.");
  return new Date(Date.UTC(y, m - 1, d, hour - 3, minute, 0));
}
