import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE } from "@/lib/admin-session";
import { backendFetchWithSession } from "@/lib/admin-backend";

export async function POST() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;

  if (token) {
    try {
      await backendFetchWithSession("/api/auth/admin/logout", {
        method: "POST",
        auth: "admin",
      });
    } catch {
      /* oturum zaten geçersiz olabilir */
    }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete(ADMIN_COOKIE);
  return response;
}
