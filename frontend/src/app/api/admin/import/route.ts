import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/admin-session";
import { backendFetchWithSession } from "@/lib/admin-backend";
import type { ImportResult } from "@/types/product";

export const maxDuration = 300;

export async function POST(request: Request) {
  const session = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!(await isValidAdminToken(session))) {
    return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
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
    res = await backendFetchWithSession(`/api/import?replace=${replace}`, {
      method: "POST",
      auth: "admin",
      actor: { type: "admin" },
      body: backendForm,
      signal: AbortSignal.timeout(290_000),
    });
  } catch {
    return NextResponse.json(
      {
        error: `Backend'e bağlanılamadı. backend klasöründe "npm run dev" çalıştırın.`,
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
