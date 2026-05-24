import { NextResponse } from "next/server";

type LoginRouteConfig = {
  cookieName: string;
  getSecret: () => string;
  getToken: () => Promise<string>;
  missingSecretError: string;
};

export async function handlePasswordLogin(
  request: Request,
  config: LoginRouteConfig
): Promise<NextResponse> {
  const body = await request.json().catch(() => ({}));
  const password =
    typeof body.password === "string" ? body.password.trim() : "";

  const secret = config.getSecret();
  if (!secret) {
    return NextResponse.json({ error: config.missingSecretError }, { status: 500 });
  }

  if (password !== secret) {
    return NextResponse.json({ error: "Hatalı şifre." }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(config.cookieName, await config.getToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
