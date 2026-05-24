"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getHealth } from "@/lib/api";
import {
  adminImportExcel,
  downloadExcelCatalog,
  downloadExcelTemplate,
} from "@/lib/admin-api";
import {
  hasPermission,
  type PermissionId,
} from "@/lib/permissions";
import {
  managerDownloadExcelCatalog,
  managerDownloadExcelTemplate,
  managerImportExcel,
} from "@/lib/manager-api";
import type { ImportResult } from "@/types/product";

const EXCEL_COLUMNS = [
  "Stok Kodu",
  "Barkodu",
  "Stok Adı",
  "Satış Fiyatı 1",
  "Satış Fiyatı 2",
  "Alış Fiyatı 1",
  "Alış Fiyatı 2",
  "Kalan Miktar",
  "Birimi",
  "Açıklama 1",
  "Açıklama 2",
  "Grubu",
];

interface ImportPageProps {
  mode?: "admin" | "employee";
  permissions?: PermissionId[];
}

export default function ImportPage({
  mode = "admin",
  permissions = [],
}: ImportPageProps) {
  const isEmployee = mode === "employee";
  const canDownload = !isEmployee || hasPermission(permissions, "excel.download");
  const canUpload = !isEmployee || hasPermission(permissions, "excel.upload");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [replace, setReplace] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<"template" | "catalog" | null>(null);
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

  const handleDownload = async (type: "template" | "catalog") => {
    setDownloading(type);
    setError(null);
    try {
      if (isEmployee) {
        if (type === "template") await managerDownloadExcelTemplate();
        else await managerDownloadExcelCatalog();
      } else {
        if (type === "template") await downloadExcelTemplate();
        else await downloadExcelCatalog();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "İndirme başarısız.");
    } finally {
      setDownloading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = isEmployee
        ? await managerImportExcel(file, replace)
        : await adminImportExcel(file, replace);
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
    <div className={`admin-page${isEmployee ? " employee-page" : ""}`}>
      {!apiOnline && (
        <div className="admin-alert admin-alert-error">Backend&apos;e bağlanılamıyor.</div>
      )}

      <div className="admin-import-layout">
        <div className="space-y-4">
          <div className="admin-stat-card">
            <p className="admin-stat-label">Katalogdaki ürün</p>
            <p className="admin-stat-value">
              {productCount === null ? "—" : productCount.toLocaleString("tr-TR")}
            </p>
          </div>

          {canDownload && (
          <section className="admin-card space-y-4">
            <h2 className="admin-card-title">Excel indir</h2>
            <p className="text-sm text-zinc-500">
              Boş şablonu indirip doldurun veya mevcut kataloğu düzenlemek için dışa aktarın.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={!apiOnline || downloading !== null}
                onClick={() => void handleDownload("template")}
                className="admin-btn-secondary flex items-center justify-center gap-2 py-3"
              >
                {downloading === "template" ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
                ) : (
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 18h16" />
                  </svg>
                )}
                Boş şablon (.xlsx)
              </button>
              <button
                type="button"
                disabled={!apiOnline || downloading !== null || productCount === 0}
                onClick={() => void handleDownload("catalog")}
                className="admin-btn-secondary flex items-center justify-center gap-2 py-3"
              >
                {downloading === "catalog" ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
                ) : (
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 18h16" />
                  </svg>
                )}
                Mevcut katalog
              </button>
            </div>
            {productCount === 0 && (
              <p className="text-xs text-zinc-400">
                Katalog boşken yalnızca şablon indirilebilir.
              </p>
            )}
          </section>
          )}

          {canUpload && (
          <form onSubmit={handleSubmit} className="admin-card space-y-5">
            <h2 className="admin-card-title">Excel yükle</h2>

            <div>
              <label className="admin-label">Dosya seç</label>
              <div className="mt-2 rounded-lg border-2 border-dashed border-zinc-200 bg-zinc-50 p-6 text-center transition hover:border-zinc-300 hover:bg-white">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-zinc-600 file:mx-auto file:rounded-lg file:border-0 file:bg-accent file:px-5 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-accent-dark"
                />
                <p className="mt-3 text-xs text-zinc-400">
                  .xlsx, .xls veya .csv
                </p>
                {file && (
                  <p className="mt-2 text-sm font-medium text-zinc-800">{file.name}</p>
                )}
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/80 p-4">
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
              className="admin-btn-primary w-full"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Yükleniyor… (büyük dosyalarda 1–2 dk sürebilir)
                </>
              ) : (
                "İçe aktar"
              )}
            </button>
            {loading && (
              <p className="text-center text-xs text-zinc-500">
                Ürünler veritabanına yazılıyor, lütfen sayfayı kapatmayın.
              </p>
            )}
          </form>
          )}

          {!canDownload && !canUpload && (
            <div className="admin-card text-sm text-zinc-600">
              Excel işlemleri için yetkiniz bulunmuyor.
            </div>
          )}

          {error && <div className="admin-alert admin-alert-error">{error}</div>}

          {result && (
            <div className="admin-card border-emerald-200 bg-emerald-50/50 text-sm text-emerald-950">
              <p className="font-semibold">
                {result.imported.toLocaleString("tr-TR")} ürün içe aktarıldı
              </p>
              <p className="mt-1 text-zinc-700">
                Toplam satır: {result.totalRows.toLocaleString("tr-TR")} · Atlanan:{" "}
                {result.skipped.toLocaleString("tr-TR")}
              </p>
              <p className="text-zinc-600">
                Veritabanında: {result.productCount.toLocaleString("tr-TR")} ürün
              </p>
            </div>
          )}
        </div>

        <aside className="admin-card h-fit">
          <h2 className="admin-card-title">Kolonlar</h2>
          <p className="mt-2 text-sm text-zinc-500">
            İndirilen dosyada başlık satırı bu sıradadır.
          </p>
          <ul className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto">
            {EXCEL_COLUMNS.map((col) => (
              <li
                key={col}
                className="flex items-center gap-2 rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-700"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                {col}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
