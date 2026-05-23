"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { adminLogout } from "@/lib/admin-api";

export default function AdminNav() {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await adminLogout();
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/95 backdrop-blur-md">
      <nav className="mx-auto flex h-14 max-w-lg items-center justify-between gap-3 px-4">
        <Link href="/admin/import" className="relative h-14 w-[7.5rem] shrink-0">
          <Image
            src="/dervismobil-logo.png"
            alt="DervişMobil"
            width={500}
            height={500}
            className="absolute left-0 top-1/2 h-8 w-auto origin-left -translate-y-1/2 scale-[1.75] object-contain"
          />
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/admin/import"
            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition sm:px-3 sm:text-sm ${
              pathname === "/admin/import"
                ? "bg-accent-soft text-accent"
                : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            Excel
          </Link>
          <Link
            href="/"
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 sm:text-sm"
          >
            Mağaza
          </Link>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-500 ring-1 ring-zinc-200 transition hover:bg-zinc-50 sm:text-sm"
          >
            Çıkış
          </button>
        </div>
      </nav>
    </header>
  );
}
