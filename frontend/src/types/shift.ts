export type ShiftHonorific = "Bey" | "Hanım" | null;

/** 11:00'a kadar giriş = full (Tam Gün), sonrası = half (Yarım Gün) */
export type AttendanceStatus = "full" | "half";
/** "off" — dükkanın izinli/kapalı olduğu bir gün, kaydı olmayan personel devamsız sayılmaz. */
export type AttendanceStatusOrAbsent = AttendanceStatus | "absent" | "off";

/** Takvim renklendirmesi: yeşil / sarı / kırmızı / izinli / gri. */
export type AttendanceDayStatus = "onTime" | "late" | "absent" | "off" | "future";

/** Personelin bağlı olduğu vardiya — geç giriş sınırı buna göre seçilir. */
export type EmployeeShift = "1" | "2";

export const SHIFT_LABELS: Record<EmployeeShift, string> = {
  "1": "1. Vardiya",
  "2": "2. Vardiya",
};

export type ShiftEmployee = {
  id: number;
  name: string;
  honorific: ShiftHonorific;
};

export type ShiftEntry = {
  id: number;
  employeeId: number;
  employeeName?: string;
  workDate: string;
  checkInAt: string;
  checkOutAt: string | null;
  lat: number | null;
  lng: number | null;
  distanceM: number | null;
  status: AttendanceStatus;
  note: string | null;
  createdBy: string | null;
};

/** Bir günün neden izinli sayıldığı. */
export type AttendanceOffInfo = {
  type: "full" | "half";
  note: string | null;
  source: "weekly" | "manual";
};

export type AttendanceRow = {
  employeeId: number;
  employeeName: string;
  workDate: string;
  status: AttendanceStatusOrAbsent;
  entry: ShiftEntry | null;
  shift: EmployeeShift;
  expectedStart: string;
  isLate: boolean;
  lateMinutes: number;
  dayStatus: AttendanceDayStatus;
  off: AttendanceOffInfo | null;
  /** Elle girilen mazeret (örn. "hasta oldu"). Rapor sayılarını etkilemez. */
  excuse: string | null;
};

export type AttendanceSummary = {
  workDate: string;
  totalEmployees: number;
  present: number;
  absent: number;
  full: number;
  half: number;
  off: number;
  late: number;
  deniedAttempts: number;
};

export type AttendanceReportEmployee = {
  employeeId: number;
  employeeName: string;
  shift: EmployeeShift;
  full: number;
  half: number;
  absent: number;
  off: number;
  late: number;
  lateMinutes: number;
};

export type AttendanceReport = {
  from: string;
  to: string;
  full: number;
  half: number;
  absent: number;
  off: number;
  late: number;
  lateMinutes: number;
  perEmployee: AttendanceReportEmployee[];
};

/** Vardiya geç giriş sınırları ve otomatik haftalık izin günleri. */
export type AttendanceSettings = {
  shift1LateAfter: string;
  shift2LateAfter: string;
  /** 0 = Pazar … 6 = Cumartesi */
  weeklyOffDays: number[];
};

export type AttendanceListResult = {
  rows: AttendanceRow[];
  from: string;
  to: string;
  cutoff: string;
  attendanceSettings: AttendanceSettings;
};

/** Personel takviminde tek bir gün. */
export type AttendanceDay = {
  date: string;
  weekday: number;
  dayStatus: AttendanceDayStatus;
  status: AttendanceStatus | null;
  shift: EmployeeShift;
  expectedStart: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  isLate: boolean;
  lateMinutes: number;
  note: string | null;
  entryId: number | null;
  off: AttendanceOffInfo | null;
  /** Elle girilen mazeret (örn. "hasta oldu"). Rapor sayılarını etkilemez. */
  excuse: string | null;
};

export type AttendanceEmployeeSummary = {
  workDays: number;
  present: number;
  absent: number;
  lateCount: number;
  lateMinutes: number;
  offDays: number;
  fullDays: number;
  halfDays: number;
};

export type AttendanceEmployeeDetail = {
  employeeId: number;
  employeeName: string;
  shift: EmployeeShift;
  expectedStart: string;
  from: string;
  to: string;
  days: AttendanceDay[];
  summary: AttendanceEmployeeSummary;
};

export const ATTENDANCE_LABELS: Record<AttendanceStatusOrAbsent, string> = {
  full: "Tam Gün",
  half: "Yarım Gün",
  absent: "Gelmedi",
  off: "İzinli",
};

export const DAY_STATUS_LABELS: Record<AttendanceDayStatus, string> = {
  onTime: "Zamanında",
  late: "Geç Giriş",
  absent: "Gelmedi",
  off: "İzinli",
  future: "Yoklama yok",
};

export type ClosedDayType = "full" | "half";

export type ClosedDay = {
  date: string; // YYYY-MM-DD
  note: string | null;
  type: ClosedDayType;
};

export const WEEKDAY_LABELS = [
  "Pazar",
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
] as const;

/** "17 dk" / "1 sa 5 dk" — geç kalma sürelerini kısa biçimde yazar. */
export function formatLateMinutes(minutes: number): string {
  if (minutes <= 0) return "0 dk";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} dk`;
  if (rest === 0) return `${hours} sa`;
  return `${hours} sa ${rest} dk`;
}
