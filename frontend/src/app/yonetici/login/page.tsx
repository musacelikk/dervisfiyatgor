"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { managerLogin } from "@/lib/manager-api";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await managerLogin(password);
      const from = searchParams.get("from") || "/yonetici";
      router.push(from);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Giriş başarısız.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-10">
      <div className="mb-10 flex flex-col items-center overflow-visible">
        <div className="relative h-20 w-full max-w-[16rem]">
          <Image
            src="/dervismobil-logo.png"
            alt="DervişMobil"
            width={500}
            height={500}
            priority
            className="absolute left-1/2 top-1/2 h-10 w-auto -translate-x-1/2 -translate-y-1/2 scale-[4] object-contain"
          />
        </div>
        <span className="mt-6 inline-block rounded-md bg-zinc-900 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
          Yönetici girişi
        </span>
      </div>

      <div className="app-card p-6">
        <h1 className="text-lg font-semibold text-zinc-900">Giriş</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Alış ve satış fiyatlarını görüntüleyin
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">
              Şifre
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl bg-zinc-50 px-3.5 py-2.5 text-sm ring-1 ring-zinc-200 outline-none focus:bg-white focus:ring-2 focus:ring-accent/30"
              autoComplete="current-password"
              autoFocus
              required
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200/80">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading || !password} className="btn-primary">
            {loading ? "Giriş yapılıyor…" : "Giriş yap"}
          </button>
        </form>
      </div>

      <Link
        href="/"
        className="mt-6 block text-center text-sm font-medium text-zinc-500 transition hover:text-accent"
      >
        ← Mağaza arayüzüne dön
      </Link>
    </main>
  );
}

export default function YoneticiLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 items-center justify-center p-8 text-sm text-zinc-500">
          Yükleniyor…
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
