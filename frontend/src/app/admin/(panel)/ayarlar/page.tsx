import AdminPlaceholder from "@/components/admin/AdminPlaceholder";

export default function AyarlarPage() {
  return (
    <AdminPlaceholder
      title="Ayarlar"
      description="Mağaza bilgileri, API bağlantısı ve admin tercihlerini bu bölümden yapılandırabileceksiniz."
      items={[
        "Mağaza adı ve iletişim bilgileri",
        "Backend API adresi",
        "Varsayılan fiyat listesi ve görünüm ayarları",
      ]}
    />
  );
}
