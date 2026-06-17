export function formatPersonnelCustomerName(name: string): string {
  const trimmed = name.trim();
  return trimmed ? `${trimmed} (personel)` : "Personel";
}

/** Sipariş kaydı için ad/soyad alanlarına böler; soyad sonuna (personel) eklenir. */
export function splitPersonnelOrderName(name: string): { firstName: string; lastName: string } {
  const normalized = name.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return { firstName: "Personel", lastName: "(personel)" };
  }

  const spaceIndex = normalized.indexOf(" ");
  if (spaceIndex === -1) {
    return {
      firstName: normalized.length >= 2 ? normalized : "Personel",
      lastName: "(personel)",
    };
  }

  const firstName = normalized.slice(0, spaceIndex);
  const rest = normalized.slice(spaceIndex + 1).trim();
  return {
    firstName: firstName.length >= 2 ? firstName : normalized,
    lastName: rest ? `${rest} (personel)` : "(personel)",
  };
}
