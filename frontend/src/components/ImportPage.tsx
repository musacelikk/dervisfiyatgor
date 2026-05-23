"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getHealth } from "@/lib/api";
import { adminImportExcel } from "@/lib/admin-api";
import type { ImportResult } from "@/types/product";

export default function ImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [replace, setReplace] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [productCount, setProductCount] = useState<number | null>(null);
  const [apiOnline, setApiOnline] = useState(true);

  const refreshCount = useCallback(async () => {
    try {
      const health = await getHealth();
      setProductCount(health.productCount);
      setApiOnline(true);
    } catch {
      setProductCount(null);
      setApiOnline(false);
    }
  }, []);

  useEffect(() => {
    void refreshCount();
  }, [refreshCount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await adminImportExcel(file, replace);
      setResult(data);
      setProductCount(data.productCount);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yükleme başarısız.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-5 pb-10">
      <h1 className="text-xl font-semibold text-zinc-900">Excel yükle</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Ürün kataloğunu güncelleyin. Mağaza bu veriyi kullanır.
      </p>

      {!apiOnline && (
        <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200/80">
          Backend&apos;e bağlanılamıyor. API sunucusunun çalıştığından emin olun.
        </p>
      )}

      <div className="app-card mt-5 p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Katalogdaki ürün
        </p>
        <p className="mt-1 text-4xl font-bold tabular-nums text-zinc-900">
          {productCount === null ? "—" : productCount.toLocaleString("tr-TR")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="app-card mt-4 space-y-5 p-5">
        <div>
          <label className="mb-2 block text-xs font-medium text-zinc-600">
            Excel dosyası
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-accent-dark"
          />
          <p className="mt-2 text-xs text-zinc-400">.xlsx, .xls veya .csv — en fazla 20 MB</p>
          {file && (
            <p className="mt-2 text-xs font-medium text-zinc-700">
              Seçili: {file.name}
            </p>
          )}
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200/80">
          <input
            type="checkbox"
            checked={replace}
            onChange={(e) => setReplace(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 rounded border-amber-400 text-accent"
          />
          <span className="text-sm text-amber-950">
            <strong>Mevcut ürünleri sil</strong> ve dosyadan tamamen yeniden yükle
          </span>
        </label>

        <button
          type="submit"
          disabled={!file || loading || !apiOnline}
          className="btn-primary"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Yükleniyor…
            </>
          ) : (
            "İçe aktar"
          )}
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200/80">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-4 space-y-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-950 ring-1 ring-emerald-200/80">
          <p className="font-semibold">
            {result.imported.toLocaleString("tr-TR")} ürün içe aktarıldı
          </p>
          <p className="text-zinc-700">
            Toplam satır: {result.totalRows.toLocaleString("tr-TR")} · Atlanan:{" "}
            {result.skipped.toLocaleString("tr-TR")}
          </p>
          <p className="text-zinc-600">
            Veritabanında: {result.productCount.toLocaleString("tr-TR")} ürün
          </p>
        </div>
      )}

      <section className="app-card mt-6 p-4 text-sm text-zinc-600">
        <h2 className="mb-2 font-semibold text-zinc-900">Excel kolonları</h2>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:text-sm">
          <li>Stok Kodu</li>
          <li>Barkodu</li>
          <li>Stok Adı</li>
          <li>Satış Fiyatı 1</li>
          <li>Satış Fiyatı 2</li>
          <li>Kalan Miktar</li>
          <li>Birimi</li>
          <li>Açıklama 1</li>
          <li>Açıklama 2</li>
          <li className="col-span-2">Grubu</li>
        </ul>
        <p className="mt-2 text-xs text-zinc-400">
          Alış Fiyatı 1 / 2 opsiyonel — yönetici ekranında gösterilir, mağazada gösterilmez.
        </p>
      </section>
    </main>
  );
}
