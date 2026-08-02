import { NextResponse } from "next/server";
import { adminBackendFetch } from "@/lib/admin-backend";
import { requireEmployeePermission } from "@/lib/employee-route-auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ stockCode: string }> }
) {
  const auth = await requireEmployeePermission("products.view");
  if (auth instanceof NextResponse) return auth;
  const { stockCode } = await params;
  try {
    const data = await adminBackendFetch<Record<string, unknown>>(
      `/api/admin/product-images/${encodeURIComponent(stockCode)}`,
      { auth: "employee" }
    );
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Liste alınamadı." },
      { status: 400 }
    );
  }
}
