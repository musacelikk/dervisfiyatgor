"use client";

import BrandLogo from "@/components/BrandLogo";
import Link from "next/link";
import LoginForm from "@/components/LoginForm";
import { ADMIN_ENTRY_PATH, getStoreUrl, shouldShowStoreLink } from "@/lib/domains";
import { adminLogin } from "@/lib/admin-api";
import { useEffect, useState } from "react";

export default function AdminLoginPage() {
  const [showStoreLink, setShowStoreLink] = useState(false);

  useEffect(() => {
    setShowStoreLink(shouldShowStoreLink(window.location.hostname));
  }, []);
  return (
    <div className="flex min-h-full flex-1">
      <div className="relative hidden w-[42%] max-w-xl flex-col justify-between overflow-hidden bg-zinc-900 p-12 xl:p-14 lg:flex">
        <div className="absolute inset-0 bg-[linear-gradient(160deg,#18181b_0%,#27272a_50%,#3f1515_100%)]" />
        <div className="relative">
          <BrandLogo size="md" priority />
          <h2 className="mt-12 max-w-xs text-2xl font-bold leading-tight tracking-tight text-white xl:text-3xl">
            Mağaza ve katalog yönetimi
          </h2>
          <ul className="mt-8 space-y-3.5 text-sm text-zinc-400">
            <li className="flex gap-2">
              <span className="text-red-400">—</span>
              Excel ile ürün kataloğu
            </li>
            <li className="flex gap-2">
              <span className="text-red-400">—</span>
              Çalışan hesabı oluşturma
            </li>
            <li className="flex gap-2">
              <span className="text-red-400">—</span>
              Barkod fiyat ekranı
            </li>
          </ul>
        </div>
        <p className="relative text-xs text-zinc-500">Yalnızca yetkili yöneticiler</p>
      </div>

      <div className="flex flex-1 flex-col justify-center bg-[#ececef] px-4 py-10 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex justify-center lg:hidden">
            <BrandLogo size="md" />
          </div>
          <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-8 shadow-[0_12px_32px_rgb(0_0_0_/0.08)]">
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-accent to-red-400"
            />
            <LoginForm
              title="Admin girişi"
              subtitle="Yönetim paneline erişin"
              defaultRedirect={ADMIN_ENTRY_PATH}
              onLogin={adminLogin}
              embedded
              errorHint={
                <p className="text-xs text-red-600/90">
                  Yönetici şifrenizi girin.
                </p>
              }
            />
          </div>
          {showStoreLink && (
            <Link
              href={getStoreUrl()}
              className="mt-5 block text-center text-sm font-medium text-zinc-500 transition hover:text-accent"
            >
              ← Mağaza arayüzüne dön
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
