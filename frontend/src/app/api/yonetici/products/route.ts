import { NextResponse } from "next/server";
import { adminBackendFetch } from "@/lib/admin-backend";
import { requireEmployeePermission } from "@/lib/employee-route-auth";
import type { Product, ProductListResult } from "@/types/product";

export async function GET(request: Request) {
  const auth = await requireEmployeePermission("products.view");
  if (auth instanceof NextResponse) return auth;
  void auth;

  const { searchParams } = new URL(request.url);
  const query = new URLSearchParams({
    page: searchParams.get("page") ?? "1",
    limit: searchParams.get("limit") ?? "25",
  });
  const q = searchParams.get("q");
  if (q) query.set("q", q);

  try {
    const data = await adminBackendFetch<ProductListResult>(
      `/api/admin/products?${query}`,
      { auth: "employee" }
    );
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Liste alınamadı." },
      { status: 503 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireEmployeePermission("products.create");
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => ({}));
  try {
    const data = await adminBackendFetch<{ product: Product }>("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      actor: { type: "employee", id: auth.id, name: auth.name },
      auth: "employee",
    });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Oluşturulamadı." },
      { status: 400 }
    );
  }
}
