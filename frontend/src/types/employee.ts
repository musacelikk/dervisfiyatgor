import type { PermissionId } from "@/lib/permissions";

export interface Employee {
  id: number;
  name: string;
  username: string;
  active: boolean;
  permissions: PermissionId[];
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeSession {
  id: number;
  name: string;
  username: string;
  permissions: PermissionId[];
}
