import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { adminBackendFetch } from "@/lib/admin-backend";
import {
  hasPermission,
  type PermissionId,
} from "@/lib/permissions";
import { getManagerEmployeeId, MANAGER_COOKIE } from "@/lib/manager-session";
import type { Employee } from "@/types/employee";

export async function getEmployeeSession(): Promise<Employee | null> {
  const employeeId = await getManagerEmployeeId(
    (await cookies()).get(MANAGER_COOKIE)?.value
  );
  if (!employeeId) return null;

  try {
    const data = await adminBackendFetch<{ employees: Employee[] }>("/api/employees");
    const employee = data.employees.find((e) => e.id === employeeId && e.active);
    return employee ?? null;
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
