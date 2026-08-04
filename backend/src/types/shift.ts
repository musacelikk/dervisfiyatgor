import type { AttendanceStatus, AttendanceStatusOrAbsent } from "../lib/attendance";

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

/** Yoklama satırı — kaydı olmayan personel "absent" olarak döner. */
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
