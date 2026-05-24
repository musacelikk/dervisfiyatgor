export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "auth.admin.login": "Admin girişi",
  "auth.admin.login_failed": "Başarısız admin girişi",
  "auth.admin.logout": "Admin çıkışı",
  "auth.employee.login": "Personel girişi",
  "auth.employee.login_failed": "Başarısız personel girişi",
  "auth.employee.logout": "Personel çıkışı",
  "product.search": "Ürün sorgusu",
  "product.create": "Ürün eklendi",
  "product.update": "Ürün güncellendi",
  "product.delete": "Ürün silindi",
  "catalog.import": "Excel içe aktarma",
  "catalog.export": "Excel dışa aktarma",
  "catalog.clear": "Katalog temizlendi",
  "employee.create": "Personel eklendi",
  "employee.update": "Personel güncellendi",
  "employee.delete": "Personel silindi",
  "order.create": "Sipariş oluşturuldu",
  "order.status_update": "Sipariş durumu güncellendi",
};

export const AUDIT_ACTOR_LABELS: Record<string, string> = {
  admin: "Yönetici",
  employee: "Personel",
  store: "Mağaza",
  system: "Sistem",
};

export function getAuditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}

export function getAuditActorLabel(actorType: string): string {
  return AUDIT_ACTOR_LABELS[actorType] ?? actorType;
}

export const AUDIT_ACTION_FILTERS = [
  { value: "", label: "Tüm işlemler" },
  { value: "auth.", label: "Giriş / çıkış" },
  { value: "product.search", label: "Ürün sorguları" },
  { value: "product.", label: "Stok işlemleri" },
  { value: "catalog.", label: "Excel / katalog" },
  { value: "employee.", label: "Personel" },
  { value: "order.", label: "Siparişler" },
] as const;
