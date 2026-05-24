import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/admin-session";
import { logServerAudit } from "@/lib/audit-client";

export async function POST() {
  await logServerAudit({
    action: "auth.admin.logout",
    actorType: "admin",
    actorName: "Yönetici",
    resourceType: "auth",
    message: "Admin panelinden çıkış yapıldı",
  });

  const response = NextResponse.json({ success: true });
  response.cookies.delete(ADMIN_COOKIE);
  return response;
}
