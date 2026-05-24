"use client";

import BrandLogo from "@/components/BrandLogo";
import Link from "next/link";
import LoginForm from "@/components/LoginForm";
import { adminLogin } from "@/lib/admin-api";

export default function AdminLoginPage() {
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
          <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
            <LoginForm
              title="Admin girişi"
              subtitle="Yönetim paneline erişin"
              defaultRedirect="/admin"
              onLogin={adminLogin}
              embedded
              errorHint={
                <p className="text-xs text-red-600/90">
                  Yönetici şifrenizi girin.
                </p>
              }
            />
          </div>
          <Link
            href="/"
            className="mt-5 block text-center text-sm font-medium text-zinc-500 transition hover:text-accent"
          >
            ← Mağaza arayüzüne dön
          </Link>
        </div>
      </div>
    </div>
  );
}
