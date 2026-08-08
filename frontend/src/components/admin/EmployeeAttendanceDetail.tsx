"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchEmployeeAttendance } from "@/lib/attendance-api";
import {
  DAY_STATUS_LABELS,
  SHIFT_LABELS,
  WEEKDAY_LABELS,
  formatLateMinutes,
  type AttendanceDay,
  type AttendanceDayStatus,
  type AttendanceEmployeeDetail,
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

function dayClass(status: AttendanceDayStatus): string {
  return `attendance-cal-day is-${status}`;
}

/** Gün hücresinin üstündeki tooltip içeriği. */
function DayTooltip({ day }: { day: AttendanceDay }) {
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

  return (
    <span className="attendance-cal-tip" role="tooltip">
      {rows.map(([label, value]) => (
        <span key={label} className="attendance-cal-tip-row">
          <span className="attendance-cal-tip-label">{label}:</span>
          <span className="attendance-cal-tip-value">{value}</span>
        </span>
      ))}
    </span>
  );
}

function DayCell({ day, today }: { day: AttendanceDay; today: string }) {
  const [, , dayNum] = day.date.split("-");
  return (
    <div
      className={`${dayClass(day.dayStatus)}${day.date === today ? " is-today" : ""}`}
      tabIndex={0}
      aria-label={`${formatDate(day.date)} — ${DAY_STATUS_LABELS[day.dayStatus]}`}
    >
      <span className="attendance-cal-daynum">{Number(dayNum)}</span>
      {day.checkInAt && (
        <span className="attendance-cal-daytime">{formatTime(day.checkInAt)}</span>
      )}
      {day.isLate && (
        <span className="attendance-cal-daylate">+{day.lateMinutes}dk</span>
      )}
      <DayTooltip day={day} />
    </div>
  );
}

interface EmployeeAttendanceDetailProps {
  employeeId: number;
  employeeName: string;
}

export default function EmployeeAttendanceDetail({
  employeeId,
  employeeName,
}: EmployeeAttendanceDetailProps) {
  const today = useMemo(() => istanbulToday(), []);
  const [view, setView] = useState<ViewMode>("month");
  const [year, setYear] = useState(() => Number(today.slice(0, 4)));
  const [month, setMonth] = useState(() => Number(today.slice(5, 7)));
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));

  const [detail, setDetail] = useState<AttendanceEmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => {
    if (view === "week") return { from: weekStart, to: addDays(weekStart, 6) };
    return {
      from: toDateStr(year, month, 1),
      to: toDateStr(year, month, daysInMonth(year, month)),
    };
  }, [view, weekStart, year, month]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDetail(await fetchEmployeeAttendance(employeeId, range.from, range.to));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Personel yoklaması yüklenemedi.");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [employeeId, range.from, range.to]);

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
                <DayCell key={day.date} day={day} today={today} />
              ))}
            </div>
          </div>

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
