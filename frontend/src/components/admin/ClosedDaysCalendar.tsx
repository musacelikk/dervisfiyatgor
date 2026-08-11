"use client";

import { useMemo, useState } from "react";
import type { ClosedDay, ClosedDayType } from "@/types/shift";

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

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** 0 = Pazar … 6 = Cumartesi */
function weekdayOf(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

type ClosedDaysCalendarProps = {
  closedDays: ClosedDay[];
  /** Ayarlardaki haftalık otomatik izin günleri (0 = Pazar). Bilgi amaçlı gösterilir. */
  weeklyOffDays: number[];
  /** Bir güne dokunulduğunda: mevcutsa kaldırır, değilse seçili tiple ekler. */
  onToggleDay: (date: string, type: ClosedDayType) => Promise<void> | void;
  busyDate?: string | null;
  disabled?: boolean;
};

/**
 * Ay bazlı izinli gün takvimi. Üstteki Tam gün / Yarım gün kalemi seçilir,
 * bir güne dokunmak o günü anında izinli yapar; izinli güne tekrar dokunmak kaldırır.
 * Haftalık otomatik izinler soluk gösterilir ve tıklanamaz — onlar Ayarlar'dan yönetilir.
 */
export default function ClosedDaysCalendar({
  closedDays,
  weeklyOffDays,
  onToggleDay,
  busyDate = null,
  disabled = false,
}: ClosedDaysCalendarProps) {
  const today = useMemo(() => istanbulToday(), []);
  const [year, setYear] = useState(() => Number(today.slice(0, 4)));
  const [month, setMonth] = useState(() => Number(today.slice(5, 7)));
  const [pen, setPen] = useState<ClosedDayType>("full");

  const byDate = useMemo(
    () => new Map(closedDays.map((d) => [d.date, d])),
    [closedDays]
  );

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

  const total = daysInMonth(year, month);
  const firstWeekday = weekdayOf(year, month, 1);
  /** Ayın 1'i haftanın hangi sütununda başlıyor (Pazartesi = 0). */
  const leadingBlanks = firstWeekday === 0 ? 6 : firstWeekday - 1;

  const monthCount = useMemo(() => {
    const prefix = `${year}-${pad(month)}-`;
    return closedDays.filter((d) => d.date.startsWith(prefix)).length;
  }, [closedDays, year, month]);

  return (
    <div className="closed-cal">
      <div className="closed-cal-toolbar">
        <div className="closed-cal-pen" role="group" aria-label="İzin tipi">
          <button
            type="button"
            className={`closed-cal-pen-btn${pen === "full" ? " is-active" : ""}`}
            aria-pressed={pen === "full"}
            onClick={() => setPen("full")}
            disabled={disabled}
          >
            Tam gün
          </button>
          <button
            type="button"
            className={`closed-cal-pen-btn${pen === "half" ? " is-active" : ""}`}
            aria-pressed={pen === "half"}
            onClick={() => setPen("half")}
            disabled={disabled}
          >
            Yarım gün
          </button>
        </div>

        <div className="closed-cal-nav">
          <button
            type="button"
            className="closed-cal-nav-btn"
            aria-label="Önceki ay"
            onClick={() => shiftMonth(-1)}
            disabled={disabled}
          >
            ‹
          </button>
          <span className="closed-cal-nav-label">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button
            type="button"
            className="closed-cal-nav-btn"
            aria-label="Sonraki ay"
            onClick={() => shiftMonth(1)}
            disabled={disabled}
          >
            ›
          </button>
        </div>
      </div>

      <div className="closed-cal-head">
        {WEEK_HEADERS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="closed-cal-grid">
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <div key={`blank-${i}`} className="closed-cal-day is-blank" aria-hidden />
        ))}
        {Array.from({ length: total }, (_, i) => {
          const day = i + 1;
          const date = `${year}-${pad(month)}-${pad(day)}`;
          const entry = byDate.get(date);
          const weekly = weeklyOffDays.includes(weekdayOf(year, month, day));
          const isBusy = busyDate === date;

          const classes = ["closed-cal-day"];
          if (entry) classes.push(entry.type === "half" ? "is-half" : "is-full");
          else if (weekly) classes.push("is-weekly");
          if (date === today) classes.push("is-today");
          if (isBusy) classes.push("is-busy");

          const label = entry
            ? `${day} ${MONTH_NAMES[month - 1]} — ${entry.type === "half" ? "yarım gün" : "tam gün"} izinli, kaldırmak için dokunun`
            : weekly
              ? `${day} ${MONTH_NAMES[month - 1]} — haftalık otomatik izin`
              : `${day} ${MONTH_NAMES[month - 1]} — ${pen === "half" ? "yarım gün" : "tam gün"} izinli yap`;

          return (
            <button
              key={date}
              type="button"
              className={classes.join(" ")}
              aria-pressed={Boolean(entry)}
              aria-label={label}
              title={entry?.note ?? (weekly ? "Haftalık otomatik izin" : undefined)}
              disabled={disabled || isBusy}
              onClick={() => void onToggleDay(date, pen)}
            >
              <span className="closed-cal-daynum">{day}</span>
              {entry?.note && <span className="closed-cal-daynote">{entry.note}</span>}
              {!entry && weekly && (
                <span className="closed-cal-dayweekly" aria-hidden>
                  haftalık
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="closed-cal-footer">
        <ul className="closed-cal-legend">
          <li>
            <span className="closed-cal-swatch is-full" /> Tam gün
          </li>
          <li>
            <span className="closed-cal-swatch is-half" /> Yarım gün
          </li>
          <li>
            <span className="closed-cal-swatch is-weekly" /> Haftalık otomatik
          </li>
        </ul>
        <span className="closed-cal-count">
          Bu ayda {monthCount} izinli gün
        </span>
      </div>
    </div>
  );
}
