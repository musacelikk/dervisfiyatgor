import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = new URLSearchParams();
  const q = searchParams.get("q");
  const page = searchParams.get("page");
  const limit = searchParams.get("limit");
  const categoryId = searchParams.get("categoryId");
  if (q) query.set("q", q);
  if (page) query.set("page", page);
  if (limit) query.set("limit", limit);
  if (categoryId) query.set("categoryId", categoryId);

  try {
    const res = await fetch(`${API_URL}/api/products/catalog?${query}`, {
      cache: "no-store",
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { error: typeof body.error === "string" ? body.error : "Katalog yüklenemedi." },
        { status: res.status }
      );
    }
    return NextResponse.json(body);
  } catch {
    return NextResponse.json(
      { error: `Backend'e bağlanılamadı (${API_URL}).` },
      { status: 503 }
    );
  }
}
