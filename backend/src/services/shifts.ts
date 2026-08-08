import crypto from "crypto";
import { getPool, isPostgres } from "../lib/database";
import { db as getSqliteDb } from "./db-sqlite";
import { haversineMeters } from "../lib/geo";
import {
  getShopLocation,
  getShopRadiusMeters,
  istanbulDateString,
  maghribCutoffUTC,
} from "../lib/sunset";
import {
  lateness,
  normalizeShift,
  statusForCheckIn,
  weekdayOf,
  type AttendanceDayStatus,
  type AttendanceStatus,
  type AttendanceStatusOrAbsent,
  type EmployeeShift,
} from "../lib/attendance";
import { listEmployees } from "./employees";
import { excuseMap } from "./attendanceExcuses";
import { getAttendanceSettings, getClosedDays, type AttendanceSettings } from "./settings";
import type {
  AttendanceDay,
  AttendanceEmployeeDetail,
  AttendanceOffInfo,
  AttendanceReport,
  AttendanceReportEmployee,
  AttendanceRow,
  AttendanceSummary,
  ShiftEntry,
} from "../types/shift";

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 gün
/** Yoklama listeleri için üst sınır — aralık patlamasını önler. */
const MAX_RANGE_DAYS = 92;
/** Personel detay takvimi bir yıla kadar geriye/ileriye bakabilir. */
const MAX_DETAIL_DAYS = 400;

type Row = Record<string, unknown>;

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  const s = String(value);
  // SQLite "YYYY-MM-DD HH:MM:SS" (UTC, boşluklu) → ISO
  return s.includes("T") ? s : `${s.replace(" ", "T")}Z`;
}

function mapEntry(row: Row): ShiftEntry {
  const checkInAt = toIso(row.check_in_at);
  const stored = row.status;
  return {
    id: Number(row.id),
    employeeId: Number(row.employee_id),
    employeeName: row.employee_name != null ? String(row.employee_name) : undefined,
    workDate: String(row.work_date),
    checkInAt,
    checkOutAt: row.check_out_at == null ? null : toIso(row.check_out_at),
    lat: row.lat == null ? null : Number(row.lat),
    lng: row.lng == null ? null : Number(row.lng),
    distanceM: row.distance_m == null ? null : Number(row.distance_m),
    // Eski kayıtlarda status boş olabilir → giriş saatinden türetilir
    status:
      stored === "full" || stored === "half"
        ? (stored as AttendanceStatus)
        : statusForCheckIn(new Date(checkInAt)),
    note: row.note == null ? null : String(row.note),
    createdBy: row.created_by == null ? null : String(row.created_by),
  };
}

/* ————————————————— Token (aylık, cihazda saklanır) ————————————————— */

export async function createShiftToken(employeeId: number): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  if (isPostgres()) {
    await getPool().query(
      `INSERT INTO shift_tokens (token, employee_id, expires_at) VALUES ($1, $2, $3)`,
      [token, employeeId, expiresAt]
    );
    return token;
  }
  getSqliteDb()
    .prepare(`INSERT INTO shift_tokens (token, employee_id, expires_at) VALUES (?, ?, ?)`)
    .run(token, employeeId, expiresAt.toISOString());
  return token;
}

export async function validateShiftToken(
  token: string
): Promise<{ employeeId: number } | null> {
  if (!token) return null;
  if (isPostgres()) {
    const { rows } = await getPool().query(
      `SELECT employee_id, expires_at FROM shift_tokens WHERE token = $1`,
      [token]
    );
    const row = rows[0];
    if (!row) return null;
    if (new Date(row.expires_at).getTime() < Date.now()) {
      await getPool().query(`DELETE FROM shift_tokens WHERE token = $1`, [token]);
      return null;
    }
    return { employeeId: Number(row.employee_id) };
  }
  const row = getSqliteDb()
    .prepare(`SELECT employee_id, expires_at FROM shift_tokens WHERE token = ?`)
    .get(token) as { employee_id: number; expires_at: string } | undefined;
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    getSqliteDb().prepare(`DELETE FROM shift_tokens WHERE token = ?`).run(token);
    return null;
  }
  return { employeeId: row.employee_id };
}

