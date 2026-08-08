import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/admin-session";
import { adminBackendFetch } from "@/lib/admin-backend";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const session = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!(await isValidAdminToken(session))) {
    return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  }

  const { employeeId } = await params;
  if (!/^\d+$/.test(employeeId)) {
    return NextResponse.json({ error: "Geçersiz personel id." }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const query = new URLSearchParams();
  for (const key of ["from", "to"]) {
    const value = searchParams.get(key);
    if (value) query.set(key, value);
  }

  try {
    const data = await adminBackendFetch<Record<string, unknown>>(
      `/api/admin/shifts/employee/${employeeId}?${query}`
    );
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Personel yoklaması yüklenemedi." },
      { status: 400 }
    );
  }
}
