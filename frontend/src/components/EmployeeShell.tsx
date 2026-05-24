"use client";

import BrandLogo from "@/components/BrandLogo";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getHealth } from "@/lib/api";
import { fetchManagerSession, managerLogout } from "@/lib/manager-api";
import { hasPermission } from "@/lib/permissions";
import type { EmployeeSession } from "@/types/employee";

const NAV_ITEMS = [
  {
    href: "/yonetici",
    label: "Fiyat gör",
    shortLabel: "Fiyat",
    permission: "scan" as const,
    exact: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-18 0h2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM12 16h.01" />
      </svg>
    ),
  },
  {
    href: "/yonetici/sepet",
    label: "Siparişler",
    shortLabel: "Sipariş",
    permission: "orders.view" as const,
    exact: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    href: "/yonetici/urunler",
    label: "Ürünler",
    shortLabel: "Ürünler",
    permission: "products.view" as const,
    exact: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    href: "/yonetici/katalog",
    label: "Excel",
    shortLabel: "Excel",
    permission: "excel.download" as const,
    exact: false,
    altPermission: "excel.upload" as const,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

const PAGE_TITLES: Record<string, string> = {
  "/yonetici": "Fiyat gör",
  "/yonetici/sepet": "Siparişler",
  "/yonetici/urunler": "Ürünler",
  "/yonetici/katalog": "Excel",
};

function isActive(pathname: string, href: string, exact: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  for (const [path, title] of Object.entries(PAGE_TITLES)) {
    if (path !== "/yonetici" && pathname.startsWith(path)) return title;
  }
  return "Çalışan paneli";
}

export default function EmployeeShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<EmployeeSession | null>(null);
  const [productCount, setProductCount] = useState<number | null>(null);

  const refreshHealth = useCallback(async () => {
    try {
      const h = await getHealth();
      setProductCount(h.productCount);
    } catch {
      setProductCount(null);
    }
  }, []);

  useEffect(() => {
    void fetchManagerSession().then(setSession);
    void refreshHealth();
  }, [refreshHealth]);

  const handleLogout = async () => {
    await managerLogout();
    router.push("/yonetici/login");
    router.refresh();
  };

  const visibleNav = NAV_ITEMS.filter((item) => {
    if (!session) return item.permission === "scan";
    if (hasPermission(session.permissions, item.permission)) return true;
    if ("altPermission" in item && item.altPermission) {
      return hasPermission(session.permissions, item.altPermission);
    }
    return false;
  });

  const pageTitle = getPageTitle(pathname);

  return (
    <div className="employee-layout">
      <header className="employee-header">
        <p className="employee-header-accent" aria-hidden />
        <div className="employee-header-top">
          <Link href="/yonetici" className="employee-header-brand">
            <BrandLogo size="sm" priority />
          </Link>

          <div className="employee-header-actions">
            <Link
              href="/"
              className="employee-header-icon-btn employee-header-icon-store"
              title="Mağaza"
              aria-label="Mağaza"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </Link>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="employee-header-icon-btn"
              title="Çıkış"
              aria-label="Çıkış"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>

        <div className="employee-header-meta">
          <h1 className="employee-header-title">{pageTitle}</h1>
          <p className="employee-header-sub">
            <span className="employee-header-user">{session?.name ?? "Çalışan"}</span>
            {productCount != null && (
              <span className="employee-header-count">
                {productCount.toLocaleString("tr-TR")} ürün
              </span>
            )}
          </p>
        </div>

        {visibleNav.length > 1 && (
          <nav className="employee-topnav" aria-label="Personel menü">
            {visibleNav.map((item) => {
              const active = isActive(pathname, item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`employee-topnav-link${active ? " employee-topnav-link-active" : ""}`}
                >
                  <span className="employee-topnav-icon">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      <div className="employee-main">{children}</div>

      {visibleNav.length > 1 && (
        <nav className="employee-bottomnav" aria-label="Hızlı menü">
          {visibleNav.map((item) => {
            const active = isActive(pathname, item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`employee-bottomnav-item${active ? " employee-bottomnav-item-active" : ""}`}
              >
                <span className="employee-bottomnav-icon">{item.icon}</span>
                <span>{item.shortLabel}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
