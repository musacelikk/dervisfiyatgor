/** Kullanıcı yazarken yalnızca sayı, virgül ve noktaya izin verir. */
export function sanitizeNumericInput(raw: string): string {
  let value = raw.replace(/[^\d.,]/g, "");

  const commaIndex = value.indexOf(",");
  const dotIndex = value.indexOf(".");

  if (commaIndex !== -1 && dotIndex !== -1) {
    if (commaIndex < dotIndex) {
      value = value.replace(/\./g, "");
    } else {
      value = value.replace(/,/g, "");
    }
  }

  const separator = value.includes(",") ? "," : value.includes(".") ? "." : null;
  if (separator) {
    const [head, ...rest] = value.split(separator);
    value = head + separator + rest.join("").replace(/[.,]/g, "");
  }

  return value;
}

export function parseNumericInput(value: string): number | null {
  const trimmed = value.trim().replace(/\s/g, "");
  if (!trimmed) return null;

  const normalized = trimmed.replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export function formatNumericInput(value: number | null | undefined): string {
  if (value == null) return "";
  if (Number.isInteger(value)) return String(value);
  return String(value).replace(".", ",");
}
