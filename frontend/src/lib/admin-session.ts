import { verifyAdminSession } from "@/lib/session-verify";

export const ADMIN_COOKIE = "admin_session";

export async function isValidAdminToken(
  value: string | undefined
): Promise<boolean> {
  return verifyAdminSession(value);
}
