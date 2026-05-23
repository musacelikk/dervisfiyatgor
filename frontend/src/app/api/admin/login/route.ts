import { NextResponse } from "next/server";
import { ADMIN_COOKIE, getAdminToken } from "@/lib/admin-session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const password =
    typeof body.password === "string" ? body.password.trim() : "";

  if (!process.env.ADMIN_SECRET) {
    return NextResponse.json(
      { error: "Sunucuda ADMIN_SECRET tanımlı değil." },
      { status: 500 }
    );
  }

  if (password !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Hatalı şifre." }, { status: 401 });
  }

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
