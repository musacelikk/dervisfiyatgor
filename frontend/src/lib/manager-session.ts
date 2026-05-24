import { sha256Hex } from "@/lib/crypto";

export const MANAGER_COOKIE = "manager_session";

export function parseManagerCookie(
  value: string | undefined
): { employeeId: number; token: string } | null {
  if (!value) return null;
  const parts = value.split(":");
  if (parts.length !== 3 || parts[0] !== "e") return null;
  const employeeId = Number(parts[1]);
  if (!Number.isFinite(employeeId) || employeeId < 1) return null;
  return { employeeId, token: parts[2] ?? "" };
}

export function buildManagerCookieValue(employeeId: number, token: string): string {
  return `e:${employeeId}:${token}`;
}

export async function getManagerTokenForEmployee(employeeId: number): Promise<string> {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    throw new Error("ADMIN_SECRET tanımlı değil.");
  }
  return sha256Hex(`employee:${employeeId}:${secret}`);
}

export async function isValidManagerToken(
  value: string | undefined
): Promise<boolean> {
  const parsed = parseManagerCookie(value);
  if (!parsed) return false;
  try {
    const expected = await getManagerTokenForEmployee(parsed.employeeId);
    return parsed.token === expected;
  } catch {
    return false;
  }
}

export async function getManagerEmployeeId(
  value: string | undefined
): Promise<number | null> {
  if (!(await isValidManagerToken(value))) return null;
  return parseManagerCookie(value)!.employeeId;
}
