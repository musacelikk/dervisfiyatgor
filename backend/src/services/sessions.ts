import crypto from "crypto";

/** Admin oturumu: çıkış yapılmadıkça geçerli kalır (10 yıl). */
const ADMIN_SESSION_TTL_MS = 10 * 365 * 24 * 60 * 60 * 1000;
/**
 * Personel oturumu: kayan (sliding) süre — her istek süreyi yeniler.
 * 6 saat boyunca hiç kullanılmazsa oturum düşer.
 */
export const EMPLOYEE_IDLE_TTL_MS = 6 * 60 * 60 * 1000;
/** @deprecated Kayan süre kullanılıyor; geriye dönük uyumluluk için tutuldu. */
export const EMPLOYEE_REMEMBER_TTL_MS = EMPLOYEE_IDLE_TTL_MS;
export const EMPLOYEE_SESSION_TTL_MS = EMPLOYEE_IDLE_TTL_MS;

type AdminSession = { createdAt: number; ttlMs: number };
type EmployeeSession = { employeeId: number; lastActivityAt: number; ttlMs: number };

const adminSessions = new Map<string, AdminSession>();
const employeeSessions = new Map<string, EmployeeSession>();

function createToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function createAdminSession(): string {
  const token = createToken();
  adminSessions.set(token, { createdAt: Date.now(), ttlMs: ADMIN_SESSION_TTL_MS });
  return token;
}

export function validateAdminSession(token: string | undefined): boolean {
  if (!token) return false;
  const session = adminSessions.get(token);
  if (!session) return false;
  if (Date.now() - session.createdAt > session.ttlMs) {
    adminSessions.delete(token);
    return false;
  }
  return true;
}

export function revokeAdminSession(token: string | undefined): void {
  if (token) adminSessions.delete(token);
}

export function createEmployeeSession(
  employeeId: number,
  ttlMs = EMPLOYEE_IDLE_TTL_MS
): string {
  const token = createToken();
  employeeSessions.set(token, { employeeId, lastActivityAt: Date.now(), ttlMs });
  return token;
}

export function validateEmployeeSession(
  token: string | undefined
): { employeeId: number } | null {
  if (!token) return null;
  const session = employeeSessions.get(token);
  if (!session) return null;
  const now = Date.now();
  if (now - session.lastActivityAt > session.ttlMs) {
    employeeSessions.delete(token);
    return null;
  }
  // Kayan süre: her geçerli kullanım oturumu yeniler.
  session.lastActivityAt = now;
  return { employeeId: session.employeeId };
}

export function revokeEmployeeSession(token: string | undefined): void {
  if (token) employeeSessions.delete(token);
}
