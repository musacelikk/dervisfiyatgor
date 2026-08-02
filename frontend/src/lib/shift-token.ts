import type { ShiftEmployee } from "@/types/shift";

const TOKEN_KEY = "dervismobil-shift-token";
const EMPLOYEE_KEY = "dervismobil-shift-employee";

export function readShiftToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function writeShiftToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

export function readCachedShiftEmployee(): ShiftEmployee | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(EMPLOYEE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ShiftEmployee;
  } catch {
    return null;
  }
}

export function writeCachedShiftEmployee(employee: ShiftEmployee): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(EMPLOYEE_KEY, JSON.stringify(employee));
  } catch {
    /* ignore */
  }
}

export function clearShiftSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EMPLOYEE_KEY);
  } catch {
    /* ignore */
  }
}
