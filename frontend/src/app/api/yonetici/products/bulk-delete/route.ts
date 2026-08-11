import { NextResponse } from "next/server";
import { adminBackendFetch } from "@/lib/admin-backend";
import { requireEmployeePermission } from "@/lib/employee-route-auth";

export async function POST(request: Request) {
  const auth = await requireEmployeePermission("products.delete");
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => ({}));
  try {
    const data = await adminBackendFetch<{ deleted: number }>(
      "/api/admin/products/bulk-delete",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        actor: { type: "employee", id: auth.id, name: auth.name },
        auth: "employee",
      }
    );
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Ürünler silinemedi." },
      { status: 400 }
    );
  }
}
