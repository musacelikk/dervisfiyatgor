import { NextResponse } from "next/server";
import { MANAGER_COOKIE, getManagerToken, getManagerSecret } from "@/lib/manager-session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const password =
    typeof body.password === "string" ? body.password.trim() : "";

  if (!getManagerSecret()) {
    return NextResponse.json(
      { error: "Sunucuda MANAGER_SECRET veya ADMIN_SECRET tanımlı değil." },
      { status: 500 }
    );
  }

  if (password !== getManagerSecret()) {
    return NextResponse.json({ error: "Hatalı şifre." }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(MANAGER_COOKIE, await getManagerToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
