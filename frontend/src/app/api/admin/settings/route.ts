import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/admin-session";
import { adminBackendFetch } from "@/lib/admin-backend";

async function requireAdmin() {
  const session = (await cookies()).get(ADMIN_COOKIE)?.value;
  return Boolean(await isValidAdminToken(session));
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  }
  try {
    const data = await adminBackendFetch<Record<string, unknown>>("/api/admin/settings");
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Ayarlar yüklenemedi." },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  try {
    const data = await adminBackendFetch<Record<string, unknown>>("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Ayar kaydedilemedi." },
      { status: 400 }
    );
  }
}
