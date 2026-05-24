import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/admin-session";
import { adminBackendFetch } from "@/lib/admin-backend";
import type { Order, OrderStatus } from "@/types/order";

async function requireAdminSession() {
  const session = (await cookies()).get(ADMIN_COOKIE)?.value;
  return isValidAdminToken(session);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  }
  const { id } = await context.params;
  try {
    const data = await adminBackendFetch<{ order: Order }>(`/api/admin/orders/${id}`);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sipariş yüklenemedi." },
      { status: 503 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  }
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  try {
    const data = await adminBackendFetch<{ order: Order }>(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: body.status as OrderStatus }),
    });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Güncellenemedi." },
      { status: 400 }
    );
  }
}
