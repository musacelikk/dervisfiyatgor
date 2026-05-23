"use client";

import Image from "next/image";
import Link from "next/link";

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
}

export default function MobileMenu({ open, onClose }: MobileMenuProps) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Menüyü kapat"
        className="fixed inset-0 z-40 bg-zinc-900/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-[min(100%,300px)] flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <Image
            src="/dervismobil-logo.png"
            alt="DervişMobil"
            width={500}
            height={500}
            className="h-8 w-auto object-contain"
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-zinc-500 transition hover:bg-zinc-100"
            aria-label="Kapat"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex flex-1 flex-col justify-end gap-2 p-5">
          <Link
            href="/yonetici/login"
            className="block rounded-xl bg-zinc-900 px-4 py-3.5 text-center text-sm font-semibold text-white transition hover:bg-zinc-800"
            onClick={onClose}
          >
            Yönetici girişi
          </Link>
          <Link
            href="/admin/login"
            className="block rounded-xl bg-zinc-50 px-4 py-3.5 text-center text-sm font-semibold text-zinc-800 ring-1 ring-zinc-200 transition hover:bg-zinc-100"
            onClick={onClose}
          >
            Admin paneli
          </Link>
        </div>
      </aside>
    </>
  );
}
