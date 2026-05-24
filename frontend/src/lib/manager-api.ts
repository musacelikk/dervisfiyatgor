import type { EmployeeSession } from "@/types/employee";
import type { ImportResult, Product, ProductListResult } from "@/types/product";
import type { PageSizeOption } from "@/lib/permissions";
import { pageSizeToLimit } from "@/lib/permissions";

export async function managerLogin(
  username: string,
  password: string,
  rememberMe = false
): Promise<void> {
  const res = await fetch("/api/yonetici/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, rememberMe }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body.error === "string" ? body.error : "Giriş başarısız.");
  }
}

export async function managerLogout(): Promise<void> {
  await fetch("/api/yonetici/logout", { method: "POST" });
}

export async function fetchManagerSession(): Promise<EmployeeSession | null> {
  const res = await fetch("/api/yonetici/me");
  if (res.status === 401) return null;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return null;
  return (body.employee ?? null) as EmployeeSession | null;
}

async function downloadExcel(type: "template" | "catalog"): Promise<void> {
  const res = await fetch(`/api/yonetici/export?type=${type}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(typeof body.error === "string" ? body.error : "Excel indirilemedi.");
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="?([^";\n]+)"?/i);
  const filename =
    match?.[1] ??
    (type === "template"
      ? "urun-sablonu.xlsx"
      : `katalog-${new Date().toISOString().slice(0, 10)}.xlsx`);

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function managerDownloadExcelTemplate(): Promise<void> {
  return downloadExcel("template");
}

export function managerDownloadExcelCatalog(): Promise<void> {
  return downloadExcel("catalog");
}

export async function managerImportExcel(
  file: File,
  replace = false
): Promise<ImportResult> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`/api/yonetici/import?replace=${replace}`, {
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

export async function managerFetchProducts(params: {
  q?: string;
  page?: number;
  pageSize?: PageSizeOption;
}): Promise<ProductListResult> {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.page) search.set("page", String(params.page));
  const limit = pageSizeToLimit(params.pageSize ?? 25);
  search.set("limit", limit === "all" ? "all" : String(limit));

  const res = await fetch(`/api/yonetici/products?${search}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body.error === "string" ? body.error : "Ürünler yüklenemedi.");
  }
  return body as ProductListResult;
}

export async function managerCreateProduct(product: Product): Promise<Product> {
  const res = await fetch("/api/yonetici/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body.error === "string" ? body.error : "Ürün eklenemedi.");
  }
  return body.product as Product;
}

export async function managerUpdateProduct(
  stockCode: string,
  product: Partial<Product>
): Promise<Product> {
  const res = await fetch(`/api/yonetici/products/${encodeURIComponent(stockCode)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body.error === "string" ? body.error : "Güncellenemedi.");
  }
  return body.product as Product;
}

export async function managerDeleteProduct(stockCode: string): Promise<void> {
  const res = await fetch(`/api/yonetici/products/${encodeURIComponent(stockCode)}`, {
    method: "DELETE",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body.error === "string" ? body.error : "Silinemedi.");
  }
}
