import type { ImportResult } from "@/types/product";

export async function adminImportExcel(
  file: File,
  replace = false
): Promise<ImportResult> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`/api/admin/import?replace=${replace}`, {
    method: "POST",
    body: form,
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof body.error === "string" ? body.error : `Yükleme başarısız (${res.status})`
    );
  }

  return body as ImportResult;
}

export async function adminLogin(password: string): Promise<void> {
  const res = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body.error === "string" ? body.error : "Giriş başarısız.");
  }
}

export async function adminLogout(): Promise<void> {
  await fetch("/api/admin/logout", { method: "POST" });
}
