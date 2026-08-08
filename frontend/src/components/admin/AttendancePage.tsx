"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminModal from "./AdminModal";
import AdminIconButton from "./AdminIconButton";
import EmployeeAttendanceDetail from "./EmployeeAttendanceDetail";
import { IconEdit, IconTrash } from "./AdminIcons";
import { fetchEmployees } from "@/lib/admin-api";
import {
  createAttendanceEntry,
  deleteAttendanceEntry,
  fetchAttendance,
  fetchAttendanceReport,
  fetchAttendanceSummary,
  updateAttendanceEntry,
} from "@/lib/attendance-api";
import type { Employee } from "@/types/employee";
import {
  ATTENDANCE_LABELS,
  SHIFT_LABELS,
  formatLateMinutes,
  type AttendanceReport,
  type AttendanceRow,
  type AttendanceSettings,
  type AttendanceStatus,
  type AttendanceStatusOrAbsent,
  type AttendanceSummary,
} from "@/types/shift";

type RangePreset = "today" | "week" | "month" | "custom";

function istanbulToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function rangeFor(preset: RangePreset, today: string): { from: string; to: string } {
  if (preset === "week") return { from: addDays(today, -6), to: today };
  if (preset === "month") return { from: addDays(today, -29), to: today };
  return { from: today, to: today };
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}.${m}.${y}`;
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Istanbul",
    });
  } catch {
    return "—";
  }
}

/** Düzenleme formundaki saat alanı için "HH:MM" (İstanbul). */
function timeValue(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Istanbul",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function statusClass(status: AttendanceStatusOrAbsent): string {
  if (status === "full") return "attendance-badge attendance-badge-full";
  if (status === "half") return "attendance-badge attendance-badge-half";
  if (status === "off") return "attendance-badge attendance-badge-off";
  return "attendance-badge attendance-badge-absent";
}

type EditState =
  | { mode: "edit"; row: AttendanceRow }
  | { mode: "create"; row: AttendanceRow }
  | null;

/** Yoklama satırının geç giriş rozeti — vardiya sınırı aşıldığında görünür. */
function LateBadge({ row }: { row: AttendanceRow }) {
  if (!row.isLate) return null;
  return (
    <span
      className="attendance-late-badge"
      title={`Mesai başlangıcı ${row.expectedStart} — ${formatLateMinutes(row.lateMinutes)} geç`}
    >
      +{formatLateMinutes(row.lateMinutes)}
    </span>
  );
}

export default function AttendancePage() {
  const today = useMemo(istanbulToday, []);
  const [preset, setPreset] = useState<RangePreset>("today");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [employeeId, setEmployeeId] = useState<number | "">("");
  const [statusFilter, setStatusFilter] = useState<AttendanceStatusOrAbsent | "">("");

  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [cutoff, setCutoff] = useState("11:00");
  const [attendanceSettings, setAttendanceSettings] = useState<AttendanceSettings | null>(
    null
  );
  const [detailFor, setDetailFor] = useState<{ id: number; name: string } | null>(null);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [report, setReport] = useState<AttendanceReport | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [edit, setEdit] = useState<EditState>(null);
  const [formStatus, setFormStatus] = useState<AttendanceStatus>("full");
  const [formTime, setFormTime] = useState("09:00");
  const [formNote, setFormNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchEmployees()
      .then((list) => setEmployees(list.filter((e) => e.active)))
      .catch(() => setEmployees([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, sum, rep] = await Promise.all([
        fetchAttendance({
          from,
          to,
          employeeId: employeeId || undefined,
          status: statusFilter || undefined,
        }),
        fetchAttendanceSummary(today),
        fetchAttendanceReport(from, to, employeeId || undefined),
      ]);
      setRows(list.rows);
      setCutoff(list.cutoff);
      setAttendanceSettings(list.attendanceSettings ?? null);
      setSummary(sum);
      setReport(rep);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yoklama yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [from, to, employeeId, statusFilter, today]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyPreset = (next: RangePreset) => {
    setPreset(next);
    if (next !== "custom") {
      const range = rangeFor(next, today);
      setFrom(range.from);
      setTo(range.to);
    }
  };

  const openEdit = (row: AttendanceRow) => {
    if (row.entry) {
      setFormStatus(row.entry.status);
      setFormTime(timeValue(row.entry.checkInAt));
      setFormNote(row.entry.note ?? "");
      setEdit({ mode: "edit", row });
    } else {
      setFormStatus("full");
      setFormTime("09:00");
      setFormNote("");
      setEdit({ mode: "create", row });
    }
  };

  const closeEdit = () => setEdit(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    setSaving(true);
    setError(null);
    try {
      if (edit.mode === "create") {
        await createAttendanceEntry({
          employeeId: edit.row.employeeId,
          workDate: edit.row.workDate,
          status: formStatus,
          time: formTime || undefined,
          note: formNote || null,
        });
      } else if (edit.row.entry) {
        await updateAttendanceEntry(edit.row.entry.id, {
          workDate: edit.row.workDate,
          time: formTime || undefined,
          status: formStatus,
          note: formNote || null,
        });
      }
      closeEdit();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: AttendanceRow) => {
    if (!row.entry) return;
    if (
      !confirm(
        `${row.employeeName} — ${formatDate(row.workDate)} kaydı silinsin mi? (Gelmedi olarak görünecek)`
      )
    ) {
      return;
    }
    try {
      await deleteAttendanceEntry(row.entry.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Silinemedi.");
    }
  };

  const quickSetStatus = async (row: AttendanceRow, status: AttendanceStatus) => {
    setError(null);
    try {
      if (row.entry) {
        await updateAttendanceEntry(row.entry.id, { status });
      } else {
        await createAttendanceEntry({
          employeeId: row.employeeId,
          workDate: row.workDate,
          status,
        });
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Güncellenemedi.");
    }
  };

  return (
    <div className="admin-page">
      {/* Bugünün özeti */}
      <div className="attendance-stats">
        <div className="attendance-stat attendance-stat-primary">
          <span className="attendance-stat-label">Bugün giriş yapan</span>
          <span className="attendance-stat-value">{summary?.present ?? "—"}</span>
          <span className="attendance-stat-hint">
            {summary ? `${summary.totalEmployees} personelden` : ""}
          </span>
        </div>
        <div className="attendance-stat">
          <span className="attendance-stat-label">Gelmeyen</span>
          <span className="attendance-stat-value">{summary?.absent ?? "—"}</span>
        </div>
        {Boolean(summary?.off) && (
          <div className="attendance-stat">
            <span className="attendance-stat-label">İzinli</span>
            <span className="attendance-stat-value">{summary?.off}</span>
          </div>
        )}
        <div className="attendance-stat">
          <span className="attendance-stat-label">Geç giriş</span>
          <span className="attendance-stat-value attendance-stat-half">
            {summary?.late ?? "—"}
          </span>
        </div>
        <div className="attendance-stat">
          <span className="attendance-stat-label">Tam gün</span>
          <span className="attendance-stat-value attendance-stat-full">
            {summary?.full ?? "—"}
          </span>
        </div>
        <div className="attendance-stat">
          <span className="attendance-stat-label">Yarım gün</span>
          <span className="attendance-stat-value attendance-stat-half">
            {summary?.half ?? "—"}
          </span>
        </div>
        <div className="attendance-stat">
          <span className="attendance-stat-label">Konum dışı deneme</span>
          <span
            className={`attendance-stat-value ${
              (summary?.deniedAttempts ?? 0) > 0 ? "attendance-stat-warn" : ""
            }`}
          >
            {summary?.deniedAttempts ?? "—"}
          </span>
        </div>
      </div>

      {/* Filtreler */}
      <div className="admin-toolbar-card mt-4">
        <div className="attendance-presets">
          {(
            [
              ["today", "Bugün"],
              ["week", "Bu hafta"],
              ["month", "Bu ay"],
              ["custom", "Tarih seç"],
            ] as [RangePreset, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => applyPreset(value)}
              className={`attendance-preset ${preset === value ? "is-active" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="attendance-filters">
          {preset === "custom" && (
            <>
              <label className="attendance-filter">
                <span>Başlangıç</span>
                <input
                  type="date"
                  value={from}
                  max={to}
                  onChange={(e) => setFrom(e.target.value)}
                  className="admin-input"
                />
              </label>
              <label className="attendance-filter">
                <span>Bitiş</span>
                <input
                  type="date"
                  value={to}
                  min={from}
                  max={today}
                  onChange={(e) => setTo(e.target.value)}
                  className="admin-input"
                />
              </label>
            </>
          )}
          <label className="attendance-filter">
            <span>Personel</span>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value ? Number(e.target.value) : "")}
              className="admin-input"
            >
              <option value="">Tümü</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </label>
          <label className="attendance-filter">
            <span>Durum</span>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as AttendanceStatusOrAbsent | "")
              }
              className="admin-input"
            >
              <option value="">Tümü</option>
              <option value="full">Tam Gün</option>
              <option value="half">Yarım Gün</option>
              <option value="absent">Gelmedi</option>
              <option value="off">İzinli</option>
            </select>
          </label>
        </div>
      </div>

      {/* Aralık raporu */}
      {report && (
        <div className="attendance-report mt-4">
          <div className="attendance-report-head">
            <h2>
              {from === to
                ? formatDate(from)
                : `${formatDate(from)} – ${formatDate(to)}`}{" "}
              raporu
            </h2>
            <span className="attendance-report-cutoff">
              {cutoff}&apos;e kadar giriş = Tam Gün
              {attendanceSettings && (
                <>
                  {" · "}Geç giriş: 1. vardiya {attendanceSettings.shift1LateAfter}, 2.
                  vardiya {attendanceSettings.shift2LateAfter}
                </>
              )}
            </span>
          </div>
          <div className="attendance-report-totals">
            <span className="attendance-report-total">
              <b>{report.full}</b> Tam Gün
            </span>
            <span className="attendance-report-total">
              <b>{report.half}</b> Yarım Gün
            </span>
            <span className="attendance-report-total">
              <b>{report.absent}</b> Gelmedi
            </span>
            <span className="attendance-report-total">
              <b>{report.late}</b> Geç giriş ({formatLateMinutes(report.lateMinutes)})
            </span>
            {report.off > 0 && (
              <span className="attendance-report-total">
                <b>{report.off}</b> İzinli
              </span>
            )}
          </div>
          {report.perEmployee.length > 1 && (
            <div className="attendance-report-list">
              {report.perEmployee.map((row) => (
                <div key={row.employeeId} className="attendance-report-row">
                  <button
                    type="button"
                    className="attendance-report-name attendance-name-link"
                    onClick={() =>
                      setDetailFor({ id: row.employeeId, name: row.employeeName })
                    }
                  >
                    {row.employeeName}
                  </button>
                  <span className="attendance-report-counts">
                    <b className="text-emerald-700">{row.full}</b> tam ·{" "}
                    <b className="text-amber-700">{row.half}</b> yarım ·{" "}
                    <b className="text-zinc-500">{row.absent}</b> gelmedi
                    {row.late > 0 && (
                      <>
                        {" "}
                        · <b className="text-amber-700">{row.late}</b> geç (
                        {formatLateMinutes(row.lateMinutes)})
                      </>
                    )}
                    {row.off > 0 && (
                      <>
                        {" "}
                        · <b className="text-blue-700">{row.off}</b> izinli
                      </>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <div className="admin-alert admin-alert-error mt-4">{error}</div>}

      {/* Yoklama listesi */}
      {loading ? (
        <p className="mt-8 text-center text-sm text-zinc-500">Yükleniyor…</p>
      ) : rows.length === 0 ? (
        <div className="admin-card mt-4 text-center">
          <p className="text-sm text-zinc-600">Bu filtrelerle kayıt bulunamadı.</p>
        </div>
      ) : (
        <>
          <div className="admin-table-wrap mt-4 hidden lg:block">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Personel</th>
                  <th>Vardiya</th>
                  <th>Giriş</th>
                  <th>Çıkış</th>
                  <th>Durum</th>
                  <th>Açıklama</th>
                  <th className="text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.employeeId}-${row.workDate}`}>
                    <td className="whitespace-nowrap">{formatDate(row.workDate)}</td>
                    <td className="font-medium text-zinc-900">
                      <button
                        type="button"
                        className="attendance-name-link"
                        onClick={() =>
                          setDetailFor({ id: row.employeeId, name: row.employeeName })
                        }
                      >
                        {row.employeeName}
                      </button>
                    </td>
                    <td className="whitespace-nowrap text-xs text-zinc-600">
                      {SHIFT_LABELS[row.shift]}
                      <span className="block text-[11px] text-zinc-400">
                        {row.expectedStart}
                      </span>
                    </td>
                    <td className="font-mono text-xs">
                      {row.entry ? formatTime(row.entry.checkInAt) : "—"}
                      <LateBadge row={row} />
                    </td>
                    <td className="font-mono text-xs">
                      {row.entry ? formatTime(row.entry.checkOutAt) : "—"}
                    </td>
                    <td>
                      <span className={statusClass(row.status)}>
                        {ATTENDANCE_LABELS[row.status]}
                      </span>
                    </td>
                    <td className="max-w-[12rem] text-xs text-zinc-600">
                      {row.entry?.note ?? ""}
                    </td>
                    <td>
                      <div className="admin-action-icons">
                        {row.status !== "full" && (
                          <button
                            type="button"
                            className="admin-btn-ghost text-xs"
                            onClick={() => void quickSetStatus(row, "full")}
                          >
                            Tam
                          </button>
                        )}
                        {row.status !== "half" && (
                          <button
                            type="button"
                            className="admin-btn-ghost text-xs"
                            onClick={() => void quickSetStatus(row, "half")}
                          >
                            Yarım
                          </button>
                        )}
                        <AdminIconButton label="Düzenle" onClick={() => openEdit(row)}>
                          <IconEdit />
                        </AdminIconButton>
                        {row.entry && (
                          <AdminIconButton
                            label="Sil"
                            variant="danger"
                            onClick={() => void handleDelete(row)}
                          >
                            <IconTrash />
                          </AdminIconButton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 space-y-3 lg:hidden">
            {rows.map((row) => (
              <div key={`${row.employeeId}-${row.workDate}`} className="admin-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <button
                      type="button"
                      className="attendance-name-link font-semibold text-zinc-900"
                      onClick={() =>
                        setDetailFor({ id: row.employeeId, name: row.employeeName })
                      }
                    >
                      {row.employeeName}
                    </button>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {formatDate(row.workDate)} · {SHIFT_LABELS[row.shift]}
                      {row.entry && ` · ${formatTime(row.entry.checkInAt)}`}
                      {row.entry?.checkOutAt && ` – ${formatTime(row.entry.checkOutAt)}`}
                      {row.isLate && (
                        <span className="attendance-late-badge">
                          +{formatLateMinutes(row.lateMinutes)}
                        </span>
                      )}
                    </p>
                    {row.entry?.note && (
                      <p className="mt-1 text-xs text-zinc-600">{row.entry.note}</p>
                    )}
                  </div>
                  <span className={`${statusClass(row.status)} shrink-0`}>
                    {ATTENDANCE_LABELS[row.status]}
                  </span>
                </div>
                <div className="admin-action-icons mt-3">
                  {row.status !== "full" && (
                    <button
                      type="button"
                      className="admin-btn-ghost text-xs"
                      onClick={() => void quickSetStatus(row, "full")}
                    >
                      Tam gün
                    </button>
                  )}
                  {row.status !== "half" && (
                    <button
                      type="button"
                      className="admin-btn-ghost text-xs"
                      onClick={() => void quickSetStatus(row, "half")}
                    >
                      Yarım gün
                    </button>
                  )}
                  <AdminIconButton label="Düzenle" onClick={() => openEdit(row)}>
                    <IconEdit />
                  </AdminIconButton>
                  {row.entry && (
                    <AdminIconButton
                      label="Sil"
                      variant="danger"
                      onClick={() => void handleDelete(row)}
                    >
                      <IconTrash />
                    </AdminIconButton>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <AdminModal
        open={detailFor !== null}
        onClose={() => setDetailFor(null)}
        size="lg"
        title={detailFor ? `${detailFor.name} — yoklama geçmişi` : "Yoklama geçmişi"}
        description="Aylık/haftalık takvim, geç girişler ve devamsızlık özeti."
      >
        <div className="admin-modal-body">
          {detailFor && (
            <EmployeeAttendanceDetail
              employeeId={detailFor.id}
              employeeName={detailFor.name}
            />
          )}
        </div>
      </AdminModal>

      <AdminModal
        open={edit !== null}
        onClose={closeEdit}
        title={edit?.mode === "create" ? "Yoklama kaydı ekle" : "Yoklama kaydını düzenle"}
        description={
          edit ? `${edit.row.employeeName} — ${formatDate(edit.row.workDate)}` : undefined
        }
      >
        <form onSubmit={handleSave} className="admin-modal-form">
          <div className="admin-modal-body">
            <div className="admin-form-grid">
              <div>
                <label className="admin-label">Durum</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as AttendanceStatus)}
                  className="admin-input"
                >
                  <option value="full">Tam Gün</option>
                  <option value="half">Yarım Gün</option>
                </select>
              </div>
              <div>
                <label className="admin-label">Giriş saati</label>
                <input
                  type="time"
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                  className="admin-input"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="admin-label">Açıklama</label>
              <input
                type="text"
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                placeholder="İsteğe bağlı not"
                className="admin-input"
                maxLength={200}
              />
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              {cutoff}&apos;e kadar yapılan girişler tam gün, sonrası yarım gün sayılır.
              Durumu elle değiştirebilirsiniz.
            </p>
          </div>
          <div className="admin-modal-footer">
            <button type="button" onClick={closeEdit} className="admin-btn-secondary">
              İptal
            </button>
            <button type="submit" disabled={saving} className="admin-btn-primary">
              {saving ? "Kaydediliyor…" : "Kaydet"}
            </button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}
