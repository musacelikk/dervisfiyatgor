import { requireEmployeePagePermission } from "@/lib/employee-route-auth";
import OrdersPage from "@/components/admin/OrdersPage";

export default async function YoneticiSepetPage() {
  await requireEmployeePagePermission("orders.view");
  return <OrdersPage mode="manager" />;
}
