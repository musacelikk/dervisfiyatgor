import ProductsPage from "@/components/admin/ProductsPage";
import { requireEmployeePagePermission } from "@/lib/employee-route-auth";

export default async function YoneticiUrunlerPage() {
  const employee = await requireEmployeePagePermission("products.view");

  return <ProductsPage mode="employee" permissions={employee.permissions} />;
}
