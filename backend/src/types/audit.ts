export type AuditActorType = "admin" | "employee" | "store" | "system";

export interface AuditContext {
  actorType: AuditActorType;
  actorId: string | null;
  actorName: string | null;
  ip: string | null;
  userAgent: string | null;
}

export interface AuditLogInput {
  actorType: AuditActorType;
  actorId?: string | null;
  actorName?: string | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
  success?: boolean;
}

export interface AuditLogRow {
  id: number;
  created_at: string;
  actor_type: AuditActorType;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  message: string | null;
  metadata: string | null;
  ip: string | null;
  user_agent: string | null;
  success: number | boolean;
}

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

export function rowToAuditLog(row: AuditLogRow): AuditLog {
  let metadata: Record<string, unknown> | null = null;
  if (row.metadata) {
    try {
      metadata = JSON.parse(row.metadata) as Record<string, unknown>;
    } catch {
      metadata = null;
    }
  }

  return {
    id: row.id,
    createdAt: row.created_at,
    actorType: row.actor_type,
    actorId: row.actor_id,
    actorName: row.actor_name,
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    message: row.message,
    metadata,
    ip: row.ip,
    userAgent: row.user_agent,
    success: Boolean(row.success),
  };
}
