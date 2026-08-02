import type { ShiftEmployee, ShiftEntry } from "@/types/shift";
import { readShiftToken } from "./shift-token";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function apiErrorMessage(err: unknown): string {
  if (err instanceof TypeError && /fetch|network/i.test(String(err))) {
    return "Sunucuya ulaşılamıyor. İnternet bağlantısını kontrol edin.";
  }
  return err instanceof Error ? err.message : "Beklenmeyen bir hata oluştu.";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, init);
  } catch (err) {
    throw new Error(apiErrorMessage(err));
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(
      typeof body.error === "string" ? body.error : "Beklenmeyen bir hata oluştu."
    ) as Error & { distanceM?: number; status?: number };
    err.distanceM = typeof body.distanceM === "number" ? body.distanceM : undefined;
    err.status = res.status;
    throw err;
  }
  return body as T;
}

export async function shiftLoginWithCode(
  code: string
): Promise<{ token: string; employee: ShiftEmployee }> {
  return request("/api/shift/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
}

export async function shiftLoginWithPassword(
  username: string,
  password: string
): Promise<{ token: string; employee: ShiftEmployee }> {
  return request("/api/shift/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
}

export async function fetchShiftMe(): Promise<{
  employee: ShiftEmployee;
  todayEntry: ShiftEntry | null;
}> {
  const token = readShiftToken();
  return request("/api/shift/me", {
    headers: { Authorization: `Bearer ${token ?? ""}` },
  });
}

export async function shiftCheckIn(
  lat: number,
  lng: number
): Promise<{ entry: ShiftEntry; alreadyStarted: boolean; distanceM: number }> {
  const token = readShiftToken();
  return request("/api/shift/checkin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token ?? ""}`,
    },
    body: JSON.stringify({ lat, lng }),
  });
}

export async function shiftLogout(): Promise<void> {
  const token = readShiftToken();
  await request("/api/shift/logout", {
    method: "POST",
    headers: { Authorization: `Bearer ${token ?? ""}` },
  });
}
