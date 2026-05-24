"use client";

import BrandLogo from "@/components/BrandLogo";

interface AppHeaderProps {
  onMenuClick: () => void;
  menuOpen: boolean;
  productCount?: number | null;
  apiOnline?: boolean;
  cartCount?: number;
  onCartClick?: () => void;
}

export default function AppHeader({
  onMenuClick,
  menuOpen,
  productCount,
  apiOnline = true,
  cartCount = 0,
  onCartClick,
}: AppHeaderProps) {
  return (
    <header className="store-header">
      <div className="store-header-inner">
        <div className="flex min-w-0 items-center gap-2.5">
          <BrandLogo size="sm" priority />
        </div>

        <div className="flex items-center gap-2">
          {productCount != null && (
            <span
              className={`store-badge ${apiOnline ? "store-badge-ok" : "store-badge-off"}`}
              title={apiOnline ? "Katalog yüklü" : "Sunucu bağlantısı yok"}
            >
              <span className="store-badge-dot" />
              <span className="store-badge-count">
                {productCount.toLocaleString("tr-TR")}
              </span>
              <span className="store-badge-label">ürün</span>
            </span>
          )}

          {onCartClick && (
            <button
              type="button"
              onClick={onCartClick}
              className="store-cart-btn"
              aria-label={`Sepet (${cartCount})`}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {cartCount > 0 && <span className="store-cart-btn-badge">{cartCount}</span>}
            </button>
          )}

          <button
            type="button"
            onClick={onMenuClick}
            aria-label={menuOpen ? "Menüyü kapat" : "Menüyü aç"}
            aria-expanded={menuOpen}
            className="store-menu-btn"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              {menuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
