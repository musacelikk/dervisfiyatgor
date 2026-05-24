import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/admin-session";
import { adminBackendFetch } from "@/lib/admin-backend";
import type { Order } from "@/types/order";

async function requireAdminSession() {
  const session = (await cookies()).get(ADMIN_COOKIE)?.value;
  return isValidAdminToken(session);
}

export async function GET() {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  }
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
