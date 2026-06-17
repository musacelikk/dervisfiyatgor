import { getPool } from "../lib/database";
import { getProductByStockCode } from "./db-pg";
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

async function getUniqueOrderCode(): Promise<string> {
  const pool = getPool();
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = generateOrderCode();
    const { rows } = await pool.query(
      `SELECT id FROM orders WHERE order_code = $1 LIMIT 1`,
      [code]
    );
    if (!rows[0]) return code;
  }
  throw new Error("Benzersiz sipariş kodu oluşturulamadı.");
}

function validateCreateInput(input: CreateOrderInput): void {
  const firstName = input.firstName?.trim() ?? "";
  const lastName = input.lastName?.trim() ?? "";
  if (firstName.length < 2) throw new Error("Ad en az 2 karakter olmalı.");
  if (lastName.length < 2) throw new Error("Soyad en az 2 karakter olmalı.");
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

function mapOrderRow(row: Record<string, unknown>): OrderRow {
  return {
    id: Number(row.id),
    order_code: row.order_code != null ? String(row.order_code) : "",
    first_name: String(row.first_name),
    last_name: String(row.last_name),
    phone: row.phone == null ? null : String(row.phone),
    status: String(row.status) as OrderStatus,
    created_at:
      row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updated_at:
      row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

function mapItemRow(row: Record<string, unknown>): OrderItemRow {
  return {
    id: Number(row.id),
    order_id: Number(row.order_id),
    stock_code: String(row.stock_code),
    product_name: String(row.product_name),
    unit: row.unit == null ? null : String(row.unit),
    barcode: row.barcode == null ? null : String(row.barcode),
    quantity: Number(row.quantity),
    sale_price: row.sale_price == null ? null : Number(row.sale_price),
  };
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  validateCreateInput(input);
  const orderCode = await getUniqueOrderCode();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();
    const phone = input.phone?.trim() || null;

    const orderResult = await client.query(
      `INSERT INTO orders (order_code, first_name, last_name, phone, status, updated_at)
       VALUES ($1, $2, $3, $4, 'pending', NOW())
       RETURNING *`,
      [orderCode, firstName, lastName, phone]
    );
    const orderRow = mapOrderRow(orderResult.rows[0]);
    const itemRows: OrderItemRow[] = [];

    for (const item of input.items) {
      const product = await getProductByStockCode(item.stockCode.trim());
      if (!product) throw new Error(`Ürün bulunamadı: ${item.stockCode}`);
      const itemResult = await client.query(
        `INSERT INTO order_items (
          order_id, stock_code, product_name, unit, barcode, quantity, sale_price
        ) VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING *`,
        [
          orderRow.id,
          product.stock_code,
          product.name,
          product.unit,
          product.barcode,
          item.quantity,
          product.sale_price_1 ?? product.sale_price_2,
        ]
      );
      itemRows.push(mapItemRow(itemResult.rows[0]));
    }

    await client.query("COMMIT");
    return buildOrder(orderRow, itemRows);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function listOrders(): Promise<Order[]> {
  const pool = getPool();
  const { rows } = await pool.query(`SELECT * FROM orders ORDER BY created_at DESC LIMIT 200`);
  const orders: Order[] = [];
  for (const row of rows) {
    const orderRow = mapOrderRow(row);
    const itemsResult = await pool.query(
      `SELECT * FROM order_items WHERE order_id = $1 ORDER BY id`,
      [orderRow.id]
    );
    orders.push(
      buildOrder(
        orderRow,
        itemsResult.rows.map(mapItemRow)
      )
    );
  }
  return orders;
}

export async function getOrderById(id: number): Promise<Order | undefined> {
  const pool = getPool();
  const orderResult = await pool.query(`SELECT * FROM orders WHERE id = $1`, [id]);
  if (!orderResult.rows[0]) return undefined;
  const orderRow = mapOrderRow(orderResult.rows[0]);
  const itemsResult = await pool.query(
    `SELECT * FROM order_items WHERE order_id = $1 ORDER BY id`,
    [id]
  );
  return buildOrder(orderRow, itemsResult.rows.map(mapItemRow));
}

export async function updateOrderStatus(id: number, status: OrderStatus): Promise<Order> {
  if (!["pending", "preparing", "completed", "cancelled"].includes(status)) {
    throw new Error("Geçersiz sipariş durumu.");
  }
  const result = await getPool().query(
    `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [status, id]
  );
  if (!result.rows[0]) throw new Error("Sipariş bulunamadı.");
  const order = await getOrderById(id);
  if (!order) throw new Error("Sipariş bulunamadı.");
  return order;
}

export async function deleteOrder(id: number): Promise<void> {
  const result = await getPool().query(`DELETE FROM orders WHERE id = $1`, [id]);
  if (result.rowCount === 0) throw new Error("Sipariş bulunamadı.");
}

export async function getOrderCount(): Promise<number> {
  const { rows } = await getPool().query(`SELECT COUNT(*)::int AS count FROM orders`);
  return rows[0].count as number;
}
