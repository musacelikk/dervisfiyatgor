export type StockCountItemStatus = "updated" | "unchanged";

export type StockCountStatus = "pending" | StockCountItemStatus;

export interface StockCountState {
  active: boolean;
  startedAt: string | null;
}
