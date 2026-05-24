import { NextResponse } from "next/server";
import { getEmployeeSession } from "@/lib/employee-route-auth";

export async function GET() {
  const employee = await getEmployeeSession();
  if (!employee) {
    return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  }

  return NextResponse.json({
    employee: {
      id: employee.id,
      name: employee.name,
      username: employee.username,
      permissions: employee.permissions,
    },
  });
}
