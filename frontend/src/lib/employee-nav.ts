import { hasPermission, type PermissionId } from "./permissions";

export type EmployeeNavItem = {
  href: string;
  label: string;
  shortLabel: string;
  permission: PermissionId;
  exact: boolean;
  altPermission?: PermissionId;
};

/** Personel paneli menüsü — subdomain: personel.*, URL yolu: /yonetici/* */
export const EMPLOYEE_NAV: EmployeeNavItem[] = [
  {
    href: "/yonetici",
    label: "Fiyat gör",
    shortLabel: "Fiyat",
    permission: "scan",
    exact: true,
  },
  {
    href: "/yonetici/sepet",
    label: "Siparişler",
    shortLabel: "Sipariş",
    permission: "orders.view",
    exact: false,
  },
  {
    href: "/yonetici/urunler",
    label: "Ürünler",
    shortLabel: "Ürünler",
    permission: "products.view",
    exact: false,
  },
  {
    href: "/yonetici/katalog",
    label: "Excel",
    shortLabel: "Excel",
    permission: "excel.download",
    exact: false,
    altPermission: "excel.upload",
  },
];

export function isEmployeeNavActive(pathname: string, href: string, exact: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function canAccessEmployeeNavItem(
  permissions: PermissionId[],
  item: EmployeeNavItem
): boolean {
  if (hasPermission(permissions, item.permission)) return true;
  if (item.altPermission && hasPermission(permissions, item.altPermission)) return true;
  return false;
}

/** Giriş sonrası veya yetkisiz /yonetici ziyaretinde yönlenecek ilk erişilebilir sayfa. */
export function resolveEmployeeHomePath(permissions: PermissionId[]): string {
  for (const item of EMPLOYEE_NAV) {
    if (canAccessEmployeeNavItem(permissions, item)) return item.href;
  }
  return "/yonetici/login";
}

export function getEmployeePageTitle(pathname: string): string {
  const match = EMPLOYEE_NAV.find((item) => isEmployeeNavActive(pathname, item.href, item.exact));
  if (match) return match.label;
  return "Çalışan paneli";
}
