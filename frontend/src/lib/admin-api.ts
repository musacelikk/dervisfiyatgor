import type { AuditListResult, AuditStats } from "@/types/audit";
import type { PageSizeOption } from "@/lib/permissions";
import { pageSizeToLimit } from "@/lib/permissions";
import type { Employee } from "@/types/employee";
import type { PermissionId } from "@/lib/permissions";
import type { ImportResult, Product, ProductListResult } from "@/types/product";

async function downloadExcel(type: "template" | "catalog"): Promise<void> {
  const res = await fetch(`/api/admin/export?type=${type}`);
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

export function downloadExcelTemplate(): Promise<void> {
  return downloadExcel("template");
}

export function downloadExcelCatalog(): Promise<void> {
  return downloadExcel("catalog");
}

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

export async function fetchEmployees(): Promise<Employee[]> {
  const res = await fetch("/api/admin/employees");
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body.error === "string" ? body.error : "Çalışanlar yüklenemedi.");
  }
  return (body.employees ?? []) as Employee[];
}

export async function createEmployee(input: {
  name: string;
  username: string;
  password: string;
  permissions?: PermissionId[];
}): Promise<Employee> {
  const res = await fetch("/api/admin/employees", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body.error === "string" ? body.error : "Çalışan eklenemedi.");
  }
  return body.employee as Employee;
}

export async function updateEmployee(
  id: number,
  input: Partial<{
    name: string;
    username: string;
    password: string;
    active: boolean;
    permissions: PermissionId[];
  }>
): Promise<Employee> {
  const res = await fetch(`/api/admin/employees/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body.error === "string" ? body.error : "Güncellenemedi.");
  }
  return body.employee as Employee;
}

export async function deleteEmployee(id: number): Promise<void> {
  const res = await fetch(`/api/admin/employees/${id}`, { method: "DELETE" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body.error === "string" ? body.error : "Silinemedi.");
  }
}

export async function fetchProducts(params: {
  q?: string;
  page?: number;
  pageSize?: PageSizeOption;
}): Promise<ProductListResult> {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.page) search.set("page", String(params.page));
  const limit = pageSizeToLimit(params.pageSize ?? 25);
  search.set("limit", limit === "all" ? "all" : String(limit));

  const res = await fetch(`/api/admin/products?${search}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body.error === "string" ? body.error : "Ürünler yüklenemedi.");
  }
  return body as ProductListResult;
}

export async function createProduct(product: Product): Promise<Product> {
  const res = await fetch("/api/admin/products", {
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

export async function updateProduct(
  stockCode: string,
  product: Partial<Product>
): Promise<Product> {
  const res = await fetch(`/api/admin/products/${encodeURIComponent(stockCode)}`, {
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

export async function deleteProduct(stockCode: string): Promise<void> {
  const res = await fetch(`/api/admin/products/${encodeURIComponent(stockCode)}`, {
    method: "DELETE",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body.error === "string" ? body.error : "Silinemedi.");
  }
}

export async function fetchAuditStats(): Promise<AuditStats> {
  const res = await fetch("/api/admin/audit/stats");
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body.error === "string" ? body.error : "İstatistikler yüklenemedi.");
  }
  return body as AuditStats;
}

export async function fetchAuditLogs(options: {
  page?: number;
  limit?: number;
  action?: string;
  actorType?: string;
  q?: string;
}): Promise<AuditListResult> {
  const params = new URLSearchParams();
  params.set("page", String(options.page ?? 1));
  params.set("limit", String(options.limit ?? 30));
  if (options.action) params.set("action", options.action);
  if (options.actorType) params.set("actorType", options.actorType);
  if (options.q) params.set("q", options.q);

  const res = await fetch(`/api/admin/audit?${params}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body.error === "string" ? body.error : "Loglar yüklenemedi.");
  }
  return body as AuditListResult;
}
