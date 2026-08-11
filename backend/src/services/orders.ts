import { isPostgres } from "../lib/database";
import type { CreateOrderInput, Order, OrderStatus } from "../types/order";
import * as sqlite from "./orders-sqlite";
import * as pg from "./orders-pg";

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  if (isPostgres()) return pg.createOrder(input);
  return sqlite.createOrder(input);
}

export async function listOrders(channel?: "store" | "sales"): Promise<Order[]> {
  if (isPostgres()) return pg.listOrders(channel);
  return sqlite.listOrders(channel);
}

export async function getOrderById(id: number): Promise<Order | undefined> {
  if (isPostgres()) return pg.getOrderById(id);
  return sqlite.getOrderById(id);
}

export async function updateOrderStatus(id: number, status: OrderStatus): Promise<Order> {
  if (isPostgres()) return pg.updateOrderStatus(id, status);
  return sqlite.updateOrderStatus(id, status);
}

export async function deleteOrder(id: number): Promise<void> {
  if (isPostgres()) return pg.deleteOrder(id);
  return sqlite.deleteOrder(id);
}

export async function deleteOrders(ids: number[]): Promise<number> {
  if (isPostgres()) return pg.deleteOrders(ids);
  return sqlite.deleteOrders(ids);
}

export async function updateOrdersStatus(
  ids: number[],
  status: OrderStatus
): Promise<Order[]> {
  if (isPostgres()) return pg.updateOrdersStatus(ids, status);
  return sqlite.updateOrdersStatus(ids, status);
}

export async function getOrderCount(): Promise<number> {
  if (isPostgres()) return pg.getOrderCount();
  return sqlite.getOrderCount();
}
