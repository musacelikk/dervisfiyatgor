import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/admin-session";
import { backendFetchWithSession } from "@/lib/admin-backend";

export async function GET(request: Request) {
  const session = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!(await isValidAdminToken(session))) {
    return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  }

  const type = new URL(request.url).searchParams.get("type");
  const path = type === "template" ? "/api/export/template" : "/api/export/products";

  if (type !== "template" && type !== "catalog") {
    return NextResponse.json({ error: "type=template veya type=catalog gerekli." }, { status: 400 });
  }

  let res: Response;
  try {
    res = await backendFetchWithSession(path, { auth: "admin" });
  } catch {
    return NextResponse.json(
      { error: `Backend'e bağlanılamadı. backend klasöründe "npm run dev" çalıştırın.` },
      { status: 503 }
    );
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      typeof body.error === "string" ? body.error : "Excel indirilemedi.";
    return NextResponse.json({ error: message }, { status: res.status });
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="?([^";\n]+)"?/i);
  const filename =
    match?.[1] ??
    (type === "template" ? "urun-sablonu.xlsx" : `katalog-${new Date().toISOString().slice(0, 10)}.xlsx`);

  return new NextResponse(blob, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
