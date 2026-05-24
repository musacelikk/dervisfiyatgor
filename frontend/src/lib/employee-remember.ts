const STORAGE_KEY = "dervismobil-employee-remember";

export function readEmployeeRememberPref(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return true;
    return raw === "1";
  } catch {
    return true;
  }
}

export function writeEmployeeRememberPref(remember: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, remember ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/** Cookie maxAge (saniye) — beni hatırla açıkken 1 gün. */
export const EMPLOYEE_REMEMBER_MAX_AGE_SEC = 60 * 60 * 24;
