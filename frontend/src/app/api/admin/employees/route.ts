import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/admin-session";
import { adminBackendFetch } from "@/lib/admin-backend";
import type { Employee } from "@/types/employee";

async function requireAdminSession() {
  const session = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!(await isValidAdminToken(session))) {
    return null;
  }
  return session;
}

export async function GET() {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  }

  try {
    const data = await adminBackendFetch<{ employees: Employee[] }>("/api/employees");
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Liste alınamadı." },
      { status: 503 }
    );
  }
}

export async function POST(request: Request) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  try {
    const data = await adminBackendFetch<{ employee: Employee }>("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Oluşturulamadı." },
      { status: 400 }
    );
  }
}