export async function revokeShiftToken(token: string): Promise<void> {
  if (!token) return;
  if (isPostgres()) {
    await getPool().query(`DELETE FROM shift_tokens WHERE token = $1`, [token]);
    return;
  }
  getSqliteDb().prepare(`DELETE FROM shift_tokens WHERE token = ?`).run(token);
}

export async function revokeShiftTokensForEmployee(employeeId: number): Promise<void> {
  if (isPostgres()) {
    await getPool().query(`DELETE FROM shift_tokens WHERE employee_id = $1`, [employeeId]);
    return;
  }
  getSqliteDb().prepare(`DELETE FROM shift_tokens WHERE employee_id = ?`).run(employeeId);
}

/* ————————————————— Mesai kaydı ————————————————— */

/** Akşam ezanı (gün batımı) geçmiş ama hâlâ açık olan mesai kayıtlarını kapatır. */
export async function closeExpiredShiftEntries(): Promise<number> {
  const openDates = isPostgres()
    ? (
        await getPool().query(
          `SELECT DISTINCT work_date FROM shift_entries WHERE check_out_at IS NULL`
        )
      ).rows.map((r) => String(r.work_date))
    : (
        getSqliteDb()
          .prepare(`SELECT DISTINCT work_date FROM shift_entries WHERE check_out_at IS NULL`)
          .all() as { work_date: string }[]
      ).map((r) => r.work_date);

  const now = Date.now();
  let closed = 0;
  for (const workDate of openDates) {
    const cutoff = maghribCutoffUTC(workDate);
    if (cutoff.getTime() > now) continue;
    if (isPostgres()) {
      const result = await getPool().query(
        `UPDATE shift_entries SET check_out_at = $1
         WHERE work_date = $2 AND check_out_at IS NULL`,
        [cutoff, workDate]
      );
      closed += result.rowCount ?? 0;
    } else {
      const result = getSqliteDb()
        .prepare(
          `UPDATE shift_entries SET check_out_at = ?
           WHERE work_date = ? AND check_out_at IS NULL`
        )
        .run(cutoff.toISOString(), workDate);
      closed += result.changes;
    }
  }
  return closed;
}

export async function getTodayEntry(employeeId: number): Promise<ShiftEntry | null> {
  const workDate = istanbulDateString();
  if (isPostgres()) {
    const { rows } = await getPool().query(
      `SELECT * FROM shift_entries WHERE employee_id = $1 AND work_date = $2`,
      [employeeId, workDate]
    );
    return rows[0] ? mapEntry(rows[0]) : null;
  }
  const row = getSqliteDb()
    .prepare(`SELECT * FROM shift_entries WHERE employee_id = ? AND work_date = ?`)
    .get(employeeId, workDate) as Row | undefined;
  return row ? mapEntry(row) : null;
}

export class OutOfRangeError extends Error {
  distanceM: number;
  constructor(distanceM: number) {
    super(
      `Dükkana çok uzaksınız (${Math.round(distanceM)} m). Mesaiye başlamak için dükkanda olmalısınız.`
    );
    this.name = "OutOfRangeError";
    this.distanceM = distanceM;
  }
}

