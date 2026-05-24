import type { CreateOrderInput, Order, OrderStatus } from "@/types/order";

export async function submitOrder(input: CreateOrderInput): Promise<Order> {
  const res = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body.error === "string" ? body.error : "Sipariş oluşturulamadı.");
  }
  return body.order as Order;
}

export async function fetchOrders(): Promise<Order[]> {
  const res = await fetch("/api/admin/orders");
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body.error === "string" ? body.error : "Siparişler yüklenemedi.");
  }
  return (body.orders ?? []) as Order[];
}

export async function fetchManagerOrders(): Promise<Order[]> {
  const res = await fetch("/api/yonetici/orders");
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body.error === "string" ? body.error : "Siparişler yüklenemedi.");
  }
  return (body.orders ?? []) as Order[];
}

export async function updateOrderStatus(id: number, status: OrderStatus): Promise<Order> {
  const res = await fetch(`/api/admin/orders/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body.error === "string" ? body.error : "Güncellenemedi.");
  }
  return body.order as Order;
}

export async function updateManagerOrderStatus(
  id: number,
  status: OrderStatus
): Promise<Order> {
  const res = await fetch(`/api/yonetici/orders/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body.error === "string" ? body.error : "Güncellenemedi.");
  }
  return body.order as Order;
}

export function formatOrderMoney(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatOrderDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
