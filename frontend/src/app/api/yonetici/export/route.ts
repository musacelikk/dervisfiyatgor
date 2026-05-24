import { NextResponse } from "next/server";
import { requireEmployeePermission } from "@/lib/employee-route-auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function GET(request: Request) {
  const auth = await requireEmployeePermission("excel.download");
  if (auth instanceof NextResponse) return auth;

  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "ADMIN_SECRET tanımlı değil." }, { status: 500 });
  }

  const type = new URL(request.url).searchParams.get("type");
  const path = type === "template" ? "/api/export/template" : "/api/export/products";

  if (type !== "template" && type !== "catalog") {
    return NextResponse.json({ error: "type=template veya type=catalog gerekli." }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      headers: {
        "X-Admin-Key": secret,
        "X-Actor-Type": "employee",
        "X-Actor-Id": String(auth.id),
        "X-Actor-Name": encodeURIComponent(auth.name),
      },
    });
  } catch {
    return NextResponse.json(
      { error: `Backend'e bağlanılamadı (${API_URL}).` },
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
