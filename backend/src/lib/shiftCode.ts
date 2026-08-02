import crypto from "crypto";

export const HONORIFICS = ["Bey", "Hanım"] as const;
export type Honorific = (typeof HONORIFICS)[number];

export function isValidShiftCode(code: string): boolean {
  return /^\d{4}$/.test(code);
}

export function normalizeHonorific(value: unknown): Honorific | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return (HONORIFICS as readonly string[]).includes(trimmed) ? (trimmed as Honorific) : null;
}

export function randomShiftCode(): string {
  return crypto.randomInt(0, 10000).toString().padStart(4, "0");
}
