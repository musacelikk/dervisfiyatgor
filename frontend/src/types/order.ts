export type OrderStatus = "pending" | "preparing" | "completed" | "cancelled";

export type OrderItem = {
  id: number;
  stockCode: string;
  productName: string;
  unit: string | null;
  barcode: string | null;
  quantity: number;
  salePrice: number | null;
  lineTotal: number | null;
};

export type Order = {
  id: number;
  orderCode: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  status: OrderStatus;
  items: OrderItem[];
  itemCount: number;
  totalAmount: number | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateOrderInput = {
  firstName: string;
  lastName: string;
  phone?: string;
  items: { stockCode: string; quantity: number }[];
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Bekliyor",
  preparing: "Hazırlanıyor",
  completed: "Tamamlandı",
  cancelled: "İptal",
};

export const ORDER_STATUS_CLASSES: Record<OrderStatus, string> = {
  pending: "admin-order-status-pending",
  preparing: "admin-order-status-preparing",
  completed: "admin-order-status-completed",
  cancelled: "admin-order-status-cancelled",
};
