"use client";

import { useCallback, useEffect, useState } from "react";
import {
  downloadExcelCatalog,
  fetchStockCountState,
  startStockCount,
  stopStockCount,
} from "@/lib/admin-api";
import type { StockCountState } from "@/types/product";

function formatStartedAt(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function SettingsPage() {
  const [stockCount, setStockCount] = useState<StockCountState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"start" | "stop" | "export" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportDone, setExportDone] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const state = await fetchStockCountState();
      setStockCount(state);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ayarlar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleStart = async () => {
    const message = stockCount?.active
      ? "Stok sayımı yeniden başlatılacak. Tüm ürün durumları sıfırlanır. Emin misiniz?"
      : "Stok sayımı başlatılacak. Ürün listesinde tüm satırlar soluk kırmızı görünecek. Emin misiniz?";

    if (!confirm(message)) return;

    setBusy("start");
    setError(null);
    try {
      const state = await startStockCount();
      setStockCount(state);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Stok sayımı başlatılamadı.");
    } finally {
      setBusy(null);
    }
  };

  const handleStop = async () => {
    if (!confirm("Stok sayımı bitecek ve tüm renk işaretleri kaldırılacak. Emin misiniz?")) {
      return;
    }

    setBusy("stop");
    setError(null);
    try {
      const state = await stopStockCount();
      setStockCount(state);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Stok sayımı bitirilemedi.");
    } finally {
      setBusy(null);
    }
  };

  const handleExport = async () => {
    setBusy("export");
    setError(null);
    setExportDone(false);
    try {
      await downloadExcelCatalog();
      setExportDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Excel indirilemedi.");
    } finally {
      setBusy(null);
    }
  };

  const countActive = Boolean(stockCount?.active);

  return (
    <div className="admin-page admin-page-wide">
      {error && <div className="admin-alert admin-alert-error">{error}</div>}

      <section className="admin-card settings-section">
        <div className="settings-section-head">
          <h2 className="admin-card-title">Stok sayımı</h2>
          <p className="settings-section-desc">
            Sayım sırasında stok yönetimindeki ürün satırları renklendirilir: henüz
            kontrol edilmeyenler soluk kırmızı, güncellenenler yeşil, değişiklik
            yapılmadan kaydedilenler turuncu.
          </p>
        </div>

        {loading ? (
          <p className="admin-muted text-sm">Durum yükleniyor…</p>
        ) : (
          <>
            <div className={`settings-count-status ${countActive ? "is-active" : ""}`}>
              <span className="settings-count-status-dot" aria-hidden />
              <div>
                <p className="settings-count-status-title">
                  {countActive ? "Stok sayımı devam ediyor" : "Stok sayımı kapalı"}
                </p>
                {countActive && stockCount?.startedAt && (
                  <p className="settings-count-status-meta">
                    Başlangıç: {formatStartedAt(stockCount.startedAt)}
                  </p>
                )}
              </div>
            </div>

            <div className="settings-action-row">
              <button
                type="button"
                className="admin-btn-primary"
                onClick={() => void handleStart()}
                disabled={busy !== null}
              >
                {busy === "start"
                  ? "Başlatılıyor…"
                  : countActive
                    ? "Stok sayımını yeniden başlat"
                    : "Stok sayımını başlat"}
              </button>

              {countActive && (
                <button
                  type="button"
                  className="admin-btn-secondary settings-btn-danger-outline"
                  onClick={() => void handleStop()}
                  disabled={busy !== null}
                >
                  {busy === "stop" ? "Bitiriliyor…" : "Stok sayımını bitir"}
                </button>
              )}
            </div>

            <ul className="settings-legend">
              <li>
                <span className="settings-legend-swatch settings-legend-pending" />
                Henüz kontrol edilmedi
              </li>
              <li>
                <span className="settings-legend-swatch settings-legend-updated" />
                Güncelleme yapıldı
              </li>
              <li>
                <span className="settings-legend-swatch settings-legend-unchanged" />
                Kaydedildi, değişiklik yok
              </li>
            </ul>
          </>
        )}
      </section>

      <section className="admin-card settings-section">
        <div className="settings-section-head">
          <h2 className="admin-card-title">Stok dışa aktarma</h2>
          <p className="settings-section-desc">
            Mevcut stok durumunu Excel olarak indirin.
          </p>
        </div>

        <div className="settings-action-row">
          <button
            type="button"
            className="admin-btn-secondary"
            onClick={() => void handleExport()}
            disabled={busy !== null}
          >
            {busy === "export" ? "İndiriliyor…" : "Mevcut stok durumunu Excel indir"}
          </button>
        </div>

        {exportDone && (
          <p className="settings-success text-sm">Excel dosyası indirildi.</p>
        )}
      </section>
    </div>
  );
}
