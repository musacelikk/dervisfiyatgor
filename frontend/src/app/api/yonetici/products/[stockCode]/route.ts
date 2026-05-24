import { NextResponse } from "next/server";
import { adminBackendFetch } from "@/lib/admin-backend";
import { requireEmployeePermission } from "@/lib/employee-route-auth";
import type { Product } from "@/types/product";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ stockCode: string }> }
) {
  const auth = await requireEmployeePermission("products.edit");
  if (auth instanceof NextResponse) return auth;

  const { stockCode } = await params;
  const body = await request.json().catch(() => ({}));

  try {
    const data = await adminBackendFetch<{ product: Product }>(
      `/api/admin/products/${encodeURIComponent(stockCode)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        actor: { type: "employee", id: auth.id, name: auth.name },
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
  { params }: { params: Promise<{ stockCode: string }> }
) {
  const auth = await requireEmployeePermission("products.delete");
  if (auth instanceof NextResponse) return auth;

  const { stockCode } = await params;

  try {
    await adminBackendFetch<{ success: boolean }>(
      `/api/admin/products/${encodeURIComponent(stockCode)}`,
      {
        method: "DELETE",
        actor: { type: "employee", id: auth.id, name: auth.name },
      }
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Silinemedi." },
      { status: 400 }
    );
  }
}
