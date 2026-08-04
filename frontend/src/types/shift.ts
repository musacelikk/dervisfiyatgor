export type ShiftHonorific = "Bey" | "Hanım" | null;

/** 11:00'a kadar giriş = full (Tam Gün), sonrası = half (Yarım Gün) */
export type AttendanceStatus = "full" | "half";
/** "off" — dükkanın izinli/kapalı olduğu bir gün, kaydı olmayan personel devamsız sayılmaz. */
export type AttendanceStatusOrAbsent = AttendanceStatus | "absent" | "off";

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

export type AttendanceRow = {
  employeeId: number;
  employeeName: string;
  workDate: string;
  status: AttendanceStatusOrAbsent;
  entry: ShiftEntry | null;
};

export type AttendanceSummary = {
  workDate: string;
  totalEmployees: number;
  present: number;
  absent: number;
  full: number;
  half: number;
  off: number;
  deniedAttempts: number;
};

export type AttendanceReport = {
  from: string;
  to: string;
  full: number;
  half: number;
  absent: number;
  off: number;
  perEmployee: {
    employeeId: number;
    employeeName: string;
    full: number;
    half: number;
    absent: number;
    off: number;
  }[];
};

export type AttendanceListResult = {
  rows: AttendanceRow[];
  from: string;
  to: string;
  cutoff: string;
};

export const ATTENDANCE_LABELS: Record<AttendanceStatusOrAbsent, string> = {
  full: "Tam Gün",
  half: "Yarım Gün",
  absent: "Gelmedi",
  off: "İzinli",
};

export type ClosedDay = {
  date: string; // YYYY-MM-DD
  note: string | null;
};
