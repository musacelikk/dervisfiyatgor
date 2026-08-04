import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/admin-session";
import { adminBackendFetch } from "@/lib/admin-backend";
import type { Order } from "@/types/order";

async function requireAdminSession() {
  const session = (await cookies()).get(ADMIN_COOKIE)?.value;
  return isValidAdminToken(session);
}

export async function GET(request: Request) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const channel = searchParams.get("channel");
    const query =
      channel === "sales" || channel === "store" ? `?channel=${channel}` : "";
    const data = await adminBackendFetch<{ orders: Order[]; total: number }>(
      `/api/admin/orders${query}`
    );
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Siparişler yüklenemedi." },
      { status: 503 }
    );
  }
}
