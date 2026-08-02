import { NextResponse } from "next/server";
import { adminBackendFetch } from "@/lib/admin-backend";
import { requireEmployeePermission } from "@/lib/employee-route-auth";

export async function POST(request: Request) {
  const auth = await requireEmployeePermission("products.edit");
  if (auth instanceof NextResponse) return auth;
  const body = await request.json().catch(() => ({}));
  try {
    const data = await adminBackendFetch<Record<string, unknown>>(
      "/api/admin/product-images/confirm",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        auth: "employee",
        actor: { type: "employee", id: auth.id, name: auth.name },
      }
    );
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Kayıt başarısız." },
      { status: 400 }
    );
  }
}
