import { adminProxyJson } from "@/lib/admin-proxy";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  return adminProxyJson(
    `/api/admin/expenses/${id}`,
    { method: "PATCH", body },
    "Gider güncellenemedi."
  );
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return adminProxyJson(
    `/api/admin/expenses/${id}`,
    { method: "DELETE" },
    "Gider silinemedi."
  );
}
