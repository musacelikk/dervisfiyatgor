import { sha256Hex } from "@/lib/crypto";

export const ADMIN_COOKIE = "admin_session";

export async function getAdminToken(): Promise<string> {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    throw new Error("ADMIN_SECRET tanımlı değil.");
  }
  return sha256Hex(`admin:${secret}`);
}

export async function isValidAdminToken(
  value: string | undefined
): Promise<boolean> {
  if (!value) return false;
  try {
    return value === (await getAdminToken());
  } catch {
    return false;
  }
}
