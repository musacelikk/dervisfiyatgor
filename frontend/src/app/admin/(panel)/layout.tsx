import AdminNav from "@/components/AdminNav";

export default function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AdminNav />
      {children}
    </>
  );
}
