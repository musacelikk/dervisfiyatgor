import type { PermissionId } from "../lib/permissions";
import { parsePermissions } from "../lib/permissions";

export type EmployeeRow = {
  id: number;
  name: string;
  username: string;
  password_hash: string;
  active: number | boolean;
  permissions: string;
  shift_code: string | null;
  honorific: string | null;
  created_at: string;
  updated_at: string;
};

export type EmployeePublic = {
  id: number;
  name: string;
  username: string;
  active: boolean;
  permissions: PermissionId[];
  /** Mesai girişi için 4 haneli kod (giris subdomain'i) */
  shiftCode: string | null;
  /** "Bey" | "Hanım" | null — karşılama metninde kullanılır */
  honorific: string | null;
  createdAt: string;
  updatedAt: string;
};

export function rowToEmployee(row: EmployeeRow): EmployeePublic {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    active: row.active === 1 || row.active === true,
    permissions: parsePermissions(row.permissions),
    shiftCode: row.shift_code ?? null,
    honorific: row.honorific ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
