import type { PermissionId } from "../lib/permissions";
import { parsePermissions } from "../lib/permissions";

export type EmployeeRow = {
  id: number;
  name: string;
  username: string;
  password_hash: string;
  active: number | boolean;
  permissions: string;
  created_at: string;
  updated_at: string;
};

export type EmployeePublic = {
  id: number;
  name: string;
  username: string;
  active: boolean;
  permissions: PermissionId[];
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
