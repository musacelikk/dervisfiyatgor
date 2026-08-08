import { isPostgres } from "../lib/database";
import * as sqlite from "./attendanceExcuses-sqlite";
import * as pg from "./attendanceExcuses-pg";

export type { ExcuseRow } from "./attendanceExcuses-sqlite";

export async function listExcuses(
  from: string,
  to: string,
  employeeId?: number
): Promise<sqlite.ExcuseRow[]> {
  if (isPostgres()) return pg.listExcuses(from, to, employeeId);
  return sqlite.listExcuses(from, to, employeeId);
}

export async function setExcuse(
  employeeId: number,
  workDate: string,
  note: string | null,
  createdBy: string | null
): Promise<string | null> {
  if (isPostgres()) return pg.setExcuse(employeeId, workDate, note, createdBy);
  return sqlite.setExcuse(employeeId, workDate, note, createdBy);
}

/** `${employeeId}|${workDate}` → not. Aralık sorgusunu tek geçişte eşlemek için. */
export async function excuseMap(
  from: string,
  to: string,
  employeeId?: number
): Promise<Map<string, string>> {
  const rows = await listExcuses(from, to, employeeId);
  return new Map(rows.map((r) => [`${r.employeeId}|${r.workDate}`, r.note]));
}
