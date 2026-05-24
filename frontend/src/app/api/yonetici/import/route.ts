import { NextResponse } from "next/server";
import { requireEmployeePermission } from "@/lib/employee-route-auth";
import { backendFetchWithSession } from "@/lib/admin-backend";
import type { ImportResult } from "@/types/product";

export async function POST(request: Request) {
  const auth = await requireEmployeePermission("excel.upload");
  if (auth instanceof NextResponse) return auth;

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
      auth: "employee",
      actor: { type: "employee", id: auth.id, name: auth.name },
      body: backendForm,
    });
  } catch {
    return NextResponse.json(
      { error: `Backend'e bağlanılamadı.` },
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
