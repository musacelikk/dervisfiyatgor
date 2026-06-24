"use client";

import BrandLogo from "@/components/BrandLogo";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getHealth } from "@/lib/api";
import { fetchManagerSession, managerLogout } from "@/lib/manager-api";
import { getStoreUrl, shouldShowStoreLink } from "@/lib/domains";
import {
  EMPLOYEE_NAV,
  canAccessEmployeeNavItem,
  getEmployeePageTitle,
  isEmployeeNavActive,
} from "@/lib/employee-nav";
import type { EmployeeSession } from "@/types/employee";

const NAV_ICONS: Record<string, React.ReactNode> = {
  "/yonetici": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-18 0h2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM12 16h.01" />
    </svg>
  ),
  "/yonetici/sepet": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  "/yonetici/urunler": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  "/yonetici/katalog": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
};

export default function EmployeeShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<EmployeeSession | null>(null);
  const [productCount, setProductCount] = useState<number | null>(null);
  const [showStoreLink, setShowStoreLink] = useState(false);

  useEffect(() => {
    setShowStoreLink(shouldShowStoreLink(window.location.hostname));
  }, []);

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

  const visibleNav = EMPLOYEE_NAV.filter((item) => {
    if (!session) return item.permission === "scan";
    return canAccessEmployeeNavItem(session.permissions, item);
  });

  const pageTitle = getEmployeePageTitle(pathname);

  return (
    <div className="employee-layout">
      <header className="employee-header">
        <p className="employee-header-accent" aria-hidden />
        <div className="employee-header-main">
          <Link href="/yonetici" className="employee-header-brand">
            <BrandLogo size="sm" priority />
          </Link>

          <div className="employee-header-info">
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

          <div className="employee-header-actions">
            {showStoreLink && (
              <Link
                href={getStoreUrl()}
                className="employee-header-icon-btn employee-header-icon-store"
                title="Mağaza"
                aria-label="Mağaza"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </Link>
            )}
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

        {visibleNav.length > 1 && (
          <nav className="employee-topnav" aria-label="Personel menü">
            {visibleNav.map((item) => {
              const active = isEmployeeNavActive(pathname, item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`employee-topnav-link${active ? " employee-topnav-link-active" : ""}`}
                >
                  <span className="employee-topnav-icon">{NAV_ICONS[item.href]}</span>
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
            const active = isEmployeeNavActive(pathname, item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`employee-bottomnav-item${active ? " employee-bottomnav-item-active" : ""}`}
              >
                <span className="employee-bottomnav-icon">{NAV_ICONS[item.href]}</span>
                <span className="employee-bottomnav-label">{item.shortLabel}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
