import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/admin-session";
import { adminBackendFetch } from "@/lib/admin-backend";
import type { Product, ProductListResult } from "@/types/product";

async function requireAdminSession() {
  const session = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!(await isValidAdminToken(session))) return false;
  return true;
}

export async function GET(request: Request) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const page = searchParams.get("page") ?? "1";
  const limit = searchParams.get("limit") ?? "25";
  const categoryId = searchParams.get("categoryId");
  const query = new URLSearchParams({ page, limit });
  if (q) query.set("q", q);
  if (categoryId) query.set("categoryId", categoryId);

  try {
    const data = await adminBackendFetch<ProductListResult>(
      `/api/admin/products?${query}`
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
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  try {
    const data = await adminBackendFetch<{ product: Product }>("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Oluşturulamadı." },
      { status: 400 }
    );
  }
}
