"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminPageHeader from "./AdminPageHeader";
import AdminPagination from "./AdminPagination";
import { IconLogs } from "./AdminIcons";
import { fetchAuditLogs, fetchAuditStats } from "@/lib/admin-api";
import {
  AUDIT_ACTION_FILTERS,
  getAuditActionLabel,
  getAuditActorLabel,
} from "@/lib/audit-labels";
import type { PageSizeOption } from "@/lib/permissions";
import type { AuditLog, AuditStats } from "@/types/audit";

const LOG_PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const satisfies readonly PageSizeOption[];

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

function formatLogDateCompact(iso: string): string {
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
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

function actorBadgeClass(actorType: string): string {
  if (actorType === "admin") return "audit-actor audit-actor-admin";
  if (actorType === "employee") return "audit-actor audit-actor-employee";
  if (actorType === "store") return "audit-actor audit-actor-store";
  return "audit-actor";
}

function maxActivityCount(days: { count: number }[]): number {
  return Math.max(1, ...days.map((d) => d.count));
}

function maxSearchCount(products: { count: number }[]): number {
  return Math.max(1, ...products.map((p) => p.count));
}

function hasActiveFilters(actionFilter: string, actorFilter: string, searchQ: string): boolean {
  return Boolean(actionFilter || actorFilter || searchQ);
}

function LogDetail({ log }: { log: AuditLog }) {
  const detail = log.message ?? log.resourceId ?? "—";
  return (
    <>
      <p className="audit-log-detail-text">{detail}</p>
      {log.resourceId && log.message && (
        <p className="audit-log-detail-meta">
          {log.resourceType}: {log.resourceId}
        </p>
      )}
    </>
  );
}

function LogCard({ log }: { log: AuditLog }) {
  return (
    <article className={`audit-log-card ${!log.success ? "audit-log-card-failed" : ""}`}>
      <div className="audit-log-card-head">
        <time className="audit-log-card-date" dateTime={log.createdAt}>
          {formatLogDateCompact(log.createdAt)}
        </time>
        <span className={actionBadgeClass(log.action, log.success)}>
          {getAuditActionLabel(log.action)}
        </span>
      </div>

      <div className="audit-log-card-actor">
        <span className={actorBadgeClass(log.actorType)}>
          {getAuditActorLabel(log.actorType)}
        </span>
        <span className="audit-log-card-actor-name">
          {log.actorName ?? "—"}
          {log.actorId ? ` · #${log.actorId}` : ""}
        </span>
      </div>

      <div className="audit-log-card-body">
        <LogDetail log={log} />
      </div>

      {log.ip && <p className="audit-log-card-ip">IP: {log.ip}</p>}
    </article>
  );
}

function LogsSkeleton() {
  return (
    <div className="audit-skeleton-wrap" aria-hidden>
      <div className="audit-stats-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="audit-skeleton-stat" />
        ))}
      </div>
      <div className="audit-report-grid">
        <div className="audit-skeleton-card" />
        <div className="audit-skeleton-card audit-skeleton-card-tall" />
      </div>
      <div className="audit-skeleton-card audit-skeleton-list" />
    </div>
  );
}

