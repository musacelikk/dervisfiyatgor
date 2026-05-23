export const MANAGER_COOKIE = "manager_session";

async function sha256Hex(message: string): Promise<string> {
  const data = new TextEncoder().encode(message);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function getManagerSecret(): string {
  return process.env.MANAGER_SECRET ?? process.env.ADMIN_SECRET ?? "";
}

export async function getManagerToken(): Promise<string> {
  const secret = getManagerSecret();
  if (!secret) {
    throw new Error("MANAGER_SECRET veya ADMIN_SECRET tanımlı değil.");
  }
  return sha256Hex(`manager:${secret}`);
}

export async function isValidManagerToken(
  value: string | undefined
): Promise<boolean> {
  if (!value) return false;
  try {
    return value === (await getManagerToken());
  } catch {
    return false;
  }
}
