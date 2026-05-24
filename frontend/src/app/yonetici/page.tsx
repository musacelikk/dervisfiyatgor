import ScanPage from "@/components/ScanPage";
import { getEmployeeSession } from "@/lib/employee-route-auth";
import { hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function YoneticiPage() {
  const employee = await getEmployeeSession();
  if (!employee) redirect("/yonetici/login");

  if (!hasPermission(employee.permissions, "scan")) {
    if (hasPermission(employee.permissions, "products.view")) {
      redirect("/yonetici/urunler");
    }
    if (
      hasPermission(employee.permissions, "excel.download") ||
      hasPermission(employee.permissions, "excel.upload")
    ) {
      redirect("/yonetici/katalog");
    }
    redirect("/yonetici/login");
  }

  return <ScanPage variant="manager" permissions={employee.permissions} />;
}
