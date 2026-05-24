const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function verifyAdminSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const res = await fetch(`${API_URL}/api/auth/admin/verify`, {
      method: "POST",
      headers: { "X-Admin-Session": token },
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function verifyEmployeeSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const res = await fetch(`${API_URL}/api/auth/employee/verify`, {
      method: "POST",
      headers: { "X-Employee-Session": token },
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}
