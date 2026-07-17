import { adminProxyJson } from "@/lib/admin-proxy";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  return adminProxyJson(
    `/api/admin/expenses/people/${id}`,
    { method: "PATCH", body },
    "Kişi güncellenemedi."
  );
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return adminProxyJson(
    `/api/admin/expenses/people/${id}`,
    { method: "DELETE" },
    "Kişi silinemedi."
  );
}
