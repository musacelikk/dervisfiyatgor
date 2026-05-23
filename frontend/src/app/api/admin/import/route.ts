import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/admin-session";
import type { ImportResult } from "@/types/product";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function POST(request: Request) {
  const session = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!(await isValidAdminToken(session))) {
    return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  }

  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "ADMIN_SECRET tanımlı değil." }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const replace = searchParams.get("replace") === "true";
  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Dosya gerekli." }, { status: 400 });
  }

  const backendForm = new FormData();
  backendForm.append("file", file);

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/import?replace=${replace}`, {
      method: "POST",
      headers: { "X-Admin-Key": secret },
      body: backendForm,
    });
  } catch {
    return NextResponse.json(
      {
        error: `Backend'e bağlanılamadı (${API_URL}). backend klasöründe "npm run dev" çalıştırın.`,
      },
      { status: 503 }
    );
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof body.error === "string" ? body.error : `Yükleme başarısız (${res.status})`;
    return NextResponse.json({ error: message }, { status: res.status });
  }

  return NextResponse.json(body as ImportResult);
}
