export const ORDER_STATUSES = ["pending", "preparing", "completed", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** store = müşteri mağazası sepeti, sales = satış personeli kataloğu */
export const ORDER_CHANNELS = ["store", "sales"] as const;
export type OrderChannel = (typeof ORDER_CHANNELS)[number];

export type OrderItemRow = {
  id: number;
  order_id: number;
  stock_code: string;
  product_name: string;
  unit: string | null;
  barcode: string | null;
  quantity: number;
  sale_price: number | null;
};

export type OrderRow = {
  id: number;
  order_code: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  status: OrderStatus;
  channel: OrderChannel;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

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
  channel: OrderChannel;
  createdBy: string | null;
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
  /** Varsayılan "store". "sales" kanalında isim/telefon boş bırakılabilir. */
  channel?: OrderChannel;
  /** Satış kanalında siparişi oluşturan personel (opsiyonel). */
  createdBy?: string;
  items: { stockCode: string; quantity: number }[];
};

export function rowToOrderItem(row: OrderItemRow): OrderItem {
  const lineTotal =
    row.sale_price != null ? row.sale_price * row.quantity : null;
  return {
    id: row.id,
    stockCode: row.stock_code,
    productName: row.product_name,
    unit: row.unit,
    barcode: row.barcode,
    quantity: row.quantity,
    salePrice: row.sale_price,
    lineTotal,
  };
}

export function buildOrder(
  row: OrderRow,
  itemRows: OrderItemRow[]
): Order {
  const items = itemRows.map(rowToOrderItem);
  const totalAmount = items.reduce(
    (sum, item) => sum + (item.lineTotal ?? 0),
    0
  );
  const hasPrice = items.some((item) => item.salePrice != null);
  return {
    id: row.id,
    orderCode: row.order_code,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    status: row.status as OrderStatus,
    channel: (row.channel as OrderChannel) ?? "store",
    createdBy: row.created_by ?? null,
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    totalAmount: hasPrice ? totalAmount : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Bekliyor",
  preparing: "Hazırlanıyor",
  completed: "Tamamlandı",
  cancelled: "İptal",
};
