import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/admin-session";
import { adminBackendFetch } from "@/lib/admin-backend";

async function requireAdmin() {
  const session = (await cookies()).get(ADMIN_COOKIE)?.value;
  return Boolean(await isValidAdminToken(session));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ stockCode: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  }
  const { stockCode } = await params;
  try {
    const data = await adminBackendFetch<Record<string, unknown>>(
      `/api/admin/product-images/${encodeURIComponent(stockCode)}`
    );
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Liste alınamadı." },
      { status: 400 }
    );
  }
}
