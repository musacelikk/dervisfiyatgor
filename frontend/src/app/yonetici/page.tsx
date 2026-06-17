import ScanPage from "@/components/ScanPage";
import { resolveEmployeeHomePath } from "@/lib/employee-nav";
import { getEmployeeSession } from "@/lib/employee-route-auth";
import { hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function YoneticiPage() {
  const employee = await getEmployeeSession();
  if (!employee) redirect("/yonetici/login");

  if (hasPermission(employee.permissions, "scan")) {
    return <ScanPage variant="manager" permissions={employee.permissions} personnelName={employee.name} />;
  }

  redirect(resolveEmployeeHomePath(employee.permissions));
}
