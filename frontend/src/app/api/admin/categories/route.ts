import { adminProxyJson } from "@/lib/admin-proxy";

export async function GET() {
  return adminProxyJson("/api/admin/categories", undefined, "Kategoriler yüklenemedi.");
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return adminProxyJson(
    "/api/admin/categories",
    { method: "POST", body },
    "Kategori eklenemedi."
  );
}
