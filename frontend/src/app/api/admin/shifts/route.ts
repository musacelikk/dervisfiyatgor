import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/admin-session";
import { adminBackendFetch } from "@/lib/admin-backend";

async function requireAdmin() {
  const session = (await cookies()).get(ADMIN_COOKIE)?.value;
  return Boolean(await isValidAdminToken(session));
}

export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const query = new URLSearchParams();
  for (const key of ["from", "to", "employeeId", "status"]) {
    const value = searchParams.get(key);
    if (value) query.set(key, value);
  }

  try {
    const data = await adminBackendFetch<Record<string, unknown>>(
      `/api/admin/shifts?${query}`
    );
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Yoklama yüklenemedi." },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  try {
    const data = await adminBackendFetch<Record<string, unknown>>("/api/admin/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Kayıt eklenemedi." },
      { status: 400 }
    );
  }
}
