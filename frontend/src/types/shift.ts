export type ShiftHonorific = "Bey" | "Hanım" | null;

/** 11:00'a kadar giriş = full (Tam Gün), sonrası = half (Yarım Gün) */
export type AttendanceStatus = "full" | "half";
export type AttendanceStatusOrAbsent = AttendanceStatus | "absent";

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
  deniedAttempts: number;
};

export type AttendanceReport = {
  from: string;
  to: string;
  full: number;
  half: number;
  absent: number;
  perEmployee: {
    employeeId: number;
    employeeName: string;
    full: number;
    half: number;
    absent: number;
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
};
