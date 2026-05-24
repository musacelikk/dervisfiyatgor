import { NextResponse } from "next/server";
import { logServerAudit } from "@/lib/audit-client";
import { getEmployeeSession } from "@/lib/employee-route-auth";
import { MANAGER_COOKIE } from "@/lib/manager-session";

export async function POST() {
  const employee = await getEmployeeSession();
  if (employee) {
    await logServerAudit({
      action: "auth.employee.logout",
      actorType: "employee",
      actorId: String(employee.id),
      actorName: employee.name,
      resourceType: "auth",
      message: `Personel çıkışı: ${employee.name}`,
      metadata: { username: employee.username },
    });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete(MANAGER_COOKIE);
  return response;
}
