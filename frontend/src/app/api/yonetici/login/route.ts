import { NextResponse } from "next/server";
import {
  MANAGER_COOKIE,
  buildManagerCookieValue,
  getManagerTokenForEmployee,
} from "@/lib/manager-session";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!username || !password) {
    return NextResponse.json(
      { error: "Kullanıcı adı ve şifre gerekli." },
      { status: 400 }
    );
  }

  if (!process.env.ADMIN_SECRET) {
    return NextResponse.json(
      { error: "Sunucuda ADMIN_SECRET tanımlı değil." },
      { status: 500 }
    );
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/auth/employee/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
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
  const token = await getManagerTokenForEmployee(employee.id);

  const response = NextResponse.json({ success: true, employee });
  response.cookies.set(
    MANAGER_COOKIE,
    buildManagerCookieValue(employee.id, token),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    }
  );

  return response;
}
