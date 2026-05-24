import { ADMIN_NAV } from "./admin-nav";
import { EMPLOYEE_NAV } from "./employee-nav";

/** Canlı ortam subdomain'leri (.env.local / Vercel). Yerelde boş bırakın. */
export function getStoreHost(): string | undefined {
  const v = process.env.NEXT_PUBLIC_STORE_HOST?.trim().toLowerCase();
  return v || undefined;
}

export function getAdminHost(): string | undefined {
  const v = process.env.NEXT_PUBLIC_ADMIN_HOST?.trim().toLowerCase();
  return v || undefined;
}

/** personel.dervisplastik.com — çalışan paneli subdomain'i */
export function getEmployeeHost(): string | undefined {
  const v = process.env.NEXT_PUBLIC_EMPLOYEE_HOST?.trim().toLowerCase();
  return v || undefined;
}

/** fiyatgor subdomain — müşteri mağazası */
export const STORE_PATH = "/";

/** admin subdomain — admin paneli rotaları (/admin/*) */
export const ADMIN_PATH = "/admin";
export const ADMIN_LOGIN_PATH = `${ADMIN_PATH}/login`;
export const ADMIN_ENTRY_PATH = ADMIN_NAV[0].href;

/** personel subdomain — çalışan paneli rotaları (/yonetici/*) */
export const EMPLOYEE_PATH = "/yonetici";
export const EMPLOYEE_LOGIN_PATH = `${EMPLOYEE_PATH}/login`;
export const EMPLOYEE_ENTRY_PATH = EMPLOYEE_NAV[0].href;

export function isAdminPanelPath(pathname: string): boolean {
  return pathname === ADMIN_PATH || pathname.startsWith(`${ADMIN_PATH}/`);
}

export function isEmployeePanelPath(pathname: string): boolean {
  return pathname === EMPLOYEE_PATH || pathname.startsWith(`${EMPLOYEE_PATH}/`);
}

export function normalizeHost(host: string | null | undefined): string {
  return (host ?? "").split(":")[0].toLowerCase();
}

export function hostsConfigured(): boolean {
  return Boolean(getStoreHost() && getAdminHost() && getEmployeeHost());
}

export function isStoreHost(host: string): boolean {
  const store = getStoreHost();
  return store ? normalizeHost(host) === store : false;
}

export function isAdminHost(host: string): boolean {
  const admin = getAdminHost();
  return admin ? normalizeHost(host) === admin : false;
}

export function isEmployeeHost(host: string): boolean {
  const employee = getEmployeeHost();
  return employee ? normalizeHost(host) === employee : false;
}

export function externalUrl(host: string | undefined, path: string): string {
  if (!host) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `https://${host}${p}`;
}

export function getAdminLoginUrl(): string {
  return externalUrl(getAdminHost(), ADMIN_LOGIN_PATH);
}

export function getEmployeeLoginUrl(): string {
  return externalUrl(getEmployeeHost(), EMPLOYEE_LOGIN_PATH);
}

export function getStoreUrl(path = STORE_PATH): string {
  return externalUrl(getStoreHost(), path);
}

/** Client: mağaza linki yalnızca ayrı subdomain yokken gösterilir. */
export function shouldShowStoreLink(currentHost?: string): boolean {
  if (!getStoreHost()) return true;
  if (!currentHost) return false;
  return !isAdminHost(currentHost) && !isEmployeeHost(currentHost);
}
