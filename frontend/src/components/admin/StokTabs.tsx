"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const STOCK_TABS = [
  { href: "/admin/stok/urunler", label: "Ürün listesi" },
  { href: "/admin/stok/kategoriler", label: "Kategoriler" },
  { href: "/admin/stok/katalog", label: "Excel / Katalog" },
] as const;

export default function StokTabs({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="admin-stok-shell">
      <div className="admin-stok-tabs-bar">
        <nav className="admin-segment-tabs" aria-label="Stok alt menü">
          {STOCK_TABS.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`admin-segment-tab ${active ? "admin-segment-tab-active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="admin-stok-content">{children}</div>
    </div>
  );
}
