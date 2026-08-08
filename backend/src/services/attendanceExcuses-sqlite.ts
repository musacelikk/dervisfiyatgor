import { db as getDb } from "./db-sqlite";

/** Migration çalışmamış eski kurulumlarda da servis kendi tablosunu kurar. */
function ensureTables(): void {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS attendance_excuses (
      employee_id INTEGER NOT NULL,
      work_date TEXT NOT NULL,
      note TEXT NOT NULL,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (employee_id, work_date),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_attendance_excuses_date
      ON attendance_excuses(work_date);
  `);
}

export type ExcuseRow = {
  employeeId: number;
  workDate: string;
  note: string;
};

export function listExcuses(
  from: string,
  to: string,
  employeeId?: number
): ExcuseRow[] {
  ensureTables();
  const params: (string | number)[] = [from, to];
  let sql = `
    SELECT employee_id, work_date, note
    FROM attendance_excuses
    WHERE work_date BETWEEN ? AND ?
  `;
  if (employeeId) {
    sql += ` AND employee_id = ?`;
    params.push(employeeId);
  }
  const rows = getDb().prepare(sql).all(...params) as {
    employee_id: number;
    work_date: string;
    note: string;
  }[];
  return rows.map((r) => ({
    employeeId: r.employee_id,
    workDate: r.work_date,
    note: r.note,
  }));
}

/** Not doluysa upsert, boş/null ise kaydı siler. */
export function setExcuse(
  employeeId: number,
  workDate: string,
  note: string | null,
  createdBy: string | null
): string | null {
  ensureTables();
  const trimmed = note?.trim() ?? "";
  if (!trimmed) {
    getDb()
      .prepare(`DELETE FROM attendance_excuses WHERE employee_id = ? AND work_date = ?`)
      .run(employeeId, workDate);
    return null;
  }
  getDb()
    .prepare(
      `INSERT INTO attendance_excuses (employee_id, work_date, note, created_by)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (employee_id, work_date)
       DO UPDATE SET note = excluded.note, created_by = excluded.created_by`
    )
    .run(employeeId, workDate, trimmed, createdBy);
  return trimmed;
}
