import { NextResponse } from "next/server";
import { adminBackendFetch } from "@/lib/admin-backend";
import { requireEmployeePermission } from "@/lib/employee-route-auth";
import type { Order } from "@/types/order";

export async function POST(request: Request) {
  const auth = await requireEmployeePermission("orders.view");
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => ({}));
  try {
    const data = await adminBackendFetch<{ orders: Order[] }>(
      "/api/admin/orders/bulk-status",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        auth: "employee",
      }
    );
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Durumlar güncellenemedi." },
      { status: 400 }
    );
  }
}
