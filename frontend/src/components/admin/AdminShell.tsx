"use client";

import BrandLogo from "@/components/BrandLogo";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { adminLogout } from "@/lib/admin-api";
import { ADMIN_ENTRY_PATH, getStoreUrl, shouldShowStoreLink } from "@/lib/domains";
import { ADMIN_NAV, getAdminNavPage, getAdminPageDescription, isAdminNavActive } from "@/lib/admin-nav";
import { IconLogout, IconStore } from "./AdminIcons";

function SidebarNav({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="admin-sidebar-nav" aria-label="Ana menü">
      <p className="admin-sidebar-section">Menü</p>
      <ul className="admin-sidebar-list">
        {ADMIN_NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = isAdminNavActive(pathname, href, exact);
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavigate}
                className={`admin-nav-item ${active ? "admin-nav-item-active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <span className="admin-nav-icon">
                  <Icon />
                </span>
                <span className="admin-nav-label">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const current = getAdminNavPage(pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showStoreLink, setShowStoreLink] = useState(false);

  useEffect(() => {
    setShowStoreLink(shouldShowStoreLink(window.location.hostname));
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    await adminLogout();
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <div className="admin-layout">
      {menuOpen && (
        <button
          type="button"
          className="admin-sidebar-backdrop"
          aria-label="Menüyü kapat"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside className={`admin-sidebar ${menuOpen ? "admin-sidebar-open" : ""}`}>
        <div className="admin-sidebar-inner">
          <div className="admin-sidebar-brand">
            <Link href={ADMIN_ENTRY_PATH} className="admin-sidebar-logo" onClick={() => setMenuOpen(false)}>
              <BrandLogo size="sm" priority />
            </Link>
            <span className="admin-sidebar-badge">Yönetim</span>
          </div>

          <SidebarNav pathname={pathname} onNavigate={() => setMenuOpen(false)} />

          <div className="admin-sidebar-footer">
            {showStoreLink && (
              <Link
                href={getStoreUrl()}
                className="admin-nav-item admin-nav-item-muted"
                onClick={() => setMenuOpen(false)}
              >
                <span className="admin-nav-icon">
                  <IconStore />
                </span>
                <span className="admin-nav-label">Mağaza arayüzü</span>
              </Link>
            )}
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="admin-nav-item admin-nav-item-logout"
            >
              <span className="admin-nav-icon">
                <IconLogout />
              </span>
              <span className="admin-nav-label">Çıkış yap</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="admin-content-column">
        <header className="admin-topbar">
          <div className="admin-topbar-start">
            <button
              type="button"
              className="admin-topbar-menu"
              aria-label={menuOpen ? "Menüyü kapat" : "Menüyü aç"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>

            <div className="admin-topbar-heading">
              <nav className="admin-breadcrumb" aria-label="Konum">
                <Link href="/admin">Admin</Link>
                <span className="admin-breadcrumb-sep" aria-hidden>/</span>
                <span>{current.label}</span>
              </nav>
              <h1 className="admin-topbar-title">{current.label}</h1>
              <p className="admin-topbar-desc">
                {getAdminPageDescription(pathname, current.description)}
              </p>
            </div>
          </div>
        </header>

        <main className="admin-main">{children}</main>

        <nav className="admin-bottomnav" aria-label="Hızlı menü">
          {ADMIN_NAV.map(({ href, shortLabel, icon: Icon, exact }) => {
            const active = isAdminNavActive(pathname, href, exact);
            return (
              <Link
                key={href}
                href={href}
                className={`admin-bottomnav-item ${active ? "admin-bottomnav-item-active" : ""}`}
              >
                <span className="admin-bottomnav-icon">
                  <Icon className="h-[1.125rem] w-[1.125rem]" />
                </span>
                <span>{shortLabel}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
