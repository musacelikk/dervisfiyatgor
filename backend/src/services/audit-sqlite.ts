import { db } from "./db-sqlite";
import type {
  ActivityDay,
  AuditListResult,
  AuditLogInput,
  AuditLogRow,
  AuditStats,
  TopSearchedProduct,
} from "../types/audit";
import { rowToAuditLog } from "../types/audit";

function serializeMetadata(metadata: Record<string, unknown> | null | undefined): string | null {
  if (!metadata || Object.keys(metadata).length === 0) return null;
  return JSON.stringify(metadata);
}

export function writeAuditLog(input: AuditLogInput): void {
  const database = db();
  database.prepare(
    `INSERT INTO audit_logs (
      actor_type, actor_id, actor_name, action,
      resource_type, resource_id, message, metadata,
      ip, user_agent, success
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    input.actorType,
    input.actorId ?? null,
    input.actorName ?? null,
    input.action,
    input.resourceType ?? null,
    input.resourceId ?? null,
    input.message ?? null,
    serializeMetadata(input.metadata),
    input.ip ?? null,
    input.userAgent ?? null,
    input.success === false ? 0 : 1
  );
}

function todayStartSqlite(): string {
  return "datetime('now', 'start of day', 'localtime')";
}

export function listAuditLogs(options: {
  page: number;
  limit: number;
  action?: string;
  actorType?: string;
  q?: string;
}): AuditListResult {
  const database = db();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options.action) {
    if (options.action.endsWith(".")) {
      conditions.push("action LIKE ? ESCAPE '\\'");
      params.push(`${options.action}%`);
    } else {
      conditions.push("action = ?");
      params.push(options.action);
    }
  }
  if (options.actorType) {
    conditions.push("actor_type = ?");
    params.push(options.actorType);
  }
  if (options.q) {
    const like = `%${options.q.replace(/%/g, "\\%")}%`;
    conditions.push(
      "(message LIKE ? ESCAPE '\\' OR resource_id LIKE ? ESCAPE '\\' OR actor_name LIKE ? ESCAPE '\\' OR action LIKE ? ESCAPE '\\')"
    );
    params.push(like, like, like, like);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const total = (
    database.prepare(`SELECT COUNT(*) AS c FROM audit_logs ${where}`).get(...params) as { c: number }
  ).c;

  const offset = (options.page - 1) * options.limit;
  const rows = database
    .prepare(
      `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`
    )
    .all(...params, options.limit, offset) as AuditLogRow[];

  const totalPages = Math.max(1, Math.ceil(total / options.limit));

  return {
    logs: rows.map(rowToAuditLog),
    total,
    page: options.page,
    limit: options.limit,
    totalPages,
  };
}

export function getAuditStats(): AuditStats {
  const database = db();
  const today = todayStartSqlite();

  const totalLogs = (
    database.prepare(`SELECT COUNT(*) AS c FROM audit_logs`).get() as { c: number }
  ).c;

  const logsToday = (
    database.prepare(`SELECT COUNT(*) AS c FROM audit_logs WHERE created_at >= ${today}`).get() as {
      c: number;
    }
  ).c;

  const authEventsToday = (
    database
      .prepare(`SELECT COUNT(*) AS c FROM audit_logs WHERE created_at >= ${today} AND action LIKE 'auth.%'`)
      .get() as { c: number }
  ).c;

  const stockEventsToday = (
    database
      .prepare(
        `SELECT COUNT(*) AS c FROM audit_logs WHERE created_at >= ${today} AND (action LIKE 'product.%' OR action LIKE 'catalog.%') AND action != 'product.search'`
      )
      .get() as { c: number }
  ).c;

  const searchesToday = (
    database
      .prepare(
        `SELECT COUNT(*) AS c FROM audit_logs WHERE created_at >= ${today} AND action = 'product.search'`
      )
      .get() as { c: number }
  ).c;

  const topRows = database
    .prepare(
      `SELECT
        COALESCE(json_extract(metadata, '$.stockCode'), resource_id) AS stock_code,
        json_extract(metadata, '$.productName') AS product_name,
        COUNT(*) AS count
      FROM audit_logs
      WHERE action = 'product.search' AND success = 1
        AND created_at >= datetime('now', '-30 days')
      GROUP BY stock_code, product_name
      ORDER BY count DESC
      LIMIT 10`
    )
    .all() as { stock_code: string | null; product_name: string | null; count: number }[];

  const topSearchedProducts: TopSearchedProduct[] = topRows
    .filter((r) => r.stock_code)
    .map((r) => ({
      stockCode: r.stock_code!,
      productName: r.product_name,
      count: r.count,
    }));

  const activityRows = database
    .prepare(
      `SELECT date(created_at) AS day, COUNT(*) AS count
       FROM audit_logs
       WHERE created_at >= datetime('now', '-7 days')
       GROUP BY day
       ORDER BY day ASC`
    )
    .all() as ActivityDay[];

  return {
    totalLogs,
    logsToday,
    authEventsToday,
    stockEventsToday,
    searchesToday,
    topSearchedProducts,
    activityByDay: activityRows,
  };
}
