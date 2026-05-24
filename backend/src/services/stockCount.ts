import { isPostgres } from "../lib/database";
import type { StockCountItemStatus, StockCountState } from "../types/stockCount";
import * as sqlite from "./stockCount-sqlite";
import * as pg from "./stockCount-pg";

export async function isStockCountActive(): Promise<boolean> {
  if (isPostgres()) return pg.isStockCountActive();
  return sqlite.isStockCountActive();
}

export async function getStockCountState(): Promise<StockCountState> {
  if (isPostgres()) return pg.getStockCountState();
  return sqlite.getStockCountState();
}

export async function startStockCount(): Promise<StockCountState> {
  if (isPostgres()) return pg.startStockCount();
  return sqlite.startStockCount();
}

export async function stopStockCount(): Promise<StockCountState> {
  if (isPostgres()) return pg.stopStockCount();
  return sqlite.stopStockCount();
}

export async function recordStockCountItem(
  stockCode: string,
  status: StockCountItemStatus
): Promise<void> {
  if (isPostgres()) return pg.recordStockCountItem(stockCode, status);
  return sqlite.recordStockCountItem(stockCode, status);
}

export async function getStockCountStatuses(
  stockCodes: string[]
): Promise<Record<string, StockCountItemStatus>> {
  if (isPostgres()) return pg.getStockCountStatuses(stockCodes);
  return sqlite.getStockCountStatuses(stockCodes);
}
