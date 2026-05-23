export const ADMIN_COOKIE = "admin_session";

async function sha256Hex(message: string): Promise<string> {
  const data = new TextEncoder().encode(message);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

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
