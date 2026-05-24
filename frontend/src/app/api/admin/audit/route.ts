import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminBackendFetch } from "@/lib/admin-backend";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/admin-session";
import type { AuditListResult } from "@/types/audit";

export async function GET(request: Request) {
  const session = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!(await isValidAdminToken(session))) {
    return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.toString();

  try {
    const data = await adminBackendFetch<AuditListResult>(
      `/api/admin/audit${query ? `?${query}` : ""}`
    );
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Loglar alınamadı." },
      { status: 503 }
    );
  }
}
