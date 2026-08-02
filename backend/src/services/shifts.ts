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
import type { ShiftEntry } from "../types/shift";

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 gün

type Row = Record<string, unknown>;

function mapEntry(row: Row): ShiftEntry {
  return {
    id: Number(row.id),
    employeeId: Number(row.employee_id),
    employeeName: row.employee_name != null ? String(row.employee_name) : undefined,
    workDate: String(row.work_date),
    checkInAt: toIso(row.check_in_at),
    checkOutAt: row.check_out_at == null ? null : toIso(row.check_out_at),
    lat: row.lat == null ? null : Number(row.lat),
    lng: row.lng == null ? null : Number(row.lng),
    distanceM: row.distance_m == null ? null : Number(row.distance_m),
  };
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  const s = String(value);
  // SQLite "YYYY-MM-DD HH:MM:SS" (UTC, boşluklu) → ISO
  return s.includes("T") ? s : `${s.replace(" ", "T")}Z`;
}

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

/** Akşam ezanı (gün batımı) geçmiş ama hâlâ açık olan mesai kayıtlarını kapatır.
 *  index.ts'teki periyodik süpürme ve giriş/listeleme uçlarında çağrılır. */
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

export async function checkIn(
  employeeId: number,
  lat: number,
  lng: number
): Promise<{ entry: ShiftEntry; alreadyStarted: boolean; distanceM: number }> {
  await closeExpiredShiftEntries();

  const shop = getShopLocation();
  const distanceM = haversineMeters(lat, lng, shop.lat, shop.lng);
  const radius = getShopRadiusMeters();
  if (distanceM > radius) {
    throw new OutOfRangeError(distanceM);
  }

  const existing = await getTodayEntry(employeeId);
  if (existing) {
    return { entry: existing, alreadyStarted: true, distanceM };
  }

  const workDate = istanbulDateString();
  const now = new Date();
  if (isPostgres()) {
    const { rows } = await getPool().query(
      `INSERT INTO shift_entries (employee_id, work_date, check_in_at, lat, lng, distance_m)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (employee_id, work_date) DO NOTHING
       RETURNING *`,
      [employeeId, workDate, now, lat, lng, distanceM]
    );
    const row = rows[0] ?? (await getTodayEntry(employeeId));
    if (!row) throw new Error("Mesai kaydı oluşturulamadı.");
    const entry = "id" in row && row.id !== undefined ? mapEntry(row as Row) : (row as ShiftEntry);
    return { entry, alreadyStarted: false, distanceM };
  }

  try {
    getSqliteDb()
      .prepare(
        `INSERT INTO shift_entries (employee_id, work_date, check_in_at, lat, lng, distance_m)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(employeeId, workDate, now.toISOString(), lat, lng, distanceM);
  } catch {
    // UNIQUE(employee_id, work_date) çakışması: eşzamanlı çift tıklama — mevcut kaydı döndür
  }
  const row = getSqliteDb()
    .prepare(`SELECT * FROM shift_entries WHERE employee_id = ? AND work_date = ?`)
    .get(employeeId, workDate) as Row | undefined;
  if (!row) throw new Error("Mesai kaydı oluşturulamadı.");
  return { entry: mapEntry(row), alreadyStarted: false, distanceM };
}

export async function listShiftEntries(filters: {
  employeeId?: number;
  from?: string;
  to?: string;
}): Promise<ShiftEntry[]> {
  await closeExpiredShiftEntries();

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (isPostgres()) {
    if (filters.employeeId) {
      params.push(filters.employeeId);
      conditions.push(`se.employee_id = $${params.length}`);
    }
    if (filters.from) {
      params.push(filters.from);
      conditions.push(`se.work_date >= $${params.length}`);
    }
    if (filters.to) {
      params.push(filters.to);
      conditions.push(`se.work_date <= $${params.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await getPool().query(
      `SELECT se.*, e.name AS employee_name
       FROM shift_entries se
       JOIN employees e ON e.id = se.employee_id
       ${where}
       ORDER BY se.work_date DESC, se.check_in_at DESC
       LIMIT 500`,
      params
    );
    return rows.map(mapEntry);
  }

  if (filters.employeeId) {
    params.push(filters.employeeId);
    conditions.push(`se.employee_id = ?`);
  }
  if (filters.from) {
    params.push(filters.from);
    conditions.push(`se.work_date >= ?`);
  }
  if (filters.to) {
    params.push(filters.to);
    conditions.push(`se.work_date <= ?`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = getSqliteDb()
    .prepare(
      `SELECT se.*, e.name AS employee_name
       FROM shift_entries se
       JOIN employees e ON e.id = se.employee_id
       ${where}
       ORDER BY se.work_date DESC, se.check_in_at DESC
       LIMIT 500`
    )
    .all(...params) as Row[];
  return rows.map(mapEntry);
}
