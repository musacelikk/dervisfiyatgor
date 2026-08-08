export const PERMISSION_IDS = [
  "scan",
  "prices.sale2",
  "prices.purchase",
  "products.view",
  "products.create",
  "products.edit",
  "products.delete",
  "excel.download",
  "excel.upload",
  "orders.view",
] as const;

export type PermissionId = (typeof PERMISSION_IDS)[number];

export const DEFAULT_EMPLOYEE_PERMISSIONS: PermissionId[] = ["scan"];

export const PERMISSION_GROUPS: {
  label: string;
  items: { id: PermissionId; label: string; description?: string }[];
}[] = [
  {
    label: "Fiyat gör",
    items: [
      { id: "scan", label: "Barkod okutma / fiyat sorgulama" },
      {
        id: "prices.sale2",
        label: "Satış 2 görüntüleme",
        description: "Kapalıyken personel yalnızca 1. satış fiyatını görür.",
      },
      { id: "prices.purchase", label: "Alış fiyatlarını görme" },
    ],
  },
  {
    label: "Stok / ürün",
    items: [
      { id: "products.view", label: "Ürün listesini görüntüleme" },
      { id: "products.create", label: "Yeni ürün ekleme" },
      { id: "products.edit", label: "Ürün düzenleme" },
      { id: "products.delete", label: "Ürün silme" },
    ],
  },
  {
    label: "Excel",
    items: [
      { id: "excel.download", label: "Excel şablon / katalog indirme" },
      { id: "excel.upload", label: "Excel ile katalog yükleme" },
    ],
  },
  {
    label: "Sepet / sipariş",
    items: [{ id: "orders.view", label: "Sepet siparişlerini görüntüleme" }],
  },
];

const VALID = new Set<string>(PERMISSION_IDS);

export function parsePermissions(raw: string | null | undefined): PermissionId[] {
  if (!raw?.trim()) return [...DEFAULT_EMPLOYEE_PERMISSIONS];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...DEFAULT_EMPLOYEE_PERMISSIONS];
    const out: PermissionId[] = [];
    for (const item of parsed) {
      if (typeof item === "string" && VALID.has(item)) {
        out.push(item as PermissionId);
      }
    }
    return out.length > 0 ? out : [...DEFAULT_EMPLOYEE_PERMISSIONS];
  } catch {
    return [...DEFAULT_EMPLOYEE_PERMISSIONS];
  }
}

export function serializePermissions(permissions: PermissionId[]): string {
  const unique = PERMISSION_IDS.filter((id) => permissions.includes(id));
  return JSON.stringify(unique.length > 0 ? unique : DEFAULT_EMPLOYEE_PERMISSIONS);
}

export function hasPermission(
  permissions: PermissionId[],
  required: PermissionId
): boolean {
  return permissions.includes(required);
}

export function normalizePermissionsInput(value: unknown): PermissionId[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: PermissionId[] = [];
  for (const item of value) {
    if (typeof item === "string" && VALID.has(item)) {
      out.push(item as PermissionId);
    }
  }
  return out;
}
