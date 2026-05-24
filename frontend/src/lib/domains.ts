/** Canlı ortam subdomain'leri (.env.local / Vercel). Yerelde boş bırakın. */
export function getStoreHost(): string | undefined {
  const v = process.env.NEXT_PUBLIC_STORE_HOST?.trim().toLowerCase();
  return v || undefined;
}

export function getAdminHost(): string | undefined {
  const v = process.env.NEXT_PUBLIC_ADMIN_HOST?.trim().toLowerCase();
  return v || undefined;
}

export function getEmployeeHost(): string | undefined {
  const v = process.env.NEXT_PUBLIC_EMPLOYEE_HOST?.trim().toLowerCase();
  return v || undefined;
}

export function normalizeHost(host: string | null | undefined): string {
  return (host ?? "").split(":")[0].toLowerCase();
}

export function externalUrl(host: string | undefined, path: string): string {
  if (!host) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `https://${host}${p}`;
}

export function getAdminLoginUrl(): string {
  return externalUrl(getAdminHost(), "/admin/login");
}

export function getEmployeeLoginUrl(): string {
  return externalUrl(getEmployeeHost(), "/yonetici/login");
}

export function getStoreUrl(path = "/"): string {
  return externalUrl(getStoreHost(), path);
}
