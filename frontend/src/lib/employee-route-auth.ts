import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import {
  hasPermission,
  type PermissionId,
} from "@/lib/permissions";
import { MANAGER_COOKIE, normalizeManagerToken } from "@/lib/manager-session";
import type { Employee } from "@/types/employee";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function getEmployeeSession(): Promise<Employee | null> {
  const token = normalizeManagerToken(
    (await cookies()).get(MANAGER_COOKIE)?.value
  );
  if (!token) return null;

  try {
    const res = await fetch(`${API_URL}/api/auth/employee/me`, {
      headers: { "X-Employee-Session": token },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { employee?: Employee };
    const employee = data.employee;
    if (!employee?.active) return null;
    return employee;
  } catch {
    return null;
  }
}

export async function requireEmployeeSession(): Promise<Employee | NextResponse> {
  const employee = await getEmployeeSession();
  if (!employee) {
    return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  }
  return employee;
}

export async function requireEmployeePermission(
  permission: PermissionId
): Promise<Employee | NextResponse> {
  const result = await requireEmployeeSession();
  if (result instanceof NextResponse) return result;
  if (!hasPermission(result.permissions, permission)) {
    return NextResponse.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403 });
  }
  return result;
}

export async function requireEmployeePagePermission(permission: PermissionId): Promise<Employee> {
  const employee = await getEmployeeSession();
  if (!employee) redirect("/yonetici/login");
  if (!hasPermission(employee.permissions, permission)) redirect("/yonetici");
  return employee;
}
