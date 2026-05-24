import { NextResponse } from "next/server";
import { adminBackendFetch } from "@/lib/admin-backend";
import { requireEmployeePermission } from "@/lib/employee-route-auth";
import type { Order } from "@/types/order";

export async function GET() {
  const auth = await requireEmployeePermission("orders.view");
  if (auth instanceof NextResponse) return auth;

  try {
    const data = await adminBackendFetch<{ orders: Order[]; total: number }>("/api/admin/orders");
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Siparişler yüklenemedi." },
      { status: 503 }
    );
  }
}
