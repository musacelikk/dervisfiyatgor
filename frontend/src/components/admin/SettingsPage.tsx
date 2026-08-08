"use client";

import { useCallback, useEffect, useState } from "react";
import {
  downloadExcelCatalog,
  fetchStockCountState,
  startStockCount,
  stopStockCount,
} from "@/lib/admin-api";
import {
  addClosedDay,
  fetchAdminSettings,
  fetchClosedDays,
  removeClosedDay,
  saveAdminSettings,
} from "@/lib/attendance-api";
import type { StockCountState } from "@/types/product";
import {
  WEEKDAY_LABELS,
  type AttendanceSettings,
  type ClosedDay,
  type ClosedDayType,
} from "@/types/shift";

function formatClosedDayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  if (!y || !m || !d) return dateStr;
  return `${d}.${m}.${y}`;
}

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
  const [showPrices, setShowPrices] = useState<boolean | null>(null);
  const [priceBusy, setPriceBusy] = useState(false);

  const [closedDays, setClosedDays] = useState<ClosedDay[]>([]);
  const [closedDaysLoading, setClosedDaysLoading] = useState(true);
  const [closedDayDate, setClosedDayDate] = useState("");
  const [closedDayNote, setClosedDayNote] = useState("");
  const [closedDayType, setClosedDayType] = useState<ClosedDayType>("full");
  const [closedDaySaving, setClosedDaySaving] = useState(false);
  const [closedDayError, setClosedDayError] = useState<string | null>(null);

  const [attendance, setAttendance] = useState<AttendanceSettings | null>(null);
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  const [attendanceSaved, setAttendanceSaved] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

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
    // Katalog + yoklama ayarları bağımsız yüklenir
    try {
      const settings = await fetchAdminSettings();
      setShowPrices(Boolean(settings.catalogShowPrices));
      setAttendance(settings.attendance);
    } catch {
      /* toggle "yüklenemedi" durumunda kalır */
    }
    // İzinli günler bağımsız yüklenir
    setClosedDaysLoading(true);
    try {
      setClosedDays(await fetchClosedDays());
    } catch (err) {
      setClosedDayError(err instanceof Error ? err.message : "İzinli günler yüklenemedi.");
    } finally {
      setClosedDaysLoading(false);
    }
  }, []);

  const handleAddClosedDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closedDayDate) return;
    setClosedDaySaving(true);
    setClosedDayError(null);
    try {
      setClosedDays(await addClosedDay(closedDayDate, closedDayNote || null, closedDayType));
      setClosedDayDate("");
      setClosedDayNote("");
      setClosedDayType("full");
    } catch (err) {
      setClosedDayError(err instanceof Error ? err.message : "İzinli gün eklenemedi.");
    } finally {
      setClosedDaySaving(false);
    }
  };

  const handleRemoveClosedDay = async (day: ClosedDay) => {
    if (!confirm(`${formatClosedDayDate(day.date)} izinli günü kaldırılsın mı?`)) return;
    setClosedDayError(null);
    try {
      setClosedDays(await removeClosedDay(day.date));
    } catch (err) {
      setClosedDayError(err instanceof Error ? err.message : "İzinli gün kaldırılamadı.");
    }
  };

  const togglePrices = async () => {
    if (showPrices === null) return;
    setPriceBusy(true);
    setError(null);
    try {
      const settings = await saveAdminSettings({ catalogShowPrices: !showPrices });
      setShowPrices(Boolean(settings.catalogShowPrices));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ayar kaydedilemedi.");
    } finally {
      setPriceBusy(false);
    }
  };

  const toggleWeeklyOffDay = (weekday: number) => {
    setAttendance((current) => {
      if (!current) return current;
      const has = current.weeklyOffDays.includes(weekday);
      return {
        ...current,
        weeklyOffDays: has
          ? current.weeklyOffDays.filter((d) => d !== weekday)
          : [...current.weeklyOffDays, weekday].sort((a, b) => a - b),
      };
    });
    setAttendanceSaved(false);
  };

  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendance) return;
    setAttendanceSaving(true);
    setAttendanceError(null);
    setAttendanceSaved(false);
    try {
      const settings = await saveAdminSettings({ attendance });
      setAttendance(settings.attendance);
      setAttendanceSaved(true);
    } catch (err) {
      setAttendanceError(err instanceof Error ? err.message : "Ayar kaydedilemedi.");
    } finally {
      setAttendanceSaving(false);
    }
  };

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
          <h2 className="admin-card-title">Satış kataloğu</h2>
          <p className="settings-section-desc">
            satis.dervisplastik.com üzerindeki resimli katalog pazarlamacıların
            müşteriye gösterdiği ekrandır. Fiyatlar gizliyken müşteri hiçbir
            şekilde fiyat göremez (veri de gönderilmez).
          </p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-zinc-800">
              Katalogda fiyatları göster
            </p>
            <p className="text-xs text-zinc-500">
              {showPrices === null
                ? "Durum yükleniyor…"
                : showPrices
                  ? "Fiyatlar şu an müşteriye görünüyor."
                  : "Fiyatlar şu an gizli."}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={showPrices === true}
            disabled={showPrices === null || priceBusy}
            onClick={() => void togglePrices()}
            className={`settings-toggle ${showPrices ? "is-on" : ""}`}
          >
            <span className="settings-toggle-knob" />
          </button>
        </div>
      </section>

      <section className="admin-card settings-section">
        <div className="settings-section-head">
          <h2 className="admin-card-title">Vardiya ve geç giriş</h2>
          <p className="settings-section-desc">
            Her vardiyanın mesai başlangıç saatini belirleyin. Belirlenen saatte yapılan
            giriş zamanında sayılır; saat geçildiği anda (örn. 08:30 sınırında 08:31)
            personel geç giriş olarak işaretlenir. Personelin hangi vardiyada olduğu
            Personel yönetiminden seçilir.
          </p>
        </div>

        {attendance === null ? (
          <p className="admin-muted text-sm">Ayarlar yükleniyor…</p>
        ) : (
          <form onSubmit={handleSaveAttendance}>
            <div className="admin-form-grid">
              <div>
                <label className="admin-label" htmlFor="shift1-late">
                  1. vardiya geç giriş saati
                </label>
                <input
                  id="shift1-late"
                  type="time"
                  className="admin-input"
                  value={attendance.shift1LateAfter}
                  onChange={(e) => {
                    const shift1LateAfter = e.target.value;
                    setAttendance((c) => (c ? { ...c, shift1LateAfter } : c));
                    setAttendanceSaved(false);
                  }}
                  required
                />
              </div>
              <div>
                <label className="admin-label" htmlFor="shift2-late">
                  2. vardiya geç giriş saati
                </label>
                <input
                  id="shift2-late"
                  type="time"
                  className="admin-input"
                  value={attendance.shift2LateAfter}
                  onChange={(e) => {
                    const shift2LateAfter = e.target.value;
                    setAttendance((c) => (c ? { ...c, shift2LateAfter } : c));
                    setAttendanceSaved(false);
                  }}
                  required
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="admin-label">Otomatik izin günleri (her hafta)</label>
              <p className="text-xs text-zinc-500">
                Seçilen günler tüm personel için her hafta otomatik izinli sayılır; her ay
                tek tek işaretlemeniz gerekmez.
              </p>
              <div className="settings-weekdays mt-2">
                {WEEKDAY_LABELS.map((label, index) => {
                  const active = attendance.weeklyOffDays.includes(index);
                  return (
                    <button
                      key={label}
                      type="button"
                      className={`settings-weekday ${active ? "is-active" : ""}`}
                      aria-pressed={active}
                      onClick={() => toggleWeeklyOffDay(index)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {attendanceError && (
              <p className="mt-3 text-sm text-red-600">{attendanceError}</p>
            )}
            {attendanceSaved && (
              <p className="settings-success mt-3 text-sm">Yoklama ayarları kaydedildi.</p>
            )}

            <div className="settings-action-row">
              <button type="submit" className="admin-btn-primary" disabled={attendanceSaving}>
                {attendanceSaving ? "Kaydediliyor…" : "Kaydet"}
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="admin-card settings-section">
        <div className="settings-section-head">
          <h2 className="admin-card-title">İzinli günler (bayram / resmi tatil)</h2>
          <p className="settings-section-desc">
            Tek seferlik izinli günleri buradan ekleyin. Tam gün izinlerde giriş yapmayan
            personel Yoklama&apos;da &quot;Gelmedi&quot; değil, &quot;İzinli&quot; görünür.
            Yarım gün izinlerde çalışma beklenir; gün takvimde yarım gün olarak işaretlenir.
            Haftalık düzenli izinler için üstteki &quot;Otomatik izin günleri&quot; ayarını
            kullanın.
          </p>
        </div>

        <form onSubmit={handleAddClosedDay} className="closed-days-form">
          <input
            type="date"
            className="admin-input"
            value={closedDayDate}
            onChange={(e) => setClosedDayDate(e.target.value)}
            required
            aria-label="Tarih"
          />
          <select
            className="admin-input"
            value={closedDayType}
            onChange={(e) => setClosedDayType(e.target.value as ClosedDayType)}
            aria-label="İzin tipi"
          >
            <option value="full">Tam gün</option>
            <option value="half">Yarım gün</option>
          </select>
          <input
            type="text"
            className="admin-input"
            placeholder="Not (isteğe bağlı, örn. Bayram)"
            value={closedDayNote}
            onChange={(e) => setClosedDayNote(e.target.value)}
            maxLength={200}
          />
          <button
            type="submit"
            className="admin-btn-primary"
            disabled={closedDaySaving || !closedDayDate}
          >
            {closedDaySaving ? "Ekleniyor…" : "Ekle"}
          </button>
        </form>

        {closedDayError && (
          <p className="mt-2 text-sm text-red-600">{closedDayError}</p>
        )}

        {closedDaysLoading ? (
          <p className="admin-muted mt-3 text-sm">Yükleniyor…</p>
        ) : closedDays.length === 0 ? (
          <p className="admin-muted mt-3 text-sm">Henüz izinli gün eklenmedi.</p>
        ) : (
          <ul className="closed-days-list">
            {closedDays.map((day) => (
              <li key={day.date} className="closed-days-row">
                <span className="closed-days-date">{formatClosedDayDate(day.date)}</span>
                <span
                  className={`closed-days-type ${day.type === "half" ? "is-half" : ""}`}
                >
                  {day.type === "half" ? "Yarım gün" : "Tam gün"}
                </span>
                {day.note && <span className="closed-days-note">{day.note}</span>}
                <button
                  type="button"
                  className="admin-btn-ghost text-xs ml-auto"
                  onClick={() => void handleRemoveClosedDay(day)}
                >
                  Kaldır
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

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
