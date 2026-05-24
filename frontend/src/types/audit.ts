export type AuditActorType = "admin" | "employee" | "store" | "system";

export interface AuditLog {
  id: number;
  createdAt: string;
  actorType: AuditActorType;
  actorId: string | null;
  actorName: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  message: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  success: boolean;
}

export interface TopSearchedProduct {
  stockCode: string;
  productName: string | null;
  count: number;
}

export interface ActivityDay {
  day: string;
  count: number;
}

export interface AuditStats {
  totalLogs: number;
  logsToday: number;
  authEventsToday: number;
  stockEventsToday: number;
  searchesToday: number;
  topSearchedProducts: TopSearchedProduct[];
  activityByDay: ActivityDay[];
}

export interface AuditListResult {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
