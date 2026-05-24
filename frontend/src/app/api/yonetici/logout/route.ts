import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { backendFetchWithSession } from "@/lib/admin-backend";
import { MANAGER_COOKIE } from "@/lib/manager-session";

export async function POST() {
  const token = (await cookies()).get(MANAGER_COOKIE)?.value;

  if (token) {
    try {
      await backendFetchWithSession("/api/auth/employee/logout", {
        method: "POST",
        auth: "employee",
      });
    } catch {
      /* oturum zaten geçersiz olabilir */
    }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete(MANAGER_COOKIE);
  return response;
}
