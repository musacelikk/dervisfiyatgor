import crypto from "crypto";

const ADMIN_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const EMPLOYEE_REMEMBER_TTL_MS = 24 * 60 * 60 * 1000;
export const EMPLOYEE_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

type AdminSession = { createdAt: number; ttlMs: number };
type EmployeeSession = { employeeId: number; createdAt: number; ttlMs: number };

const adminSessions = new Map<string, AdminSession>();
const employeeSessions = new Map<string, EmployeeSession>();

function isExpired(session: { createdAt: number; ttlMs: number }): boolean {
  return Date.now() - session.createdAt > session.ttlMs;
}

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
  if (isExpired(session)) {
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
  ttlMs = EMPLOYEE_SESSION_TTL_MS
): string {
  const token = createToken();
  employeeSessions.set(token, { employeeId, createdAt: Date.now(), ttlMs });
  return token;
}

export function validateEmployeeSession(
  token: string | undefined
): { employeeId: number } | null {
  if (!token) return null;
  const session = employeeSessions.get(token);
  if (!session) return null;
  if (isExpired(session)) {
    employeeSessions.delete(token);
    return null;
  }
  return { employeeId: session.employeeId };
}

export function revokeEmployeeSession(token: string | undefined): void {
  if (token) employeeSessions.delete(token);
}
