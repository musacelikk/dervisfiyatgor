"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { managerLogout } from "@/lib/manager-api";

interface ManagerHeaderProps {
  productCount?: number | null;
}

export default function ManagerHeader({ productCount }: ManagerHeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await managerLogout();
    router.push("/yonetici/login");
    router.refresh();
  };

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
          <span className="inline-block rounded-md bg-zinc-900 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-400">
            Yönetici
          </span>
          {productCount !== null && productCount !== undefined && (
            <p className="mt-0.5 truncate text-[10px] text-zinc-500">
              {productCount.toLocaleString("tr-TR")} ürün
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Link
            href="/"
            className="rounded-full px-2.5 py-2 text-[11px] font-medium text-zinc-600 ring-1 ring-zinc-200 transition hover:bg-zinc-50"
          >
            Mağaza
          </Link>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="rounded-full px-2.5 py-2 text-[11px] font-medium text-zinc-600 ring-1 ring-zinc-200 transition hover:bg-zinc-50"
          >
            Çıkış
          </button>
        </div>
      </div>
    </header>
  );
}
