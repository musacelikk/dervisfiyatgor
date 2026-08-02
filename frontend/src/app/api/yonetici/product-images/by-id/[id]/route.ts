import { NextResponse } from "next/server";
import { adminBackendFetch } from "@/lib/admin-backend";
import { requireEmployeePermission } from "@/lib/employee-route-auth";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireEmployeePermission("products.edit");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Geçersiz id." }, { status: 400 });
  }
  try {
    const data = await adminBackendFetch<Record<string, unknown>>(
      `/api/admin/product-images/${id}`,
      {
        method: "DELETE",
        auth: "employee",
        actor: { type: "employee", id: auth.id, name: auth.name },
      }
    );
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Silinemedi." },
      { status: 400 }
    );
  }
}
