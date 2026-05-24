import { verifyEmployeeSession } from "@/lib/session-verify";

export const MANAGER_COOKIE = "manager_session";

/** Eski `e:id:token` formatını da okur; yeni oturumlar yalnızca token içerir. */
export function normalizeManagerToken(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const parts = value.split(":");
  if (parts.length === 3 && parts[0] === "e") {
    return parts[2] || undefined;
  }
  return value;
}

export async function isValidManagerToken(
  value: string | undefined
): Promise<boolean> {
  return verifyEmployeeSession(normalizeManagerToken(value));
}

export async function getManagerEmployeeId(
  value: string | undefined
): Promise<number | null> {
  const token = normalizeManagerToken(value);
  if (!token) return null;
  if (!(await verifyEmployeeSession(token))) return null;

  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  try {
    const res = await fetch(`${API_URL}/api/auth/employee/me`, {
      headers: { "X-Employee-Session": token },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { employee?: { id?: number } };
    const id = data.employee?.id;
    return typeof id === "number" && Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}
