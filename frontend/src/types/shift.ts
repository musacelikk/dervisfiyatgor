export type ShiftHonorific = "Bey" | "Hanım" | null;

export type ShiftEmployee = {
  id: number;
  name: string;
  honorific: ShiftHonorific;
};

export type ShiftEntry = {
  id: number;
  employeeId: number;
  employeeName?: string;
  workDate: string;
  checkInAt: string;
  checkOutAt: string | null;
  lat: number | null;
  lng: number | null;
  distanceM: number | null;
};
