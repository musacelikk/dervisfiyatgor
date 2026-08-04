import type { CreateOrderInput, Order } from "@/types/order";

export type SalesCartItem = {
  stockCode: string;
  name: string;
  imageUrl: string | null;
  qty: number;
};

const CART_KEY = "dervis-sales-cart";
const CREATOR_KEY = "dervis-sales-creator";

export function readSalesCart(): SalesCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SalesCartItem[];
    return Array.isArray(parsed)
      ? parsed.filter((i) => i && i.stockCode && i.qty > 0)
      : [];
  } catch {
    return [];
  }
}

export function writeSalesCart(items: SalesCartItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

export function clearSalesCart(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CART_KEY);
  } catch {
    /* ignore */
  }
}

/** "Siparişi oluşturan" alanı cihazda hatırlanır (aynı personel hep aynı telefon). */
export function readCreatorName(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(CREATOR_KEY) ?? "";
  } catch {
    return "";
  }
}

export function writeCreatorName(name: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CREATOR_KEY, name);
  } catch {
    /* ignore */
  }
}

/** "Ahmet Mehmet Yılmaz" → { firstName: "Ahmet Mehmet", lastName: "Yılmaz" } */
export function splitCustomerName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  const lastName = parts.pop() as string;
  return { firstName: parts.join(" "), lastName };
}

export async function submitSalesOrder(input: {
  customerName: string;
  phone: string;
  createdBy: string;
  items: SalesCartItem[];
}): Promise<Order> {
  const { firstName, lastName } = splitCustomerName(input.customerName);
  const payload: CreateOrderInput = {
    firstName,
    lastName,
    phone: input.phone.trim() || undefined,
    channel: "sales",
    createdBy: input.createdBy.trim() || undefined,
    items: input.items.map((i) => ({ stockCode: i.stockCode, quantity: i.qty })),
  };

  const res = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof body.error === "string" ? body.error : "Sipariş oluşturulamadı."
    );
  }
  return body.order as Order;
}

export function buildShareText(order: Order): string {
  const lines: string[] = [];
  lines.push("Derviş Plastik — Sipariş");
  lines.push(`Sipariş kodu: ${order.orderCode}`);
  const customer = `${order.firstName} ${order.lastName}`.trim();
  if (customer) lines.push(`Müşteri: ${customer}`);
  lines.push("");
  lines.push("Ürünler:");
  for (const item of order.items) {
    lines.push(`• ${item.productName} × ${item.quantity}${item.unit ? ` ${item.unit}` : ""}`);
  }
  lines.push("");
  lines.push(`Toplam ${order.itemCount} adet ürün`);
  return lines.join("\n");
}
