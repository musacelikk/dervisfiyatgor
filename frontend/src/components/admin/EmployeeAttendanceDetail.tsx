"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createAttendanceEntry,
  deleteAttendanceEntry,
  fetchEmployeeAttendance,
  saveAttendanceExcuse,
  updateAttendanceEntry,
} from "@/lib/attendance-api";
import {
  DAY_STATUS_LABELS,
  SHIFT_LABELS,
  WEEKDAY_LABELS,
  formatLateMinutes,
  type AttendanceDay,
  type AttendanceDayStatus,
  type AttendanceEmployeeDetail,
  type AttendanceStatus,
} from "@/types/shift";

type ViewMode = "month" | "week";

const MONTH_NAMES = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
] as const;

/** Takvim başlıkları — hafta Pazartesi başlar. */
const WEEK_HEADERS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"] as const;

function istanbulToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toDateStr(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** Pazartesi = haftanın ilk günü. */
function startOfWeek(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return addDays(dateStr, weekday === 0 ? -6 : 1 - weekday);
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}.${m}.${y}`;
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      timeZone: "Europe/Istanbul",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

/** `<input type="time">` için "HH:MM" (İstanbul saati). */
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

function dayClass(status: AttendanceDayStatus): string {
  return `attendance-cal-day is-${status}`;
}

/** Tooltip ve seçili gün kartında gösterilen ortak alanlar. */
function dayRows(day: AttendanceDay): [string, string][] {
  const rows: [string, string][] = [
    ["Tarih", formatDate(day.date)],
    ["Durum", DAY_STATUS_LABELS[day.dayStatus]],
    ["Vardiya", SHIFT_LABELS[day.shift]],
  ];

  if (day.checkInAt) {
    rows.push(["Giriş saati", formatTime(day.checkInAt)]);
    rows.push(["Mesai başlangıcı", day.expectedStart]);
    if (day.isLate) rows.push(["Geç kalma", formatLateMinutes(day.lateMinutes)]);
    if (day.checkOutAt) rows.push(["Çıkış saati", formatTime(day.checkOutAt)]);
    if (day.status) rows.push(["Gün tipi", day.status === "full" ? "Tam Gün" : "Yarım Gün"]);
  } else if (day.dayStatus !== "future") {
    rows.push(["Mesai başlangıcı", day.expectedStart]);
  }

  if (day.off) {
    rows.push([
      "İzin",
      `${day.off.type === "half" ? "Yarım gün" : "Tam gün"}${
        day.off.source === "weekly" ? " (haftalık)" : ""
      }`,
    ]);
    if (day.off.note) rows.push(["Açıklama", day.off.note]);
  }
  if (day.note) rows.push(["Not", day.note]);
  if (day.excuse) rows.push(["Mazeret", day.excuse]);

  return rows;
}

/** Fare ile üzerine gelince açılan balon — yalnızca imleçli cihazlarda görünür (CSS). */
function DayTooltip({ day }: { day: AttendanceDay }) {
  return (
    <span className="attendance-cal-tip" role="tooltip">
      {dayRows(day).map(([label, value]) => (
        <span key={label} className="attendance-cal-tip-row">
          <span className="attendance-cal-tip-label">{label}:</span>
          <span className="attendance-cal-tip-value">{value}</span>
        </span>
      ))}
    </span>
  );
}

/** Dokunmatikte hover olmadığı için seçilen gün takvimin altında kart olarak açılır.
 *  İzinli ve gelecek günler dışında durum/saat düzeltilebilir ve mazeret girilebilir. */
function DayEditor({
  day,
  employeeId,
  onClose,
  onSaved,
}: {
  day: AttendanceDay;
  employeeId: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const hasEntry = day.entryId != null;
  const editable = day.dayStatus !== "off" && day.dayStatus !== "future";

  const [status, setStatus] = useState<AttendanceStatus>(day.status ?? "full");
  const [time, setTime] = useState(() => timeValue(day.checkInAt) || "09:00");
  const [note, setNote] = useState(day.note ?? "");
  const [excuse, setExcuse] = useState(day.excuse ?? "");
  /** Kaydı olmayan günde "Kayıt oluştur" açılana kadar sadece mazeret girilir. */
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Başka bir güne geçilince form o günün değerleriyle yeniden kurulur.
  useEffect(() => {
    setStatus(day.status ?? "full");
    setTime(timeValue(day.checkInAt) || "09:00");
    setNote(day.note ?? "");
    setExcuse(day.excuse ?? "");
    setCreating(false);
    setError(null);
  }, [day.date, day.status, day.checkInAt, day.note, day.excuse]);

  const excuseChanged = excuse.trim() !== (day.excuse ?? "");

  const handleSave = async () => {
    setBusy(true);
    setError(null);
    try {
      if (hasEntry) {
        await updateAttendanceEntry(day.entryId!, {
          workDate: day.date,
          time: time || undefined,
          status,
          note: note.trim() || null,
        });
      } else if (creating) {
        await createAttendanceEntry({
          employeeId,
          workDate: day.date,
          status,
          time: time || undefined,
          note: note.trim() || null,
        });
      }
      if (excuseChanged) {
        await saveAttendanceExcuse({
          employeeId,
          workDate: day.date,
          note: excuse.trim() || null,
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteEntry = async () => {
    if (!day.entryId) return;
    if (!confirm(`${formatDate(day.date)} kaydı silinsin mi? (Gelmedi olarak görünecek)`)) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await deleteAttendanceEntry(day.entryId);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Silinemedi.");
    } finally {
      setBusy(false);
    }
  };

  const canSave = hasEntry || creating || excuseChanged;

  return (
    <div className={`attendance-day-card is-${day.dayStatus}`}>
      <div className="attendance-day-card-head">
        <span className="attendance-day-card-title">
          {formatDate(day.date)} · {WEEKDAY_LABELS[day.weekday]}
        </span>
        <span className={`attendance-day-card-status is-${day.dayStatus}`}>
          {DAY_STATUS_LABELS[day.dayStatus]}
        </span>
        <button
          type="button"
          className="attendance-day-card-close"
          aria-label="Gün detayını kapat"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      <dl className="attendance-day-card-rows">
        {dayRows(day)
          // Tarih/Durum başlıkta, Not ve Mazeret aşağıda düzenlenebilir alanlarda
          .filter(
            ([label]) =>
              label !== "Tarih" &&
              label !== "Durum" &&
              !(editable && (label === "Not" || label === "Mazeret"))
          )
          .map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
      </dl>

      {!editable ? (
        <p className="attendance-day-edit-hint">
          {day.dayStatus === "off"
            ? "İzinli günler düzenlenmez. İzin günlerini Ayarlar'dan yönetin."
            : "Henüz gelmemiş bir gün için kayıt açılamaz."}
        </p>
      ) : (
        <div className="attendance-day-edit">
          {!hasEntry && !creating && (
            <button
              type="button"
              className="attendance-day-edit-add"
              onClick={() => setCreating(true)}
              disabled={busy}
            >
              Bu güne yoklama kaydı oluştur
            </button>
          )}

          {(hasEntry || creating) && (
            <div className="attendance-day-edit-grid">
              <label className="attendance-day-edit-field">
                <span>Durum</span>
                <select
                  className="admin-input"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
                  disabled={busy}
                >
                  <option value="full">Tam Gün</option>
                  <option value="half">Yarım Gün</option>
                </select>
              </label>
              <label className="attendance-day-edit-field">
                <span>Giriş saati</span>
                <input
                  type="time"
                  className="admin-input"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  disabled={busy}
                />
              </label>
              <label className="attendance-day-edit-field is-wide">
                <span>Açıklama</span>
                <input
                  type="text"
                  className="admin-input"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="İsteğe bağlı not"
                  maxLength={200}
                  disabled={busy}
                />
              </label>
            </div>
          )}

          <label className="attendance-day-edit-field is-wide">
            <span>Mazeret</span>
            <input
              type="text"
              className="admin-input"
              value={excuse}
              onChange={(e) => setExcuse(e.target.value)}
              placeholder="Örn. hasta oldu, rapor aldı"
              maxLength={300}
              disabled={busy}
            />
          </label>
          <p className="attendance-day-edit-note">
            Mazeret yalnızca açıklamadır; rapor sayılarını değiştirmez.
          </p>

          {error && <p className="attendance-day-edit-error">{error}</p>}

          <div className="attendance-day-edit-actions">
            <button
              type="button"
              className="admin-btn-primary"
              onClick={() => void handleSave()}
              disabled={busy || !canSave}
            >
              {busy ? "Kaydediliyor…" : "Kaydet"}
            </button>
            {creating && !hasEntry && (
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => setCreating(false)}
                disabled={busy}
              >
                Kayıt açmaktan vazgeç
              </button>
            )}
            {hasEntry && (
              <button
                type="button"
                className="attendance-day-edit-delete"
                onClick={() => void handleDeleteEntry()}
                disabled={busy}
              >
                Kaydı sil
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DayCell({
  day,
  today,
  selected,
  onSelect,
}: {
  day: AttendanceDay;
  today: string;
  selected: boolean;
  onSelect: (date: string) => void;
}) {
  const [, , dayNum] = day.date.split("-");
  return (
    <button
      type="button"
      onClick={() => onSelect(day.date)}
      className={`${dayClass(day.dayStatus)}${day.date === today ? " is-today" : ""}${
        selected ? " is-selected" : ""
      }${day.excuse ? " has-excuse" : ""}`}
      aria-pressed={selected}
      aria-label={`${formatDate(day.date)} — ${DAY_STATUS_LABELS[day.dayStatus]}${
        day.isLate ? `, ${formatLateMinutes(day.lateMinutes)} geç` : ""
      }${day.excuse ? `, mazeret: ${day.excuse}` : ""}`}
    >
      {day.excuse && (
        <span className="attendance-cal-excuse-dot" aria-hidden title={day.excuse} />
      )}
      <span className="attendance-cal-daynum">{Number(dayNum)}</span>
      {day.checkInAt && (
        <span className="attendance-cal-daytime">{formatTime(day.checkInAt)}</span>
      )}
      {day.isLate && (
        <span className="attendance-cal-daylate">+{day.lateMinutes}dk</span>
      )}
      <DayTooltip day={day} />
    </button>
  );
}

interface EmployeeAttendanceDetailProps {
  employeeId: number;
  employeeName: string;
  /** Takvimden bir gün düzenlendiğinde üst listenin de tazelenmesi için. */
  onChanged?: () => void;
}

export default function EmployeeAttendanceDetail({
  employeeId,
  employeeName,
  onChanged,
}: EmployeeAttendanceDetailProps) {
  const today = useMemo(() => istanbulToday(), []);
  const [view, setView] = useState<ViewMode>("month");
  const [year, setYear] = useState(() => Number(today.slice(0, 4)));
  const [month, setMonth] = useState(() => Number(today.slice(5, 7)));
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));

  const [detail, setDetail] = useState<AttendanceEmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const range = useMemo(() => {
    if (view === "week") return { from: weekStart, to: addDays(weekStart, 6) };
    return {
      from: toDateStr(year, month, 1),
      to: toDateStr(year, month, daysInMonth(year, month)),
    };
  }, [view, weekStart, year, month]);

  /** `keepSelection` — kaydetme sonrası aynı gün açık kalsın diye. */
  const load = useCallback(
    async (keepSelection = false) => {
      setLoading(true);
      setError(null);
      if (!keepSelection) setSelectedDate(null);
      try {
        setDetail(await fetchEmployeeAttendance(employeeId, range.from, range.to));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Personel yoklaması yüklenemedi.");
        setDetail(null);
      } finally {
        setLoading(false);
      }
    },
    [employeeId, range.from, range.to]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const shiftMonth = (delta: number) => {
    const next = month + delta;
    if (next < 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else if (next > 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth(next);
    }
  };

  const days = useMemo(() => detail?.days ?? [], [detail]);

  /** Ayın 1'i haftanın hangi sütununda başlıyor (Pazartesi = 0). */
  const leadingBlanks = useMemo(() => {
    if (view !== "month" || days.length === 0) return 0;
    const weekday = days[0].weekday; // 0 = Pazar
    return weekday === 0 ? 6 : weekday - 1;
  }, [view, days]);

  const summary = detail?.summary;
  const selectedDay = days.find((d) => d.date === selectedDate) ?? null;

  return (
    <div className="attendance-detail">
      <div className="attendance-detail-toolbar">
        <div className="attendance-presets">
          <button
            type="button"
            className={`attendance-preset ${view === "month" ? "is-active" : ""}`}
            onClick={() => setView("month")}
          >
            Aylık
          </button>
          <button
            type="button"
            className={`attendance-preset ${view === "week" ? "is-active" : ""}`}
            onClick={() => {
              setView("week");
              setWeekStart(startOfWeek(today));
            }}
          >
            Haftalık
          </button>
        </div>

        <div className="attendance-cal-nav">
          <button
            type="button"
            className="attendance-cal-nav-btn"
            aria-label="Önceki"
            onClick={() =>
              view === "month" ? shiftMonth(-1) : setWeekStart((w) => addDays(w, -7))
            }
          >
            ‹
          </button>
          <span className="attendance-cal-nav-label">
            {view === "month"
              ? `${MONTH_NAMES[month - 1]} ${year}`
              : `${formatDate(range.from)} – ${formatDate(range.to)}`}
          </span>
          <button
            type="button"
            className="attendance-cal-nav-btn"
            aria-label="Sonraki"
            onClick={() =>
              view === "month" ? shiftMonth(1) : setWeekStart((w) => addDays(w, 7))
            }
          >
            ›
          </button>
        </div>
      </div>

      {detail && (
        <p className="attendance-detail-shift">
          {employeeName} · {SHIFT_LABELS[detail.shift]} · Mesai başlangıcı{" "}
          <strong>{detail.expectedStart}</strong> (bu saatten sonra geç giriş)
        </p>
      )}

      {/* Özet kartları */}
      <div className="attendance-detail-summary">
        <div className="attendance-detail-stat">
          <span className="attendance-detail-stat-label">Toplam çalışma günü</span>
          <span className="attendance-detail-stat-value">{summary?.workDays ?? "—"}</span>
        </div>
        <div className="attendance-detail-stat">
          <span className="attendance-detail-stat-label">Geldiği gün</span>
          <span className="attendance-detail-stat-value is-present">
            {summary?.present ?? "—"}
          </span>
        </div>
        <div className="attendance-detail-stat">
          <span className="attendance-detail-stat-label">Gelmediği gün</span>
          <span className="attendance-detail-stat-value is-absent">
            {summary?.absent ?? "—"}
          </span>
        </div>
        <div className="attendance-detail-stat">
          <span className="attendance-detail-stat-label">Geç giriş</span>
          <span className="attendance-detail-stat-value is-late">
            {summary?.lateCount ?? "—"}
          </span>
        </div>
        <div className="attendance-detail-stat">
          <span className="attendance-detail-stat-label">Toplam geç kalma</span>
          <span className="attendance-detail-stat-value is-late">
            {summary ? formatLateMinutes(summary.lateMinutes) : "—"}
          </span>
        </div>
        <div className="attendance-detail-stat">
          <span className="attendance-detail-stat-label">İzinli gün</span>
          <span className="attendance-detail-stat-value is-off">
            {summary?.offDays ?? "—"}
          </span>
        </div>
      </div>

      {error && <div className="admin-alert admin-alert-error mt-3">{error}</div>}

      {loading ? (
        <p className="mt-6 text-center text-sm text-zinc-500">Yükleniyor…</p>
      ) : (
        <>
          <div className="attendance-cal">
            <div className="attendance-cal-head">
              {WEEK_HEADERS.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
            <div className="attendance-cal-grid">
              {Array.from({ length: leadingBlanks }, (_, i) => (
                <div key={`blank-${i}`} className="attendance-cal-day is-blank" aria-hidden />
              ))}
              {days.map((day) => (
                <DayCell
                  key={day.date}
                  day={day}
                  today={today}
                  selected={day.date === selectedDate}
                  onSelect={(date) =>
                    setSelectedDate((current) => (current === date ? null : date))
                  }
                />
              ))}
            </div>
          </div>

          {selectedDay ? (
            <DayEditor
              day={selectedDay}
              employeeId={employeeId}
              onClose={() => setSelectedDate(null)}
              onSaved={() => {
                void load(true);
                onChanged?.();
              }}
            />
          ) : (
            <p className="attendance-cal-hint">
              Bir güne dokunun; giriş saatini ve durumu düzeltebilir, mazeret girebilirsiniz.
            </p>
          )}

          <ul className="attendance-cal-legend">
            <li>
              <span className="attendance-cal-swatch is-onTime" /> Zamanında
            </li>
            <li>
              <span className="attendance-cal-swatch is-late" /> Geç giriş
            </li>
            <li>
              <span className="attendance-cal-swatch is-absent" /> Gelmedi
            </li>
            <li>
              <span className="attendance-cal-swatch is-off" /> İzinli
            </li>
            <li>
              <span className="attendance-cal-swatch is-future" /> Yoklama yok
            </li>
            <li>
              <span className="attendance-cal-swatch is-excuse" /> Mazeretli
            </li>
          </ul>

          {/* Haftalık görünümde gün gün liste — mobilde tooltip yerine okunur özet */}
          {view === "week" && (
            <div className="attendance-week-list">
              {days.map((day) => (
                <div key={day.date} className={`attendance-week-row is-${day.dayStatus}`}>
                  <span className="attendance-week-date">
                    {formatDate(day.date)}
                    <span className="attendance-week-weekday">
                      {WEEKDAY_LABELS[day.weekday]}
                    </span>
                  </span>
                  <span className="attendance-week-status">
                    {DAY_STATUS_LABELS[day.dayStatus]}
                  </span>
                  <span className="attendance-week-time">
                    {day.checkInAt ? formatTime(day.checkInAt) : "—"}
                    {day.isLate && (
                      <span className="attendance-week-late">
                        {" "}
                        (+{formatLateMinutes(day.lateMinutes)})
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
