import { getPool } from "../lib/database";
import type { ExcuseRow } from "./attendanceExcuses-sqlite";

/** Migration çalışmamış eski kurulumlarda da servis kendi tablosunu kurar. */
async function ensureTables(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS attendance_excuses (
      employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      work_date TEXT NOT NULL,
      note TEXT NOT NULL,
      created_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (employee_id, work_date)
    );
    CREATE INDEX IF NOT EXISTS idx_attendance_excuses_date
      ON attendance_excuses(work_date);
  `);
}

export async function listExcuses(
  from: string,
  to: string,
  employeeId?: number
): Promise<ExcuseRow[]> {
  await ensureTables();
  const params: (string | number)[] = [from, to];
  let sql = `
    SELECT employee_id, work_date, note
    FROM attendance_excuses
    WHERE work_date BETWEEN $1 AND $2
  `;
  if (employeeId) {
    params.push(employeeId);
    sql += ` AND employee_id = $${params.length}`;
  }
  const { rows } = await getPool().query(sql, params);
  return rows.map((r) => ({
    employeeId: Number(r.employee_id),
    workDate: r.work_date as string,
    note: r.note as string,
  }));
}

/** Not doluysa upsert, boş/null ise kaydı siler. */
export async function setExcuse(
  employeeId: number,
  workDate: string,
  note: string | null,
  createdBy: string | null
): Promise<string | null> {
  await ensureTables();
  const trimmed = note?.trim() ?? "";
  if (!trimmed) {
    await getPool().query(
      `DELETE FROM attendance_excuses WHERE employee_id = $1 AND work_date = $2`,
      [employeeId, workDate]
    );
    return null;
  }
  await getPool().query(
    `INSERT INTO attendance_excuses (employee_id, work_date, note, created_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (employee_id, work_date)
     DO UPDATE SET note = EXCLUDED.note, created_by = EXCLUDED.created_by`,
    [employeeId, workDate, trimmed, createdBy]
  );
  return trimmed;
}
