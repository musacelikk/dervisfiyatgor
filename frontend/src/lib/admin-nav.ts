import type { ComponentType } from "react";
import {
  IconAttendance,
  IconCart,
  IconCatalog,
  IconDashboard,
  IconLogs,
  IconSettings,
  IconStock,
  IconUsers,
  IconWallet,
} from "@/components/admin/AdminIcons";

export type AdminNavItem = {
  href: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  exact: boolean;
};

export const ADMIN_NAV: AdminNavItem[] = [
  {
    href: "/admin",
    label: "Anasayfa",
    shortLabel: "Ana",
    description: "Genel durum ve hızlı erişim",
    icon: IconDashboard,
    exact: true,
  },
  {
    href: "/admin/stok",
    label: "Stok yönetimi",
    shortLabel: "Stok",
    description: "Ürün listesi ve Excel katalog yönetimi",
    icon: IconStock,
    exact: false,
  },
  {
    href: "/admin/sepet",
    label: "Sepet yönetimi",
    shortLabel: "Sepet",
    description: "Mağaza sepet siparişleri",
    icon: IconCart,
    exact: false,
  },
  {
    href: "/admin/toplu-siparisler",
    label: "Toplu siparişler",
    shortLabel: "Toplu",
    description: "Satış kataloğundan oluşturulan müşteri siparişleri",
    icon: IconCatalog,
    exact: false,
  },
  {
    href: "/admin/giderler",
    label: "Giderler",
    shortLabel: "Gider",
    description: "Gider defteri, kategoriler ve ödeyen kişiler",
    icon: IconWallet,
    exact: false,
  },
  {
    href: "/admin/yoklama",
    label: "Yoklama",
    shortLabel: "Yoklama",
    description: "Mesai girişleri, tam/yarım gün ve raporlar",
    icon: IconAttendance,
    exact: false,
  },
  {
    href: "/admin/personel",
    label: "Personel yönetimi",
    shortLabel: "Personel",
    description: "Çalışan hesapları ve yetkiler",
    icon: IconUsers,
    exact: false,
  },
  {
    href: "/admin/loglar",
    label: "Loglar",
    shortLabel: "Log",
    description: "Sistem, giriş ve işlem kayıtları",
    icon: IconLogs,
    exact: false,
  },
  {
    href: "/admin/ayarlar",
    label: "Ayarlar",
    shortLabel: "Ayar",
    description: "Mağaza ve uygulama ayarları",
    icon: IconSettings,
    exact: false,
  },
];

export function isAdminNavActive(pathname: string, href: string, exact: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getAdminNavPage(pathname: string): AdminNavItem {
  return ADMIN_NAV.find((item) => isAdminNavActive(pathname, item.href, item.exact)) ?? ADMIN_NAV[0];
}

export function getAdminPageDescription(pathname: string, fallback: string): string {
  if (pathname.startsWith("/admin/stok/urunler")) {
    return "Ürünleri arayın, ekleyin ve düzenleyin";
  }
  if (pathname.startsWith("/admin/stok/kategoriler")) {
    return "Satış kataloğu kategorilerini oluşturun ve düzenleyin";
  }
  if (pathname.startsWith("/admin/stok/katalog")) {
    return "Excel ile toplu katalog yükleyin veya indirin";
  }
  if (pathname.startsWith("/admin/loglar")) {
    return "Giriş, stok ve sorgu aktivitelerinin detaylı kayıtları";
  }
  return fallback;
}