export default function LogsPage() {
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSizeOption>(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [actionFilter, setActionFilter] = useState("");
  const [actorFilter, setActorFilter] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const filtersActive = useMemo(
    () => hasActiveFilters(actionFilter, actorFilter, searchQ),
    [actionFilter, actorFilter, searchQ]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const limit = typeof pageSize === "number" ? pageSize : 25;
      const [statsData, listData] = await Promise.all([
        fetchAuditStats(),
        fetchAuditLogs({
          page,
          limit,
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
  }, [page, pageSize, actionFilter, actorFilter, searchQ]);

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

  const clearFilters = () => {
    setActionFilter("");
    setActorFilter("");
    setSearchInput("");
    setSearchQ("");
    setPage(1);
  };

  return (
    <div className="admin-page admin-page-wide audit-page">
      <AdminPageHeader
        actions={
          <button
            type="button"
            className="admin-btn-secondary audit-refresh-btn"
            onClick={() => void load()}
            disabled={loading}
          >
            <svg
              className={`audit-refresh-icon ${loading ? "audit-refresh-icon-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182"
              />
            </svg>
            Yenile
          </button>
        }
      />

      {error && <div className="admin-alert admin-alert-error">{error}</div>}

      {loading && !stats ? (
        <LogsSkeleton />
      ) : (
        stats && (
          <>
            <div className="audit-stats-grid">
              <div className="admin-stat-card admin-stat-card-featured">
                <div className="admin-stat-card-top">
                  <div>
                    <p className="admin-stat-label">Bugünkü kayıt</p>
                    <p className="admin-stat-value">{stats.logsToday.toLocaleString("tr-TR")}</p>
                    <p className="admin-stat-hint">
                      Toplam {stats.totalLogs.toLocaleString("tr-TR")} log
                    </p>
                  </div>
                  <div className="admin-stat-icon admin-stat-icon-red">
                    <IconLogs />
                  </div>
                </div>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-card-top">
                  <div>
                    <p className="admin-stat-label">Giriş / çıkış</p>
                    <p className="admin-stat-value">{stats.authEventsToday.toLocaleString("tr-TR")}</p>
                    <p className="admin-stat-hint">Bugün</p>
                  </div>
                  <div className="admin-stat-icon audit-stat-icon-auth">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-card-top">
                  <div>
                    <p className="admin-stat-label">Stok işlemleri</p>
                    <p className="admin-stat-value">{stats.stockEventsToday.toLocaleString("tr-TR")}</p>
                    <p className="admin-stat-hint">Ekleme, güncelleme, Excel</p>
                  </div>
                  <div className="admin-stat-icon audit-stat-icon-stock">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m20 7-8-4-8 4m16 0-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-card-top">
                  <div>
                    <p className="admin-stat-label">Ürün sorguları</p>
                    <p className="admin-stat-value">{stats.searchesToday.toLocaleString("tr-TR")}</p>
                    <p className="admin-stat-hint">Mağaza / barkod arama</p>
                  </div>
                  <div className="admin-stat-icon audit-stat-icon-search">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="audit-report-grid">
              <section className="admin-card audit-card-elevated">
                <div className="audit-section-head">
                  <h2 className="admin-card-title">Son 7 gün aktivite</h2>
                  <p className="audit-section-desc">Günlük işlem hacmi</p>
                </div>
                {stats.activityByDay.length === 0 ? (
                  <p className="admin-muted text-sm">Henüz kayıt yok.</p>
                ) : (
                  <div className="audit-activity-chart">
                    {stats.activityByDay.map((day) => {
                      const pct = Math.round((day.count / maxActivityCount(stats.activityByDay)) * 100);
                      return (
                        <div key={day.day} className="audit-activity-bar-wrap">
                          <span className="audit-activity-count">{day.count}</span>
                          <div className="audit-activity-bar-track">
                            <div
                              className="audit-activity-bar"
                              style={{ height: `${Math.max(pct, day.count > 0 ? 8 : 0)}%` }}
                              title={`${day.count} kayıt`}
                            />
                          </div>
                          <span className="audit-activity-label">
                            {day.day.slice(5).replace("-", "/")}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="admin-card audit-card-elevated">
                <div className="audit-section-head">
                  <h2 className="admin-card-title">En çok sorgulanan ürünler</h2>
                  <p className="audit-section-desc">Son 30 gün — mağaza barkod / arama</p>
                </div>
                {stats.topSearchedProducts.length === 0 ? (
                  <p className="admin-muted text-sm">Henüz sorgu kaydı yok.</p>
                ) : (
                  <ol className="audit-top-list">
                    {stats.topSearchedProducts.map((row, i) => (
                      <li key={`${row.stockCode}-${i}`} className="audit-top-item">
                        <span className="audit-top-rank">{i + 1}</span>
                        <div className="audit-top-body">
                          <div className="audit-top-row">
                            <span className="audit-top-code">{row.stockCode}</span>
                            <span className="audit-top-count">{row.count.toLocaleString("tr-TR")}</span>
                          </div>
                          <p className="audit-top-name">{row.productName ?? "—"}</p>
                          <div className="audit-top-bar-track">
                            <div
                              className="audit-top-bar"
                              style={{
                                width: `${Math.round((row.count / maxSearchCount(stats.topSearchedProducts)) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>
          </>
        )
      )}

      <section className="admin-card audit-card-elevated audit-log-section">
        <div className="audit-log-section-head">
          <div>
            <h2 className="admin-card-title">İşlem kayıtları</h2>
            <p className="audit-section-desc">Tüm sistem aktiviteleri</p>
          </div>
          {!loading && total > 0 && (
            <span className="audit-result-badge">{total.toLocaleString("tr-TR")} kayıt</span>
          )}
        </div>

        <div className="audit-filters">
          <form onSubmit={handleSearch} className="audit-log-search">
            <span className="audit-search-icon" aria-hidden>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </span>
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Mesaj, stok kodu, kullanıcı ara…"
              className="admin-input audit-search-input"
            />
            <button type="submit" className="admin-btn-secondary audit-search-btn">
              Ara
            </button>
          </form>

          <div className="audit-filter-row">
            <label className="audit-filter-field">
              <span className="audit-filter-label">İşlem türü</span>
              <select
                value={actionFilter}
                onChange={(e) => handleFilterChange(setActionFilter, e.target.value)}
                className="admin-select audit-filter-select"
              >
                {AUDIT_ACTION_FILTERS.map((f) => (
                  <option key={f.value || "all"} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="audit-filter-field">
              <span className="audit-filter-label">Kullanıcı</span>
              <select
                value={actorFilter}
                onChange={(e) => handleFilterChange(setActorFilter, e.target.value)}
                className="admin-select audit-filter-select"
              >
                <option value="">Tüm kullanıcılar</option>
                <option value="admin">Yönetici</option>
                <option value="employee">Personel</option>
                <option value="store">Mağaza</option>
              </select>
            </label>
          </div>

          {filtersActive && (
            <button type="button" className="audit-clear-filters" onClick={clearFilters}>
              Filtreleri temizle
            </button>
          )}
        </div>

        {loading ? (
          <div className="audit-log-loading">
            <div className="audit-log-loading-dots" aria-hidden>
              <span className="audit-log-loading-dot" />
              <span className="audit-log-loading-dot" />
              <span className="audit-log-loading-dot" />
            </div>
            <p className="admin-muted">Loglar yükleniyor…</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="audit-empty">
            <div className="audit-empty-icon">
              <IconLogs className="h-7 w-7" />
            </div>
            <p className="audit-empty-title">Kayıt bulunamadı</p>
            <p className="audit-empty-desc">
              {filtersActive
                ? "Filtreleri değiştirin veya temizleyip tekrar deneyin."
                : "Henüz sistem logu oluşmamış."}
            </p>
            {filtersActive && (
              <button type="button" className="admin-btn-secondary" onClick={clearFilters}>
                Filtreleri temizle
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="audit-log-cards">
              {logs.map((log) => (
                <LogCard key={log.id} log={log} />
              ))}
            </div>

            <div className="admin-table-wrap audit-log-table-wrap">
              <table className="admin-table audit-log-table">
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
                      <td className="audit-log-date-cell">{formatLogDate(log.createdAt)}</td>
                      <td>
                        <span className={actionBadgeClass(log.action, log.success)}>
                          {getAuditActionLabel(log.action)}
                        </span>
                      </td>
                      <td>
                        <div className="audit-log-actor-cell">
                          <span className="audit-log-actor-name">
                            {log.actorName ?? getAuditActorLabel(log.actorType)}
                          </span>
                          <span className={actorBadgeClass(log.actorType)}>
                            {getAuditActorLabel(log.actorType)}
                            {log.actorId ? ` · #${log.actorId}` : ""}
                          </span>
                        </div>
                      </td>
                      <td className="audit-log-detail-cell">
                        <LogDetail log={log} />
                      </td>
                      <td className="audit-log-ip-cell">{log.ip ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!loading && total > 0 && (
          <AdminPagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            pageSizeOptions={LOG_PAGE_SIZE_OPTIONS}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        )}
      </section>
    </div>
  );
}
