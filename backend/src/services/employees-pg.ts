import crypto from "crypto";
import { getPool } from "../lib/database";
import {
  DEFAULT_EMPLOYEE_PERMISSIONS,
  serializePermissions,
  type PermissionId,
} from "../lib/permissions";
import { isValidShiftCode, type Honorific } from "../lib/shiftCode";
import { normalizeShift, type EmployeeShift } from "../lib/attendance";
import { rowToEmployee, type EmployeePublic, type EmployeeRow } from "../types/employee";
import { verifyPassword } from "./employees-sqlite";

const selectPublic = `
  SELECT id, name, username, active, permissions, shift_code, honorific, shift, created_at, updated_at
  FROM employees
`;

function mapRow(row: Record<string, unknown>): EmployeeRow {
  return {
    id: Number(row.id),
    name: String(row.name),
    username: String(row.username),
    password_hash: String(row.password_hash ?? ""),
    active: row.active === true || row.active === 1 ? 1 : 0,
    permissions: String(row.permissions),
    shift_code: row.shift_code == null ? null : String(row.shift_code),
    honorific: row.honorific == null ? null : String(row.honorific),
    shift: row.shift == null ? null : String(row.shift),
    created_at:
      row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updated_at:
      row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export async function listEmployees(): Promise<EmployeePublic[]> {
  const { rows } = await getPool().query(
    `${selectPublic} ORDER BY LOWER(name)`
  );
  return rows.map((row) =>
    rowToEmployee(mapRow({ ...row, password_hash: "" }))
  );
}

export async function getEmployeeCount(): Promise<number> {
  const { rows } = await getPool().query(
    `SELECT COUNT(*)::int AS count FROM employees WHERE active = TRUE`
  );
  return rows[0].count as number;
}

export async function findEmployeeByUsername(username: string): Promise<EmployeeRow | undefined> {
  const { rows } = await getPool().query(
    `SELECT * FROM employees WHERE LOWER(username) = LOWER($1) LIMIT 1`,
    [username.trim()]
  );
  return rows[0] ? mapRow(rows[0]) : undefined;
}

export async function findEmployeeById(id: number): Promise<EmployeeRow | undefined> {
  const { rows } = await getPool().query(`SELECT * FROM employees WHERE id = $1`, [id]);
  return rows[0] ? mapRow(rows[0]) : undefined;
}

export async function findEmployeeByShiftCode(code: string): Promise<EmployeeRow | undefined> {
  const { rows } = await getPool().query(
    `SELECT * FROM employees WHERE shift_code = $1 LIMIT 1`,
    [code.trim()]
  );
  return rows[0] ? mapRow(rows[0]) : undefined;
}

async function validateShiftCode(
  shiftCode: string | null | undefined,
  excludeId?: number
): Promise<string | null | undefined> {
  if (shiftCode === undefined) return undefined;
  if (shiftCode === null || shiftCode === "") return null;
  if (!isValidShiftCode(shiftCode)) {
    throw new Error("Mesai ID'si 4 haneli rakam olmalı.");
  }
  const duplicate = await findEmployeeByShiftCode(shiftCode);
  if (duplicate && duplicate.id !== excludeId) {
    throw new Error("Bu mesai ID'si başka bir personelde kayıtlı.");
  }
  return shiftCode;
}

export async function createEmployee(input: {
  name: string;
  username: string;
  password: string;
  permissions?: PermissionId[];
  shiftCode?: string | null;
  honorific?: Honorific | null;
  shift?: EmployeeShift | null;
}): Promise<EmployeePublic> {
  const name = input.name.trim();
  const username = input.username.trim().toLowerCase();
  const permissions = serializePermissions(input.permissions ?? DEFAULT_EMPLOYEE_PERMISSIONS);
  const shiftCode = (await validateShiftCode(input.shiftCode)) ?? null;
  const honorific = input.honorific ?? null;
  const shift = normalizeShift(input.shift);

  if (name.length < 2) throw new Error("Ad en az 2 karakter olmalı.");
  if (!/^[a-z0-9._-]{3,32}$/i.test(username)) {
    throw new Error("Kullanıcı adı 3–32 karakter; harf, rakam, . _ - kullanılabilir.");
  }
  if (input.password.length < 4) throw new Error("Şifre en az 4 karakter olmalı.");

  const existing = await findEmployeeByUsername(username);
  if (existing) throw new Error("Bu kullanıcı adı zaten kayıtlı.");

  const { rows } = await getPool().query(
    `INSERT INTO employees (name, username, password_hash, active, permissions, shift_code, honorific, shift, updated_at)
     VALUES ($1, $2, $3, TRUE, $4, $5, $6, $7, NOW())
     RETURNING id`,
    [name, username, hashPassword(input.password), permissions, shiftCode, honorific, shift]
  );

  const row = await findEmployeeById(Number(rows[0].id));
  if (!row) throw new Error("Çalışan oluşturulamadı.");
  return rowToEmployee(row);
}

export async function updateEmployee(
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
): Promise<EmployeePublic> {
  const row = await findEmployeeById(id);
  if (!row) throw new Error("Çalışan bulunamadı.");

  const name = input.name !== undefined ? input.name.trim() : row.name;
  const username =
    input.username !== undefined ? input.username.trim().toLowerCase() : row.username;
  const active = input.active !== undefined ? input.active : row.active === 1;
  const permissions =
    input.permissions !== undefined ? serializePermissions(input.permissions) : row.permissions;
  const shiftCode =
    input.shiftCode !== undefined
      ? await validateShiftCode(input.shiftCode, id)
      : row.shift_code;
  const honorific = input.honorific !== undefined ? input.honorific : row.honorific;
  const shift = input.shift !== undefined ? normalizeShift(input.shift) : normalizeShift(row.shift);

  if (name.length < 2) throw new Error("Ad en az 2 karakter olmalı.");
  if (!/^[a-z0-9._-]{3,32}$/i.test(username)) {
    throw new Error("Kullanıcı adı 3–32 karakter; harf, rakam, . _ - kullanılabilir.");
  }

  const duplicate = await findEmployeeByUsername(username);
  if (duplicate && duplicate.id !== id) {
    throw new Error("Bu kullanıcı adı zaten kayıtlı.");
  }

  let passwordHash = row.password_hash;
  if (input.password !== undefined) {
    if (input.password.length < 4) throw new Error("Şifre en az 4 karakter olmalı.");
    passwordHash = hashPassword(input.password);
  }

  await getPool().query(
    `UPDATE employees
     SET name = $1, username = $2, password_hash = $3, active = $4, permissions = $5,
         shift_code = $6, honorific = $7, shift = $8, updated_at = NOW()
     WHERE id = $9`,
    [name, username, passwordHash, active, permissions, shiftCode, honorific, shift, id]
  );

  const updated = await findEmployeeById(id);
  if (!updated) throw new Error("Çalışan güncellenemedi.");
  return rowToEmployee(updated);
}

export async function deleteEmployee(id: number): Promise<void> {
  const row = await findEmployeeById(id);
  if (!row) throw new Error("Çalışan bulunamadı.");
  await getPool().query(`DELETE FROM employees WHERE id = $1`, [id]);
}

export async function authenticateEmployee(
  username: string,
  password: string
): Promise<EmployeePublic | null> {
  const row = await findEmployeeByUsername(username);
  if (!row || row.active !== 1) return null;
  if (!verifyPassword(password, row.password_hash)) return null;
  return rowToEmployee(row);
}
