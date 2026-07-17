import { adminProxyJson } from "@/lib/admin-proxy";

export async function GET() {
  return adminProxyJson("/api/admin/expenses", undefined, "Giderler yüklenemedi.");
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return adminProxyJson(
    "/api/admin/expenses",
    { method: "POST", body },
    "Gider oluşturulamadı."
  );
}
