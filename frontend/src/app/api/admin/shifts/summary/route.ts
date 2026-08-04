import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/admin-session";
import { adminBackendFetch } from "@/lib/admin-backend";

export async function GET(request: Request) {
  const session = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!(await isValidAdminToken(session))) {
    return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const query = new URLSearchParams();
  const date = searchParams.get("date");
  if (date) query.set("date", date);

  try {
    const data = await adminBackendFetch<Record<string, unknown>>(
      `/api/admin/shifts/summary?${query}`
    );
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Özet yüklenemedi." },
      { status: 400 }
    );
  }
}
