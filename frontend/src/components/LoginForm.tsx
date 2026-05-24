"use client";

import BrandLogo from "@/components/BrandLogo";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type ReactNode } from "react";

type LoginFormProps = {
  title: string;
  subtitle: string;
  defaultRedirect: string;
  onLogin: (password: string) => Promise<void>;
  variant?: "default" | "manager";
  embedded?: boolean;
  errorHint?: ReactNode;
};

function LoginFormInner({
  title,
  subtitle,
  defaultRedirect,
  onLogin,
  variant = "default",
  embedded = false,
  errorHint,
}: LoginFormProps) {
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
      await onLogin(password);
      const from = searchParams.get("from") || defaultRedirect;
      router.push(from);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Giriş başarısız.");
    } finally {
      setLoading(false);
    }
  };

  const Wrapper = embedded ? "div" : "main";
  const wrapperClass = embedded
    ? ""
    : "mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-10";

  return (
    <Wrapper className={wrapperClass}>
      {!embedded && variant === "manager" ? (
        <div className="mb-10 flex flex-col items-center">
          <BrandLogo size="lg" priority />
          <span className="mt-6 inline-block rounded-md bg-zinc-900 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
            Yönetici girişi
          </span>
        </div>
      ) : !embedded ? (
        <div className="mb-8 flex justify-center">
          <BrandLogo size="xl" priority />
        </div>
      ) : null}

      <div className={embedded ? "" : "app-card p-6"}>
        <h1 className="text-lg font-semibold text-zinc-900">{title}</h1>
        <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>

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
            <div className="space-y-1 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200/80">
              <p>{error}</p>
              {errorHint}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="btn-primary"
          >
            {loading ? "Giriş yapılıyor…" : "Giriş yap"}
          </button>
        </form>
      </div>

      {!embedded && (
        <Link
          href="/"
          className="mt-6 block text-center text-sm font-medium text-zinc-500 transition hover:text-accent"
        >
          ← Mağaza arayüzüne dön
        </Link>
      )}
    </Wrapper>
  );
}

export default function LoginForm(props: LoginFormProps) {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 items-center justify-center p-8 text-sm text-zinc-500">
          Yükleniyor…
        </main>
      }
    >
      <LoginFormInner {...props} />
    </Suspense>
  );
}
