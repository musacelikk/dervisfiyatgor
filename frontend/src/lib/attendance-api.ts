import type {
  AttendanceListResult,
  AttendanceReport,
  AttendanceStatus,
  AttendanceStatusOrAbsent,
  AttendanceSummary,
  ClosedDay,
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

export async function fetchClosedDays(): Promise<ClosedDay[]> {
  const body = await jsonFetch<{ closedDays: ClosedDay[] }>(
    "/api/admin/settings/closed-days",
    "İzinli günler yüklenemedi."
  );
  return body.closedDays;
}

export async function addClosedDay(date: string, note: string | null): Promise<ClosedDay[]> {
  const body = await jsonFetch<{ closedDays: ClosedDay[] }>(
    "/api/admin/settings/closed-days",
    "İzinli gün eklenemedi.",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, note }),
    }
  );
  return body.closedDays;
}

export async function removeClosedDay(date: string): Promise<ClosedDay[]> {
  const body = await jsonFetch<{ closedDays: ClosedDay[] }>(
    `/api/admin/settings/closed-days/${encodeURIComponent(date)}`,
    "İzinli gün kaldırılamadı.",
    { method: "DELETE" }
  );
  return body.closedDays;
}
