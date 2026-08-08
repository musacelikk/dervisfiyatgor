import type {
  AttendanceEmployeeDetail,
  AttendanceListResult,
  AttendanceReport,
  AttendanceSettings,
  AttendanceStatus,
  AttendanceStatusOrAbsent,
  AttendanceSummary,
  ClosedDay,
  ClosedDayType,
  ShiftEntry,
} from "@/types/shift";

async function jsonFetch<T>(url: string, fallback: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body.error === "string" ? body.error : fallback);
  }
  return body as T;
}

export function fetchAttendance(filters: {
  from: string;
  to: string;
  employeeId?: number;
  status?: AttendanceStatusOrAbsent;
}): Promise<AttendanceListResult> {
  const params = new URLSearchParams({ from: filters.from, to: filters.to });
  if (filters.employeeId) params.set("employeeId", String(filters.employeeId));
  if (filters.status) params.set("status", filters.status);
  return jsonFetch<AttendanceListResult>(
    `/api/admin/shifts?${params}`,
    "Yoklama yüklenemedi."
  );
}

export async function fetchAttendanceSummary(date?: string): Promise<AttendanceSummary> {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  const body = await jsonFetch<{ summary: AttendanceSummary }>(
    `/api/admin/shifts/summary?${params}`,
    "Özet yüklenemedi."
  );
  return body.summary;
}

export async function fetchAttendanceReport(
  from: string,
  to: string,
  employeeId?: number
): Promise<AttendanceReport> {
  const params = new URLSearchParams({ from, to });
  if (employeeId) params.set("employeeId", String(employeeId));
  const body = await jsonFetch<{ report: AttendanceReport }>(
    `/api/admin/shifts/report?${params}`,
    "Rapor yüklenemedi."
  );
  return body.report;
}

/** Tek personelin takvim detayı + aylık özeti. */
export async function fetchEmployeeAttendance(
  employeeId: number,
  from: string,
  to: string
): Promise<AttendanceEmployeeDetail> {
  const params = new URLSearchParams({ from, to });
  const body = await jsonFetch<{ detail: AttendanceEmployeeDetail }>(
    `/api/admin/shifts/employee/${employeeId}?${params}`,
    "Personel yoklaması yüklenemedi."
  );
  return body.detail;
}

export async function createAttendanceEntry(input: {
  employeeId: number;
  workDate: string;
  status: AttendanceStatus;
  time?: string;
  note?: string | null;
}): Promise<ShiftEntry> {
  const body = await jsonFetch<{ entry: ShiftEntry }>(
    "/api/admin/shifts",
    "Kayıt eklenemedi.",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );
  return body.entry;
}

export async function updateAttendanceEntry(
  id: number,
  input: {
    workDate?: string;
    time?: string;
    status?: AttendanceStatus;
    note?: string | null;
  }
): Promise<ShiftEntry> {
  const body = await jsonFetch<{ entry: ShiftEntry }>(
    `/api/admin/shifts/${id}`,
    "Güncellenemedi.",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );
  return body.entry;
}

export async function deleteAttendanceEntry(id: number): Promise<void> {
  await jsonFetch(`/api/admin/shifts/${id}`, "Silinemedi.", { method: "DELETE" });
}

/** Mazeret yazar; boş not gönderilirse mevcut mazereti siler. */
export async function saveAttendanceExcuse(input: {
  employeeId: number;
  workDate: string;
  note: string | null;
}): Promise<string | null> {
  const body = await jsonFetch<{ excuse: string | null }>(
    "/api/admin/shifts/excuse",
    "Mazeret kaydedilemedi.",
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );
  return body.excuse;
}

export async function fetchClosedDays(): Promise<ClosedDay[]> {
  const body = await jsonFetch<{ closedDays: ClosedDay[] }>(
    "/api/admin/settings/closed-days",
    "İzinli günler yüklenemedi."
  );
  return body.closedDays;
}

export async function addClosedDay(
  date: string,
  note: string | null,
  type: ClosedDayType = "full"
): Promise<ClosedDay[]> {
  const body = await jsonFetch<{ closedDays: ClosedDay[] }>(
    "/api/admin/settings/closed-days",
    "İzinli gün eklenemedi.",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, note, type }),
    }
  );
  return body.closedDays;
}

/* ————— Vardiya / haftalık izin ayarları ————— */

type AdminSettingsResponse = {
  settings: { catalogShowPrices: boolean; attendance: AttendanceSettings };
};

export async function fetchAdminSettings(): Promise<AdminSettingsResponse["settings"]> {
  const body = await jsonFetch<AdminSettingsResponse>(
    "/api/admin/settings",
    "Ayarlar yüklenemedi."
  );
  return body.settings;
}

export async function saveAdminSettings(input: {
  catalogShowPrices?: boolean;
  attendance?: Partial<AttendanceSettings>;
}): Promise<AdminSettingsResponse["settings"]> {
  const body = await jsonFetch<AdminSettingsResponse>(
    "/api/admin/settings",
    "Ayar kaydedilemedi.",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );
  return body.settings;
}

export async function removeClosedDay(date: string): Promise<ClosedDay[]> {
  const body = await jsonFetch<{ closedDays: ClosedDay[] }>(
    `/api/admin/settings/closed-days/${encodeURIComponent(date)}`,
    "İzinli gün kaldırılamadı.",
    { method: "DELETE" }
  );
  return body.closedDays;
}
