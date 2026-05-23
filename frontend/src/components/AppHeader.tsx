"use client";

import Image from "next/image";

interface AppHeaderProps {
  onMenuClick: () => void;
  menuOpen: boolean;
  productCount?: number | null;
}

export default function AppHeader({
  onMenuClick,
  menuOpen,
  productCount,
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-20 shrink-0 overflow-visible border-b border-zinc-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-md items-center gap-2 overflow-visible px-4">
        <div className="relative z-10 h-14 w-[13rem] shrink-0">
          <Image
            src="/dervismobil-logo.png"
            alt="DervişMobil"
            width={500}
            height={500}
            priority
            className="absolute left-0 top-1/2 h-10 w-auto origin-left -translate-y-1/2 scale-[4] object-contain"
          />
        </div>

        <div className="min-w-0 flex-1">
          {productCount !== null && productCount !== undefined && (
            <p className="truncate text-xs text-zinc-500">
              <span className="font-semibold text-zinc-800">
                {productCount.toLocaleString("tr-TR")}
              </span>{" "}
              ürün kayıtlı
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onMenuClick}
          aria-label={menuOpen ? "Menüyü kapat" : "Menüyü aç"}
          aria-expanded={menuOpen}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-600 ring-1 ring-zinc-200 transition hover:bg-zinc-50 hover:text-zinc-900"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {menuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>
    </header>
  );
}
