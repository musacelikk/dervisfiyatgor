import type { PermissionId } from "@/lib/permissions";
import type { EmployeeShift, ShiftHonorific } from "./shift";

export interface Employee {
  id: number;
  name: string;
  username: string;
  active: boolean;
  permissions: PermissionId[];
  shiftCode: string | null;
  honorific: ShiftHonorific;
  /** "1" | "2" — geç giriş kontrolü bu vardiyanın sınır saatine göre yapılır */
  shift: EmployeeShift;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeSession {
  id: number;
  name: string;
  username: string;
  permissions: PermissionId[];
}
