import type { CartLine } from "@/lib/cart";
import { productSalePrice } from "@/lib/store-format";
import type { Order } from "@/types/order";

export type OrderExportRow = {
  no: number;
  stockCode: string;
  name: string;
  unitPrice: number | null;
  qty: number;
  total: number | null;
};

export type OrderExportData = {
  customerName: string;
  phone: string;
  orderCode: string;
  orderDate: string;
  rows: OrderExportRow[];
  grandTotal: number | null;
};

export type OrderExportInputFromCart = {
  lines: CartLine[];
  customerName: string;
  phone?: string;
  orderCode?: string;
};

export type OrderExportInputFromOrder = {
  order: Order;
};

export type OrderExportInput = OrderExportInputFromCart | OrderExportInputFromOrder;

export function formatOrderExportDate(iso?: string): string {
  try {
    const d = iso ? new Date(iso) : new Date();
    return new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return iso ?? new Date().toLocaleDateString("tr-TR");
  }
}

export function buildOrderExportData(data: OrderExportInput): OrderExportData {
  if ("order" in data) {
    const o = data.order;
    const rows = o.items.map((item, i) => ({
      no: i + 1,
      stockCode: item.stockCode,
      name: item.productName,
      unitPrice: item.salePrice,
      qty: item.quantity,
      total: item.lineTotal,
    }));
    return {
      customerName: `${o.firstName} ${o.lastName}`.trim(),
      phone: o.phone ?? "",
      orderCode: o.orderCode ?? `#${o.id}`,
      orderDate: formatOrderExportDate(o.createdAt),
      rows,
      grandTotal: o.totalAmount,
    };
  }

  const rows = data.lines.map((line, i) => {
    const unitPrice = productSalePrice(line.product) ?? null;
    const total = unitPrice != null ? unitPrice * line.quantity : null;
    return {
      no: i + 1,
      stockCode: line.product.stockCode,
      name: line.product.name,
      unitPrice,
      qty: line.quantity,
      total,
    };
  });

  return {
    customerName: data.customerName,
    phone: data.phone ?? "",
    orderCode: data.orderCode ?? "—",
    orderDate: formatOrderExportDate(),
    rows,
    grandTotal: rows.reduce((sum, r) => sum + (r.total ?? 0), 0),
  };
}

export function orderExportFileBaseName(orderCode: string): string {
  return `siparis-${orderCode !== "—" ? orderCode : Date.now()}`;
}
