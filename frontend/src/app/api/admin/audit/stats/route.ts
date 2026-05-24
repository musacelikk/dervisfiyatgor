import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminBackendFetch } from "@/lib/admin-backend";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/admin-session";
import type { AuditStats } from "@/types/audit";

export async function GET() {
  const session = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!(await isValidAdminToken(session))) {
    return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  }

  try {
    const data = await adminBackendFetch<AuditStats>("/api/admin/audit/stats");
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "İstatistikler alınamadı." },
      { status: 503 }
    );
  }
}
