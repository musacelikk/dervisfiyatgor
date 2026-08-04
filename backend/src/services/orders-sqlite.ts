import { db, getProductByStockCode } from "./db-sqlite";
import {
  buildOrder,
  type CreateOrderInput,
  type Order,
  type OrderItemRow,
  type OrderRow,
  type OrderStatus,
} from "../types/order";

const ORDER_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ORDER_CODE_LENGTH = 6;

function generateOrderCode(): string {
  let code = "";
  for (let i = 0; i < ORDER_CODE_LENGTH; i++) {
    code += ORDER_CODE_CHARS[Math.floor(Math.random() * ORDER_CODE_CHARS.length)];
  }
  return code;
}

function getUniqueOrderCode(): string {
  const database = db();
  const check = database.prepare(`SELECT id FROM orders WHERE order_code = ? LIMIT 1`);
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = generateOrderCode();
    if (!check.get(code)) return code;
  }
  throw new Error("Benzersiz sipariş kodu oluşturulamadı.");
}

function ensureOrdersSchema(): void {
  const database = db();
  database.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_code TEXT UNIQUE,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      phone TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      stock_code TEXT NOT NULL,
      product_name TEXT NOT NULL,
      unit TEXT,
      barcode TEXT,
      quantity REAL NOT NULL DEFAULT 1,
      sale_price REAL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
  `);
}

function validateCreateInput(input: CreateOrderInput): void {
  const firstName = input.firstName?.trim() ?? "";
  const lastName = input.lastName?.trim() ?? "";
  // Satış kanalında müşteri bilgisi opsiyonel (personel dükkanda oluşturur)
  if (input.channel !== "sales") {
    if (firstName.length < 2) throw new Error("Ad en az 2 karakter olmalı.");
    if (lastName.length < 2) throw new Error("Soyad en az 2 karakter olmalı.");
  }
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new Error("Sepette en az bir ürün olmalı.");
  }
  for (const item of input.items) {
    if (!item.stockCode?.trim()) throw new Error("Geçersiz ürün satırı.");
    if (!Number.isFinite(item.quantity) || item.quantity < 1) {
      throw new Error("Ürün adedi en az 1 olmalı.");
    }
  }
}

export function createOrder(input: CreateOrderInput): Order {
  ensureOrdersSchema();
  validateCreateInput(input);

  const database = db();
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const phone = input.phone?.trim() || null;
  const channel = input.channel === "sales" ? "sales" : "store";
  const createdBy = input.createdBy?.trim() || null;

  const orderCode = getUniqueOrderCode();
  const insertOrder = database.prepare(`
    INSERT INTO orders (order_code, first_name, last_name, phone, status, channel, created_by, updated_at)
    VALUES (?, ?, ?, ?, 'pending', ?, ?, datetime('now'))
  `);
  const insertItem = database.prepare(`
    INSERT INTO order_items (
      order_id, stock_code, product_name, unit, barcode, quantity, sale_price
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const tx = database.transaction((payload: CreateOrderInput) => {
    const result = insertOrder.run(orderCode, firstName, lastName, phone, channel, createdBy);
    const orderId = Number(result.lastInsertRowid);

    for (const item of payload.items) {
      const product = getProductByStockCode(item.stockCode.trim());
      if (!product) {
        throw new Error(`Ürün bulunamadı: ${item.stockCode}`);
      }
      insertItem.run(
        orderId,
        product.stock_code,
        product.name,
        product.unit,
        product.barcode,
        item.quantity,
        product.sale_price_1 ?? product.sale_price_2
      );
    }

    return orderId;
  });

  const orderId = tx(input);
  const order = getOrderById(orderId);
  if (!order) throw new Error("Sipariş oluşturulamadı.");
  return order;
}

export function listOrders(channel?: "store" | "sales"): Order[] {
  ensureOrdersSchema();
  const database = db();
  const rows = (
    channel
      ? database
          .prepare(
            `SELECT * FROM orders WHERE COALESCE(channel, 'store') = ?
             ORDER BY datetime(created_at) DESC LIMIT 200`
          )
          .all(channel)
      : database
          .prepare(`SELECT * FROM orders ORDER BY datetime(created_at) DESC LIMIT 200`)
          .all()
  ) as OrderRow[];

  return rows.map((row) => {
    const items = database
      .prepare(`SELECT * FROM order_items WHERE order_id = ? ORDER BY id`)
      .all(row.id) as OrderItemRow[];
    return buildOrder(row, items);
  });
}

export function getOrderById(id: number): Order | undefined {
  ensureOrdersSchema();
  const database = db();
  const row = database.prepare(`SELECT * FROM orders WHERE id = ?`).get(id) as OrderRow | undefined;
  if (!row) return undefined;
  const items = database
    .prepare(`SELECT * FROM order_items WHERE order_id = ? ORDER BY id`)
    .all(id) as OrderItemRow[];
  return buildOrder(row, items);
}

export function updateOrderStatus(id: number, status: OrderStatus): Order {
  ensureOrdersSchema();
  if (!["pending", "preparing", "completed", "cancelled"].includes(status)) {
    throw new Error("Geçersiz sipariş durumu.");
  }
  const database = db();
  const result = database
    .prepare(`UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(status, id);
  if (result.changes === 0) throw new Error("Sipariş bulunamadı.");
  const order = getOrderById(id);
  if (!order) throw new Error("Sipariş bulunamadı.");
  return order;
}

export function deleteOrder(id: number): void {
  ensureOrdersSchema();
  const result = db().prepare(`DELETE FROM orders WHERE id = ?`).run(id);
  if (result.changes === 0) throw new Error("Sipariş bulunamadı.");
}

export function getOrderCount(): number {
  ensureOrdersSchema();
  const row = db().prepare(`SELECT COUNT(*) as count FROM orders`).get() as { count: number };
  return row.count;
}
