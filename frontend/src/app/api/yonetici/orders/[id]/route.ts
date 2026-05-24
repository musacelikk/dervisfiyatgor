import { NextResponse } from "next/server";
import { adminBackendFetch } from "@/lib/admin-backend";
import { requireEmployeePermission } from "@/lib/employee-route-auth";
import type { Order, OrderStatus } from "@/types/order";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireEmployeePermission("orders.view");
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  try {
    const data = await adminBackendFetch<{ order: Order }>(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: body.status as OrderStatus }),
      auth: "employee",
    });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Güncellenemedi." },
      { status: 400 }
    );
  }
}
