export const PERMISSION_IDS = [
  "scan",
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

export function hasPermission(
  permissions: PermissionId[] | undefined,
  required: PermissionId
): boolean {
  return Boolean(permissions?.includes(required));
}

export function permissionSummary(permissions: PermissionId[]): string {
  if (permissions.length === 0) return "Yetki yok";
  const labels = PERMISSION_GROUPS.flatMap((g) => g.items)
    .filter((item) => permissions.includes(item.id))
    .map((item) => item.label);
  if (labels.length <= 2) return labels.join(", ");
  return `${labels.length} yetki`;
}

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, "all"] as const;
export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

export function pageSizeToLimit(size: PageSizeOption): number | "all" {
  return size === "all" ? "all" : size;
}
