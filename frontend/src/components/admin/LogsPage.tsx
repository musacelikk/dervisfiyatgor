"use client";

import { useCallback, useEffect, useState } from "react";
import AdminPageHeader from "./AdminPageHeader";
import { fetchAuditLogs, fetchAuditStats } from "@/lib/admin-api";
import {
  AUDIT_ACTION_FILTERS,
  getAuditActionLabel,
  getAuditActorLabel,
} from "@/lib/audit-labels";
import type { AuditLog, AuditStats } from "@/types/audit";

function formatLogDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "short",
      timeStyle: "medium",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function actionBadgeClass(action: string, success: boolean): string {
  if (!success) return "audit-badge audit-badge-error";
  if (action.startsWith("auth.")) return "audit-badge audit-badge-auth";
  if (action === "product.search") return "audit-badge audit-badge-search";
  if (action.startsWith("catalog.")) return "audit-badge audit-badge-catalog";
  if (action.startsWith("product.")) return "audit-badge audit-badge-stock";
  if (action.startsWith("order.")) return "audit-badge audit-badge-order";
  return "audit-badge";
}

function maxActivityCount(days: { count: number }[]): number {
  return Math.max(1, ...days.map((d) => d.count));
}

export default function LogsPage() {
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [actionFilter, setActionFilter] = useState("");
  const [actorFilter, setActorFilter] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, listData] = await Promise.all([
        fetchAuditStats(),
        fetchAuditLogs({
          page,
          limit: 30,
          action: actionFilter || undefined,
          actorType: actorFilter || undefined,
          q: searchQ || undefined,
        }),
      ]);
      setStats(statsData);
      setLogs(listData.logs);
      setTotal(listData.total);
      setTotalPages(listData.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Veriler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, actorFilter, searchQ]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearchQ(searchInput.trim());
  };

  const handleFilterChange = (setter: (v: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="admin-page admin-page-wide">
      <AdminPageHeader
        actions={
          <button type="button" className="admin-btn-secondary" onClick={() => void load()}>
            Yenile
          </button>
        }
      />

      {error && <div className="admin-alert admin-alert-error">{error}</div>}

      {stats && (
        <>
          <div className="admin-stats-grid">
            <div className="admin-stat-card admin-stat-card-featured">
              <p className="admin-stat-label">Bugünkü kayıt</p>
              <p className="admin-stat-value">{stats.logsToday}</p>
              <p className="admin-stat-hint">Toplam {stats.totalLogs.toLocaleString("tr-TR")} log</p>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-label">Giriş / çıkış</p>
              <p className="admin-stat-value">{stats.authEventsToday}</p>
              <p className="admin-stat-hint">Bugün</p>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-label">Stok işlemleri</p>
              <p className="admin-stat-value">{stats.stockEventsToday}</p>
              <p className="admin-stat-hint">Ekleme, güncelleme, Excel</p>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-label">Ürün sorguları</p>
              <p className="admin-stat-value">{stats.searchesToday}</p>
              <p className="admin-stat-hint">Mağaza / barkod arama</p>
            </div>
          </div>

          <div className="audit-report-grid">
            <div className="admin-card">
              <h2 className="admin-card-title">Son 7 gün aktivite</h2>
              {stats.activityByDay.length === 0 ? (
                <p className="admin-muted text-sm">Henüz kayıt yok.</p>
              ) : (
                <div className="audit-activity-chart">
                  {stats.activityByDay.map((day) => (
                    <div key={day.day} className="audit-activity-bar-wrap">
                      <div
                        className="audit-activity-bar"
                        style={{
                          height: `${Math.round((day.count / maxActivityCount(stats.activityByDay)) * 100)}%`,
                        }}
                        title={`${day.count} kayıt`}
                      />
                      <span className="audit-activity-label">
                        {day.day.slice(5).replace("-", "/")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="admin-card">
              <h2 className="admin-card-title">En çok sorgulanan ürünler</h2>
              <p className="admin-muted mb-3 text-xs">Son 30 gün — mağaza barkod / arama</p>
              {stats.topSearchedProducts.length === 0 ? (
                <p className="admin-muted text-sm">Henüz sorgu kaydı yok.</p>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table admin-table-compact">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Stok kodu</th>
                        <th>Ürün</th>
                        <th className="text-right">Sorgu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.topSearchedProducts.map((row, i) => (
                        <tr key={`${row.stockCode}-${i}`}>
                          <td>{i + 1}</td>
                          <td className="font-mono text-xs">{row.stockCode}</td>
                          <td>{row.productName ?? "—"}</td>
                          <td className="text-right font-semibold tabular-nums">
                            {row.count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <div className="admin-card mt-4">
        <div className="audit-log-toolbar">
          <form onSubmit={handleSearch} className="audit-log-search">
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Mesaj, stok kodu, kullanıcı ara…"
              className="admin-input"
            />
            <button type="submit" className="admin-btn-secondary">
              Ara
            </button>
          </form>

          <select
            value={actionFilter}
            onChange={(e) => handleFilterChange(setActionFilter, e.target.value)}
            className="admin-select"
            aria-label="İşlem türü"
          >
            {AUDIT_ACTION_FILTERS.map((f) => (
              <option key={f.value || "all"} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          <select
            value={actorFilter}
            onChange={(e) => handleFilterChange(setActorFilter, e.target.value)}
            className="admin-select"
            aria-label="Kullanıcı türü"
          >
            <option value="">Tüm kullanıcılar</option>
            <option value="admin">Yönetici</option>
            <option value="employee">Personel</option>
            <option value="store">Mağaza</option>
          </select>
        </div>

        <p className="admin-muted mt-3 text-xs">
          {total.toLocaleString("tr-TR")} kayıt
          {searchQ ? ` · “${searchQ}” araması` : ""}
        </p>

        {loading ? (
          <p className="admin-muted mt-4">Loglar yükleniyor…</p>
        ) : logs.length === 0 ? (
          <p className="admin-muted mt-4 text-sm">Filtreye uygun kayıt bulunamadı.</p>
        ) : (
          <div className="admin-table-wrap mt-3">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>İşlem</th>
                  <th>Kullanıcı</th>
                  <th>Detay</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className={!log.success ? "audit-row-failed" : undefined}>
                    <td className="whitespace-nowrap text-xs text-zinc-500">
                      {formatLogDate(log.createdAt)}
                    </td>
                    <td>
                      <span className={actionBadgeClass(log.action, log.success)}>
                        {getAuditActionLabel(log.action)}
                      </span>
                    </td>
                    <td className="text-sm">
                      <span className="font-medium text-zinc-800">
                        {log.actorName ?? getAuditActorLabel(log.actorType)}
                      </span>
                      <span className="block text-xs text-zinc-500">
                        {getAuditActorLabel(log.actorType)}
                        {log.actorId ? ` · #${log.actorId}` : ""}
                      </span>
                    </td>
                    <td className="max-w-md text-sm text-zinc-700">
                      <p>{log.message ?? log.resourceId ?? "—"}</p>
                      {log.resourceId && log.message && (
                        <p className="mt-0.5 font-mono text-xs text-zinc-500">
                          {log.resourceType}: {log.resourceId}
                        </p>
                      )}
                    </td>
                    <td className="text-xs text-zinc-400">{log.ip ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="audit-pagination">
            <button
              type="button"
              className="admin-btn-secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Önceki
            </button>
            <span className="text-sm text-zinc-600">
              Sayfa {page} / {totalPages}
            </span>
            <button
              type="button"
              className="admin-btn-secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Sonraki
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
