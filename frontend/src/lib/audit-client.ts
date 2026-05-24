import { cookies } from "next/headers";
import { ADMIN_COOKIE } from "@/lib/admin-session";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type ClientAuditInput = {
  action: string;
  actorType?: "admin" | "employee" | "store" | "system";
  actorId?: string | null;
  actorName?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
  success?: boolean;
};

/** Sunucu tarafı (API route) audit kaydı — admin oturumu ile backend'e yazar. */
export async function logServerAudit(input: ClientAuditInput): Promise<void> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return;

  try {
    await fetch(`${API_URL}/api/admin/audit`, {
      method: "POST",
      headers: {
        "X-Admin-Session": token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
  } catch {
    /* audit yazılamazsa uygulama akışını bozma */
  }
}
