import crypto from "crypto";
import { db as getSqliteDb } from "./db-sqlite";
import {
  DEFAULT_EMPLOYEE_PERMISSIONS,
  normalizePermissionsInput,
  serializePermissions,
  type PermissionId,
} from "../lib/permissions";
import { isValidShiftCode, type Honorific } from "../lib/shiftCode";
import { normalizeShift, type EmployeeShift } from "../lib/attendance";
import { rowToEmployee, type EmployeePublic, type EmployeeRow } from "../types/employee";

const selectPublic = `
  SELECT id, name, username, active, permissions, shift_code, honorific, shift, created_at, updated_at
  FROM employees
`;

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const verify = crypto.scryptSync(password, salt, 64).toString("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(verify, "hex"));
  } catch {
    return false;
  }
}

export function listEmployees(): EmployeePublic[] {
  const rows = getSqliteDb()
    .prepare(`${selectPublic} ORDER BY name COLLATE NOCASE`)
    .all() as Omit<EmployeeRow, "password_hash">[];
  return rows.map((row) => rowToEmployee({ ...row, password_hash: "" } as EmployeeRow));
}

export function getEmployeeCount(): number {
  const row = getSqliteDb().prepare(`SELECT COUNT(*) as count FROM employees WHERE active = 1`).get() as {
    count: number;
  };
  return row.count;
}

export function findEmployeeByUsername(username: string): EmployeeRow | undefined {
  return getSqliteDb()
    .prepare(`SELECT * FROM employees WHERE username = ? COLLATE NOCASE LIMIT 1`)
    .get(username.trim()) as EmployeeRow | undefined;
}

export function findEmployeeById(id: number): EmployeeRow | undefined {
  return getSqliteDb().prepare(`SELECT * FROM employees WHERE id = ?`).get(id) as EmployeeRow | undefined;
}

export function findEmployeeByShiftCode(code: string): EmployeeRow | undefined {
  return getSqliteDb()
    .prepare(`SELECT * FROM employees WHERE shift_code = ? LIMIT 1`)
    .get(code.trim()) as EmployeeRow | undefined;
}

function validateShiftCode(
  shiftCode: string | null | undefined,
  excludeId?: number
): string | null | undefined {
  if (shiftCode === undefined) return undefined;
  if (shiftCode === null || shiftCode === "") return null;
  if (!isValidShiftCode(shiftCode)) {
    throw new Error("Mesai ID'si 4 haneli rakam olmalı.");
  }
  const duplicate = findEmployeeByShiftCode(shiftCode);
  if (duplicate && duplicate.id !== excludeId) {
    throw new Error("Bu mesai ID'si başka bir personelde kayıtlı.");
  }
  return shiftCode;
}

export function createEmployee(input: {
  name: string;
  username: string;
  password: string;
  permissions?: PermissionId[];
  shiftCode?: string | null;
  honorific?: Honorific | null;
  shift?: EmployeeShift | null;
}): EmployeePublic {
  const name = input.name.trim();
  const username = input.username.trim().toLowerCase();
  const permissions = serializePermissions(input.permissions ?? DEFAULT_EMPLOYEE_PERMISSIONS);
  const shiftCode = validateShiftCode(input.shiftCode) ?? null;
  const honorific = input.honorific ?? null;
  const shift = normalizeShift(input.shift);

  if (name.length < 2) throw new Error("Ad en az 2 karakter olmalı.");
  if (!/^[a-z0-9._-]{3,32}$/i.test(username)) {
    throw new Error("Kullanıcı adı 3–32 karakter; harf, rakam, . _ - kullanılabilir.");
  }
  if (input.password.length < 4) throw new Error("Şifre en az 4 karakter olmalı.");

  const existing = findEmployeeByUsername(username);
  if (existing) throw new Error("Bu kullanıcı adı zaten kayıtlı.");

  const result = getSqliteDb()
    .prepare(
      `INSERT INTO employees (name, username, password_hash, active, permissions, shift_code, honorific, shift, updated_at)
       VALUES (?, ?, ?, 1, ?, ?, ?, ?, datetime('now'))`
    )
    .run(name, username, hashPassword(input.password), permissions, shiftCode, honorific, shift);

  const row = findEmployeeById(Number(result.lastInsertRowid));
  if (!row) throw new Error("Çalışan oluşturulamadı.");
  return rowToEmployee(row);
}

export function updateEmployee(
  id: number,
  input: {
    name?: string;
    username?: string;
    password?: string;
    active?: boolean;
    permissions?: PermissionId[];
    shiftCode?: string | null;
    honorific?: Honorific | null;
    shift?: EmployeeShift | null;
  }
): EmployeePublic {
  const row = findEmployeeById(id);
  if (!row) throw new Error("Çalışan bulunamadı.");

  const name = input.name !== undefined ? input.name.trim() : row.name;
  const username =
    input.username !== undefined ? input.username.trim().toLowerCase() : row.username;
  const active = input.active !== undefined ? (input.active ? 1 : 0) : row.active;
  const permissions =
    input.permissions !== undefined ? serializePermissions(input.permissions) : row.permissions;
  const shiftCode =
    input.shiftCode !== undefined ? validateShiftCode(input.shiftCode, id) : row.shift_code;
  const honorific = input.honorific !== undefined ? input.honorific : row.honorific;
  const shift = input.shift !== undefined ? normalizeShift(input.shift) : normalizeShift(row.shift);

  if (name.length < 2) throw new Error("Ad en az 2 karakter olmalı.");
  if (!/^[a-z0-9._-]{3,32}$/i.test(username)) {
    throw new Error("Kullanıcı adı 3–32 karakter; harf, rakam, . _ - kullanılabilir.");
  }

  const duplicate = findEmployeeByUsername(username);
  if (duplicate && duplicate.id !== id) {
    throw new Error("Bu kullanıcı adı zaten kayıtlı.");
  }

  let passwordHash = row.password_hash;
  if (input.password !== undefined) {
    if (input.password.length < 4) throw new Error("Şifre en az 4 karakter olmalı.");
    passwordHash = hashPassword(input.password);
  }

  getSqliteDb()
    .prepare(
      `UPDATE employees
       SET name = ?, username = ?, password_hash = ?, active = ?, permissions = ?,
           shift_code = ?, honorific = ?, shift = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
    .run(name, username, passwordHash, active, permissions, shiftCode, honorific, shift, id);

  const updated = findEmployeeById(id);
  if (!updated) throw new Error("Çalışan güncellenemedi.");
  return rowToEmployee(updated);
}

export function deleteEmployee(id: number): void {
  const row = findEmployeeById(id);
  if (!row) throw new Error("Çalışan bulunamadı.");
  getSqliteDb().prepare(`DELETE FROM employees WHERE id = ?`).run(id);
}

export function authenticateEmployee(username: string, password: string): EmployeePublic | null {
  const row = findEmployeeByUsername(username);
  if (!row || row.active !== 1) return null;
  if (!verifyPassword(password, row.password_hash)) return null;
  return rowToEmployee(row);
}

export { normalizePermissionsInput };
