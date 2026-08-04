import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/admin-session";
import { adminBackendFetch } from "@/lib/admin-backend";

async function requireAdmin() {
  const session = (await cookies()).get(ADMIN_COOKIE)?.value;
  return Boolean(await isValidAdminToken(session));
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  }
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Geçersiz id." }, { status: 400 });
  }
  const body = await request.json().catch(() => ({}));
  try {
    const data = await adminBackendFetch<Record<string, unknown>>(
      `/api/admin/shifts/${id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Güncellenemedi." },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  }
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Geçersiz id." }, { status: 400 });
  }
  try {
    const data = await adminBackendFetch<Record<string, unknown>>(
      `/api/admin/shifts/${id}`,
      { method: "DELETE" }
    );
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Silinemedi." },
      { status: 400 }
    );
  }
}
