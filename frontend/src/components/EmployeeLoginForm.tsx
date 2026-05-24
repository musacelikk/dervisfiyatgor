"use client";

import BrandLogo from "@/components/BrandLogo";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { EMPLOYEE_ENTRY_PATH, getStoreUrl, shouldShowStoreLink } from "@/lib/domains";
import {
  readEmployeeRememberPref,
  writeEmployeeRememberPref,
} from "@/lib/employee-remember";
import { managerLogin } from "@/lib/manager-api";

function EmployeeLoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showStoreLink, setShowStoreLink] = useState(false);

  useEffect(() => {
    setShowStoreLink(shouldShowStoreLink(window.location.hostname));
    setRememberMe(readEmployeeRememberPref());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      writeEmployeeRememberPref(rememberMe);
      await managerLogin(username, password, rememberMe);
      const from = searchParams.get("from") || EMPLOYEE_ENTRY_PATH;
      router.push(from);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Giriş başarısız.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="employee-login-page">
      <div className="employee-login-wrap">
        <div className="mb-8 text-center">
          <BrandLogo size="lg" priority className="mx-auto" />
          <p className="mt-4 inline-block rounded-full bg-zinc-900 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-400">
            Çalışan paneli
          </p>
        </div>

        <div className="employee-login-card">
          <h1 className="text-lg font-semibold text-zinc-900">Giriş yap</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Admin tarafından verilen kullanıcı adı ve şifre ile giriş yapın.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">
                Kullanıcı adı
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm outline-none focus:border-zinc-400 focus:bg-white"
                autoComplete="username"
                autoFocus
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Şifre</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm outline-none focus:border-zinc-400 focus:bg-white"
                autoComplete="current-password"
                required
              />
            </div>

            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-accent focus:ring-accent/30"
              />
              Beni hatırla (1 gün)
            </label>

            {error && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200/80">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="btn-primary"
            >
              {loading ? "Giriş yapılıyor…" : "Panele gir"}
            </button>
          </form>
        </div>

        {showStoreLink && (
          <Link
            href={getStoreUrl()}
            className="mt-6 block text-center text-sm font-medium text-zinc-500 transition hover:text-accent"
          >
            ← Mağaza arayüzüne dön
          </Link>
        )}
      </div>
    </main>
  );
}

export default function EmployeeLoginForm() {
  return (
    <Suspense
      fallback={
        <main className="employee-login-page flex items-center justify-center p-8 text-sm text-zinc-500">
          Yükleniyor…
        </main>
      }
    >
      <EmployeeLoginFormInner />
    </Suspense>
  );
}
