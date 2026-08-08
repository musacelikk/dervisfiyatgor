import { NextResponse } from "next/server";
import { adminProxyJson } from "@/lib/admin-proxy";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Geçersiz kategori id." }, { status: 400 });
  }
  const body = await request.json().catch(() => ({}));
  return adminProxyJson(
    `/api/admin/categories/${id}`,
    { method: "PATCH", body },
    "Kategori güncellenemedi."
  );
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Geçersiz kategori id." }, { status: 400 });
  }
  return adminProxyJson(
    `/api/admin/categories/${id}`,
    { method: "DELETE" },
    "Kategori silinemedi."
  );
}
