import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/admin-session";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const password =
    typeof body.password === "string" ? body.password.trim() : "";

  if (!password) {
    return NextResponse.json({ error: "Şifre gerekli." }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/auth/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
  } catch {
    return NextResponse.json(
      { error: `Backend'e bağlanılamadı (${API_URL}).` },
      { status: 503 }
    );
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof data.error === "string" ? data.error : "Giriş başarısız.";
    return NextResponse.json({ error: message }, { status: res.status });
  }

  const token = typeof data.token === "string" ? data.token : "";
  if (!token) {
    return NextResponse.json({ error: "Oturum oluşturulamadı." }, { status: 502 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