async function recordDeniedAttempt(
  employeeId: number,
  lat: number,
  lng: number,
  distanceM: number
): Promise<void> {
  const workDate = istanbulDateString();
  const now = new Date();
  if (isPostgres()) {
    await getPool().query(
      `INSERT INTO shift_denied_attempts (employee_id, work_date, attempted_at, lat, lng, distance_m)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [employeeId, workDate, now, lat, lng, distanceM]
    );
    return;
  }
  getSqliteDb()
    .prepare(
      `INSERT INTO shift_denied_attempts (employee_id, work_date, attempted_at, lat, lng, distance_m)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(employeeId, workDate, now.toISOString(), lat, lng, distanceM);
}

export async function checkIn(
  employeeId: number,
  lat: number,
  lng: number
): Promise<{ entry: ShiftEntry; alreadyStarted: boolean; distanceM: number }> {
  await closeExpiredShiftEntries();

  const shop = getShopLocation();
  const distanceM = haversineMeters(lat, lng, shop.lat, shop.lng);
  if (distanceM > getShopRadiusMeters()) {
    await recordDeniedAttempt(employeeId, lat, lng, distanceM).catch(() => {
      /* deneme kaydı yazılamazsa giriş reddi yine de uygulanır */
    });
    throw new OutOfRangeError(distanceM);
  }

  const existing = await getTodayEntry(employeeId);
  if (existing) {
    return { entry: existing, alreadyStarted: true, distanceM };
  }

  const workDate = istanbulDateString();
  const now = new Date();
  const status = statusForCheckIn(now);

  if (isPostgres()) {
    await getPool().query(
      `INSERT INTO shift_entries (employee_id, work_date, check_in_at, lat, lng, distance_m, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (employee_id, work_date) DO NOTHING`,
      [employeeId, workDate, now, lat, lng, distanceM, status]
    );
  } else {
    try {
      getSqliteDb()
        .prepare(
          `INSERT INTO shift_entries (employee_id, work_date, check_in_at, lat, lng, distance_m, status)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(employeeId, workDate, now.toISOString(), lat, lng, distanceM, status);
    } catch {
      // UNIQUE(employee_id, work_date): eşzamanlı çift tıklama — mevcut kayıt döner
    }
  }

  const entry = await getTodayEntry(employeeId);
  if (!entry) throw new Error("Mesai kaydı oluşturulamadı.");
  return { entry, alreadyStarted: false, distanceM };
}

/* ————————————————— Yoklama listeleme / özet / rapor ————————————————— */

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function datesInRange(from: string, to: string): string[] {
  const out: string[] = [];
  const today = istanbulDateString();
  let cursor = from;
  let guard = 0;
  while (cursor <= to && guard < MAX_RANGE_DAYS) {
    // Gelecek günler "Gelmedi" sayılmaz
    if (cursor <= today) out.push(cursor);
    cursor = addDays(cursor, 1);
    guard++;
  }
  return out;
}

/** Takvim için gelecek günler dahil tüm aralık. */
function allDatesInRange(from: string, to: string): string[] {
  const out: string[] = [];
  let cursor = from;
  let guard = 0;
  while (cursor <= to && guard < MAX_DETAIL_DAYS) {
    out.push(cursor);
    cursor = addDays(cursor, 1);
    guard++;
  }
  return out;
}

/* ————————————————— İzin / vardiya türetmeleri ————————————————— */

const WEEKDAY_NAMES = [
  "Pazar",
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
] as const;

type OffResolver = (workDate: string) => AttendanceOffInfo | null;

/** Haftalık otomatik izin günleri (varsayılan Pazar) + elle eklenen tatiller.
 *  Haftalık kural her ay kendiliğinden uygulanır, elle işaretlemeye gerek yoktur. */
async function buildOffResolver(): Promise<OffResolver> {
  const [closedDays, settings] = await Promise.all([getClosedDays(), getAttendanceSettings()]);
  const manual = new Map(closedDays.map((d) => [d.date, d]));
  const weekly = new Set(settings.weeklyOffDays);

  return (workDate) => {
    const override = manual.get(workDate);
    if (override) {
      return { type: override.type, note: override.note, source: "manual" };
    }
    const weekday = weekdayOf(workDate);
    if (weekly.has(weekday)) {
      return {
        type: "full",
        note: `${WEEKDAY_NAMES[weekday] ?? "Haftalık"} — haftalık izin`,
        source: "weekly",
      };
    }
    return null;
  };
}

/** Personelin vardiyasına karşılık gelen geç giriş sınırı ("HH:MM"). */
export function shiftLateLimit(settings: AttendanceSettings, shift: EmployeeShift): string {
  return shift === "2" ? settings.shift2LateAfter : settings.shift1LateAfter;
}

function entryLateness(
  entry: ShiftEntry | null,
  expectedStart: string
): { isLate: boolean; lateMinutes: number } {
  if (!entry) return { isLate: false, lateMinutes: 0 };
  return lateness(new Date(entry.checkInAt), expectedStart);
}

/** Takvim rengi: yeşil (zamanında), sarı (geç), kırmızı (gelmedi), izinli, gri (veri yok). */
function deriveDayStatus(input: {
  workDate: string;
  today: string;
  hasEntry: boolean;
  isLate: boolean;
  off: AttendanceOffInfo | null;
  beforeHire: boolean;
}): AttendanceDayStatus {
  if (input.hasEntry) return input.isLate ? "late" : "onTime";
  if (input.beforeHire) return "future";
  // İzin günleri önceden bellidir; gelecekteki pazarlar/tatiller de izinli görünür.
  // Yarım gün izinde çalışma beklenir — gelinmediyse devamsızlık sayılır.
  if (input.off && input.off.type === "full") return "off";
  if (input.workDate > input.today) return "future";
  return "absent";
}

function hiredBefore(createdAt: string | undefined, workDate: string): boolean {
  return Boolean(createdAt) && workDate < createdAt!.slice(0, 10);
}

async function listEntriesRaw(filters: {
  employeeId?: number;
  from?: string;
  to?: string;
}): Promise<ShiftEntry[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  const ph = () => (isPostgres() ? `$${params.length}` : "?");

  if (filters.employeeId) {
    params.push(filters.employeeId);
    conditions.push(`se.employee_id = ${ph()}`);
  }
  if (filters.from) {
    params.push(filters.from);
    conditions.push(`se.work_date >= ${ph()}`);
  }
  if (filters.to) {
    params.push(filters.to);
    conditions.push(`se.work_date <= ${ph()}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `SELECT se.*, e.name AS employee_name
     FROM shift_entries se
     JOIN employees e ON e.id = se.employee_id
     ${where}
     ORDER BY se.work_date DESC, se.check_in_at DESC`;

  if (isPostgres()) {
    const { rows } = await getPool().query(sql, params);
    return rows.map(mapEntry);
  }
  const rows = getSqliteDb().prepare(sql).all(...params) as Row[];
  return rows.map(mapEntry);
}

/** Ham mesai kayıtları (yoklama türetmesi yapılmaz). */
export async function listShiftEntries(filters: {
  employeeId?: number;
  from?: string;
  to?: string;
}): Promise<ShiftEntry[]> {
  await closeExpiredShiftEntries();
  return listEntriesRaw(filters);
}

/** Yoklama tablosu: her (personel, gün) için Tam Gün / Yarım Gün / Gelmedi. */
export async function listAttendance(filters: {
  from: string;
  to: string;
  employeeId?: number;
  status?: AttendanceStatusOrAbsent;
}): Promise<AttendanceRow[]> {
  await closeExpiredShiftEntries();

  const employees = (await listEmployees()).filter((e) => e.active);
  const targets = filters.employeeId
    ? employees.filter((e) => e.id === filters.employeeId)
    : employees;
  const entries = await listEntriesRaw({
    employeeId: filters.employeeId,
    from: filters.from,
    to: filters.to,
  });
  const [resolveOff, settings, excuses] = await Promise.all([
    buildOffResolver(),
    getAttendanceSettings(),
    excuseMap(filters.from, filters.to, filters.employeeId),
  ]);
  const today = istanbulDateString();

  const byKey = new Map<string, ShiftEntry>();
  for (const entry of entries) {
    byKey.set(`${entry.employeeId}|${entry.workDate}`, entry);
  }

  const days = datesInRange(filters.from, filters.to);
  const rows: AttendanceRow[] = [];
  for (const day of days) {
    const off = resolveOff(day);
    for (const employee of targets) {
      // Personel işe alınmadan önceki günler yoklamaya girmez
      if (hiredBefore(employee.createdAt, day)) continue;
      const entry = byKey.get(`${employee.id}|${day}`) ?? null;
      const shift = normalizeShift(employee.shift);
      const expectedStart = shiftLateLimit(settings, shift);
      const { isLate, lateMinutes } = entryLateness(entry, expectedStart);
      const dayStatus = deriveDayStatus({
        workDate: day,
        today,
        hasEntry: Boolean(entry),
        isLate,
        off,
        beforeHire: false,
      });
      const status: AttendanceStatusOrAbsent = entry
        ? entry.status
        : dayStatus === "off"
          ? "off"
          : "absent";
      if (filters.status && filters.status !== status) continue;
      rows.push({
        employeeId: employee.id,
        employeeName: employee.name,
        workDate: day,
        status,
        entry,
        shift,
        expectedStart,
        isLate,
        lateMinutes,
        dayStatus,
        off,
        excuse: excuses.get(`${employee.id}|${day}`) ?? null,
      });
    }
  }

  rows.sort((a, b) =>
    a.workDate === b.workDate
      ? a.employeeName.localeCompare(b.employeeName, "tr")
      : b.workDate.localeCompare(a.workDate)
  );
  return rows;
}

async function countDeniedAttempts(from: string, to: string): Promise<number> {
  if (isPostgres()) {
    const { rows } = await getPool().query(
      `SELECT COUNT(*)::int AS count FROM shift_denied_attempts
       WHERE work_date >= $1 AND work_date <= $2`,
      [from, to]
    );
    return Number(rows[0]?.count ?? 0);
  }
  const row = getSqliteDb()
    .prepare(
      `SELECT COUNT(*) AS count FROM shift_denied_attempts
       WHERE work_date >= ? AND work_date <= ?`
    )
    .get(from, to) as { count: number };
  return Number(row?.count ?? 0);
}

/** Dashboard özeti — varsayılan olarak bugün. */
export async function getAttendanceSummary(
  workDate = istanbulDateString()
): Promise<AttendanceSummary> {
  const rows = await listAttendance({ from: workDate, to: workDate });
  const full = rows.filter((r) => r.status === "full").length;
  const half = rows.filter((r) => r.status === "half").length;
  const absent = rows.filter((r) => r.status === "absent").length;
  const off = rows.filter((r) => r.status === "off").length;
  const late = rows.filter((r) => r.isLate).length;
  return {
    workDate,
    totalEmployees: rows.length,
    present: full + half,
    absent,
    full,
    half,
    off,
    late,
    deniedAttempts: await countDeniedAttempts(workDate, workDate),
  };
}

/** Haftalık/aylık rapor — aralıktaki toplam ve personel bazlı dağılım. */
export async function getAttendanceReport(
  from: string,
  to: string,
  employeeId?: number
): Promise<AttendanceReport> {
  const rows = await listAttendance({ from, to, employeeId });
  const perEmployee = new Map<number, AttendanceReportEmployee>();

  for (const row of rows) {
    const current =
      perEmployee.get(row.employeeId) ??
      {
        employeeId: row.employeeId,
        employeeName: row.employeeName,
        shift: row.shift,
        full: 0,
        half: 0,
        absent: 0,
        off: 0,
        late: 0,
        lateMinutes: 0,
      };
    if (row.status === "full") current.full++;
    else if (row.status === "half") current.half++;
    else if (row.status === "off") current.off++;
    else current.absent++;
    if (row.isLate) {
      current.late++;
      current.lateMinutes += row.lateMinutes;
    }
    perEmployee.set(row.employeeId, current);
  }

  const list = [...perEmployee.values()].sort((a, b) =>
    a.employeeName.localeCompare(b.employeeName, "tr")
  );
  return {
    from,
    to,
    full: list.reduce((sum, e) => sum + e.full, 0),
    half: list.reduce((sum, e) => sum + e.half, 0),
    absent: list.reduce((sum, e) => sum + e.absent, 0),
    off: list.reduce((sum, e) => sum + e.off, 0),
    late: list.reduce((sum, e) => sum + e.late, 0),
    lateMinutes: list.reduce((sum, e) => sum + e.lateMinutes, 0),
    perEmployee: list,
  };
}

/* ————————————————— Personel detay takvimi ————————————————— */

/** Tek personelin verilen aralıktaki gün gün yoklaması + aylık/haftalık özeti.
 *  Gelecek günler ve işe alım öncesi günler "future" (gri) döner. */
export async function getEmployeeAttendanceDetail(
  employeeId: number,
  from: string,
  to: string
): Promise<AttendanceEmployeeDetail> {
  await closeExpiredShiftEntries();

  const employee = (await listEmployees()).find((e) => e.id === employeeId);
  if (!employee) throw new Error("Personel bulunamadı.");

  const [entries, resolveOff, settings, excuses] = await Promise.all([
    listEntriesRaw({ employeeId, from, to }),
    buildOffResolver(),
    getAttendanceSettings(),
    excuseMap(from, to, employeeId),
  ]);

  const shift = normalizeShift(employee.shift);
  const expectedStart = shiftLateLimit(settings, shift);
  const today = istanbulDateString();
  const byDate = new Map(entries.map((entry) => [entry.workDate, entry]));

  const days: AttendanceDay[] = allDatesInRange(from, to).map((date) => {
    const entry = byDate.get(date) ?? null;
    const off = resolveOff(date);
    const { isLate, lateMinutes } = entryLateness(entry, expectedStart);
    const dayStatus = deriveDayStatus({
      workDate: date,
      today,
      hasEntry: Boolean(entry),
      isLate,
      off,
      beforeHire: hiredBefore(employee.createdAt, date),
    });
    return {
      date,
      weekday: weekdayOf(date),
      dayStatus,
      status: entry?.status ?? null,
      shift,
      expectedStart,
      checkInAt: entry?.checkInAt ?? null,
      checkOutAt: entry?.checkOutAt ?? null,
      isLate,
      lateMinutes,
      note: entry?.note ?? null,
      entryId: entry?.id ?? null,
      off,
      excuse: excuses.get(`${employeeId}|${date}`) ?? null,
    };
  });

  const summary = {
    workDays: days.filter((d) => d.dayStatus !== "off" && d.dayStatus !== "future").length,
    present: days.filter((d) => d.dayStatus === "onTime" || d.dayStatus === "late").length,
    absent: days.filter((d) => d.dayStatus === "absent").length,
    lateCount: days.filter((d) => d.dayStatus === "late").length,
    lateMinutes: days.reduce((sum, d) => sum + d.lateMinutes, 0),
    offDays: days.filter((d) => d.dayStatus === "off").length,
    fullDays: days.filter((d) => d.status === "full").length,
    halfDays: days.filter((d) => d.status === "half").length,
  };

  return {
    employeeId: employee.id,
    employeeName: employee.name,
    shift,
    expectedStart,
    from,
    to,
    days,
    summary,
  };
}

/* ————————————————— Admin düzenleme ————————————————— */

async function getEntryById(id: number): Promise<ShiftEntry | null> {
  if (isPostgres()) {
    const { rows } = await getPool().query(
      `SELECT se.*, e.name AS employee_name
       FROM shift_entries se JOIN employees e ON e.id = se.employee_id
       WHERE se.id = $1`,
      [id]
    );
    return rows[0] ? mapEntry(rows[0]) : null;
  }
  const row = getSqliteDb()
    .prepare(
      `SELECT se.*, e.name AS employee_name
       FROM shift_entries se JOIN employees e ON e.id = se.employee_id
       WHERE se.id = ?`
    )
    .get(id) as Row | undefined;
  return row ? mapEntry(row) : null;
}

/** Gelmedi → Tam/Yarım Gün: admin elle kayıt açar. */
export async function adminCreateEntry(input: {
  employeeId: number;
  workDate: string;
  checkInAt: Date;
  status: AttendanceStatus;
  note?: string | null;
  createdBy?: string | null;
}): Promise<ShiftEntry> {
  const { employeeId, workDate, checkInAt, status } = input;
  const note = input.note?.trim() || null;
  const createdBy = input.createdBy ?? "admin";

  if (isPostgres()) {
    const { rows } = await getPool().query(
      `INSERT INTO shift_entries (employee_id, work_date, check_in_at, status, note, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (employee_id, work_date) DO NOTHING
       RETURNING id`,
      [employeeId, workDate, checkInAt, status, note, createdBy]
    );
    if (!rows[0]) throw new Error("Bu personelin o güne ait kaydı zaten var.");
    const entry = await getEntryById(Number(rows[0].id));
    if (!entry) throw new Error("Kayıt oluşturulamadı.");
    return entry;
  }

  let insertedId: number;
  try {
    const result = getSqliteDb()
      .prepare(
        `INSERT INTO shift_entries (employee_id, work_date, check_in_at, status, note, created_by)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(employeeId, workDate, checkInAt.toISOString(), status, note, createdBy);
    insertedId = Number(result.lastInsertRowid);
  } catch {
    throw new Error("Bu personelin o güne ait kaydı zaten var.");
  }
  const entry = await getEntryById(insertedId);
  if (!entry) throw new Error("Kayıt oluşturulamadı.");
  return entry;
}

export async function adminUpdateEntry(
  id: number,
  updates: {
    checkInAt?: Date;
    checkOutAt?: Date | null;
    status?: AttendanceStatus;
    note?: string | null;
  }
): Promise<ShiftEntry> {
  const existing = await getEntryById(id);
  if (!existing) throw new Error("Mesai kaydı bulunamadı.");

  const sets: string[] = [];
  const params: unknown[] = [];
  const ph = () => (isPostgres() ? `$${params.length}` : "?");

  if (updates.checkInAt !== undefined) {
    params.push(isPostgres() ? updates.checkInAt : updates.checkInAt.toISOString());
    sets.push(`check_in_at = ${ph()}`);
  }
  if (updates.checkOutAt !== undefined) {
    const value =
      updates.checkOutAt === null
        ? null
        : isPostgres()
          ? updates.checkOutAt
          : updates.checkOutAt.toISOString();
    params.push(value);
    sets.push(`check_out_at = ${ph()}`);
  }
  if (updates.status !== undefined) {
    params.push(updates.status);
    sets.push(`status = ${ph()}`);
  }
  if (updates.note !== undefined) {
    params.push(updates.note?.trim() || null);
    sets.push(`note = ${ph()}`);
  }

  if (sets.length === 0) return existing;

  params.push(id);
  const sql = `UPDATE shift_entries SET ${sets.join(", ")} WHERE id = ${ph()}`;
  if (isPostgres()) {
    await getPool().query(sql, params);
  } else {
    getSqliteDb().prepare(sql).run(...params);
  }

  const updated = await getEntryById(id);
  if (!updated) throw new Error("Kayıt güncellenemedi.");
  return updated;
}

export async function adminDeleteEntry(id: number): Promise<ShiftEntry> {
  const existing = await getEntryById(id);
  if (!existing) throw new Error("Mesai kaydı bulunamadı.");
  if (isPostgres()) {
    await getPool().query(`DELETE FROM shift_entries WHERE id = $1`, [id]);
  } else {
    getSqliteDb().prepare(`DELETE FROM shift_entries WHERE id = ?`).run(id);
  }
  return existing;
}
