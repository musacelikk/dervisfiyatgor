import { isPostgres } from "../lib/database";
import { normalizePermissionsInput, type PermissionId } from "../lib/permissions";
import type { Honorific } from "../lib/shiftCode";
import type { EmployeeShift } from "../lib/attendance";
import type { EmployeePublic, EmployeeRow } from "../types/employee";
import * as sqlite from "./employees-sqlite";
import * as pg from "./employees-pg";

export { normalizePermissionsInput };
export { verifyPassword } from "./employees-sqlite";

export async function listEmployees(): Promise<EmployeePublic[]> {
  if (isPostgres()) return pg.listEmployees();
  return sqlite.listEmployees();
}

export async function getEmployeeCount(): Promise<number> {
  if (isPostgres()) return pg.getEmployeeCount();
  return sqlite.getEmployeeCount();
}

export async function findEmployeeByUsername(username: string): Promise<EmployeeRow | undefined> {
  if (isPostgres()) return pg.findEmployeeByUsername(username);
  return sqlite.findEmployeeByUsername(username);
}

export async function findEmployeeById(id: number): Promise<EmployeeRow | undefined> {
  if (isPostgres()) return pg.findEmployeeById(id);
  return sqlite.findEmployeeById(id);
}

export async function findEmployeeByShiftCode(code: string): Promise<EmployeeRow | undefined> {
  if (isPostgres()) return pg.findEmployeeByShiftCode(code);
  return sqlite.findEmployeeByShiftCode(code);
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
  if (isPostgres()) return pg.createEmployee(input);
  return sqlite.createEmployee(input);
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
  if (isPostgres()) return pg.updateEmployee(id, input);
  return sqlite.updateEmployee(id, input);
}

export async function deleteEmployee(id: number): Promise<void> {
  if (isPostgres()) return pg.deleteEmployee(id);
  return sqlite.deleteEmployee(id);
}

export async function authenticateEmployee(
  username: string,
  password: string
): Promise<EmployeePublic | null> {
  if (isPostgres()) return pg.authenticateEmployee(username, password);
  return sqlite.authenticateEmployee(username, password);
}
