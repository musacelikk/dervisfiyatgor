import { NextResponse } from "next/server";
import { ADMIN_COOKIE, getAdminToken } from "@/lib/admin-session";
import { logServerAudit } from "@/lib/audit-client";
import { handlePasswordLogin } from "@/lib/login-route";

export async function POST(request: Request) {
  const secret = process.env.ADMIN_SECRET ?? "";
  if (!secret) {
    return handlePasswordLogin(request, {
      cookieName: ADMIN_COOKIE,
      getSecret: () => "",
      getToken: getAdminToken,
      missingSecretError: "Sunucuda ADMIN_SECRET tanımlı değil.",
    });
  }

  const body = await request.json().catch(() => ({}));
  const password =
    typeof body.password === "string" ? body.password.trim() : "";

  if (password !== secret) {
    await logServerAudit({
      action: "auth.admin.login_failed",
      actorType: "admin",
      actorName: "Yönetici",
      resourceType: "auth",
      message: "Başarısız admin giriş denemesi",
      success: false,
    });
    return NextResponse.json({ error: "Hatalı şifre." }, { status: 401 });
  }

  await logServerAudit({
    action: "auth.admin.login",
    actorType: "admin",
    actorName: "Yönetici",
    resourceType: "auth",
    message: "Admin paneline giriş yapıldı",
  });

  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_COOKIE, await getAdminToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
