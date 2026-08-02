import type { PermissionId } from "@/lib/permissions";
import type { ShiftHonorific } from "./shift";

export interface Employee {
  id: number;
  name: string;
  username: string;
  active: boolean;
  permissions: PermissionId[];
  shiftCode: string | null;
  honorific: ShiftHonorific;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeSession {
  id: number;
  name: string;
  username: string;
  permissions: PermissionId[];
}
