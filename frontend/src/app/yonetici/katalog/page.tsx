import ImportPage from "@/components/ImportPage";
import { getEmployeeSession } from "@/lib/employee-route-auth";
import { hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function YoneticiKatalogPage() {
  const employee = await getEmployeeSession();
  if (!employee) redirect("/yonetici/login");

  const canDownload = hasPermission(employee.permissions, "excel.download");
  const canUpload = hasPermission(employee.permissions, "excel.upload");
  if (!canDownload && !canUpload) redirect("/yonetici");

  return <ImportPage mode="employee" permissions={employee.permissions} />;
}
