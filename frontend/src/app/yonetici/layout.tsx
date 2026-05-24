import EmployeeLayout from "@/components/EmployeeLayout";

export const metadata = {
  title: "Çalışan | DervişMobil",
  robots: { index: false, follow: false },
};

export default function YoneticiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="employee-root">
      <EmployeeLayout>{children}</EmployeeLayout>
    </div>
  );
}
