import type {
  AttendanceDayStatus,
  AttendanceStatus,
  AttendanceStatusOrAbsent,
  EmployeeShift,
} from "../lib/attendance";

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

/** Bir günün neden izinli sayıldığı: haftalık otomatik izin mi, elle eklenen tatil mi. */
export type AttendanceOffInfo = {
  /** "full" — tam gün kapalı, "half" — yarım gün izin (çalışma günü sayılır). */
  type: "full" | "half";
  note: string | null;
  source: "weekly" | "manual";
};

/** Yoklama satırı — kaydı olmayan personel "absent" olarak döner. */
export type AttendanceRow = {
  employeeId: number;
  employeeName: string;
  workDate: string;
  status: AttendanceStatusOrAbsent;
  entry: ShiftEntry | null;
  /** Personelin vardiyası ve o vardiyanın geç giriş sınırı ("HH:MM"). */
  shift: EmployeeShift;
  expectedStart: string;
  isLate: boolean;
  lateMinutes: number;
  /** Takvim/rozet rengi için türetilmiş gün durumu. */
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

/** Personel detay takviminde tek bir gün. */
export type AttendanceDay = {
  date: string;
  /** 0 = Pazar … 6 = Cumartesi */
  weekday: number;
  dayStatus: AttendanceDayStatus;
  /** Kayıt varsa tam/yarım gün; yoksa null. */
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
  /** Çalışma beklenen gün sayısı (tam gün izinler ve gelecek günler hariç). */
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
