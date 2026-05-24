import crypto from "crypto";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type AdminSession = { createdAt: number };
type EmployeeSession = { employeeId: number; createdAt: number };

const adminSessions = new Map<string, AdminSession>();
const employeeSessions = new Map<string, EmployeeSession>();

function isExpired(createdAt: number): boolean {
  return Date.now() - createdAt > SESSION_TTL_MS;
}

function createToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function createAdminSession(): string {
  const token = createToken();
  adminSessions.set(token, { createdAt: Date.now() });
  return token;
}

export function validateAdminSession(token: string | undefined): boolean {
  if (!token) return false;
  const session = adminSessions.get(token);
  if (!session) return false;
  if (isExpired(session.createdAt)) {
    adminSessions.delete(token);
    return false;
  }
  return true;
}

export function revokeAdminSession(token: string | undefined): void {
  if (token) adminSessions.delete(token);
}

export function createEmployeeSession(employeeId: number): string {
  const token = createToken();
  employeeSessions.set(token, { employeeId, createdAt: Date.now() });
  return token;
}

export function validateEmployeeSession(
  token: string | undefined
): { employeeId: number } | null {
  if (!token) return null;
  const session = employeeSessions.get(token);
  if (!session) return null;
  if (isExpired(session.createdAt)) {
    employeeSessions.delete(token);
    return null;
  }
  return { employeeId: session.employeeId };
}

export function revokeEmployeeSession(token: string | undefined): void {
  if (token) employeeSessions.delete(token);
}
