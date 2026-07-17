import { NextResponse } from "next/server";
import {
  MANAGER_COOKIE,
} from "@/lib/manager-session";
import { EMPLOYEE_REMEMBER_MAX_AGE_SEC } from "@/lib/employee-remember";
import { backendFetchWithSession } from "@/lib/admin-backend";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const rememberMe = body.rememberMe === true;

  if (!username || !password) {
    return NextResponse.json(
      { error: "Kullanıcı adı ve şifre gerekli." },
      { status: 400 }
    );
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/auth/employee/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, rememberMe }),
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

  const employee = data.employee as { id: number; name: string; username: string };
  const token = typeof data.token === "string" ? data.token : "";
  if (!token) {
    return NextResponse.json({ error: "Oturum oluşturulamadı." }, { status: 502 });
  }

  const response = NextResponse.json({ success: true, employee });
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };

  // Backend oturumu kayan 6 saat ile sınırlar; cookie uzun ömürlü tutulur.
  response.cookies.set(MANAGER_COOKIE, token, {
    ...cookieOptions,
    maxAge: EMPLOYEE_REMEMBER_MAX_AGE_SEC,
  });

  return response;
}
