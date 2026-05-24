import { getPool } from "../lib/database";
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

export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  await getPool().query(
    `INSERT INTO audit_logs (
      actor_type, actor_id, actor_name, action,
      resource_type, resource_id, message, metadata,
      ip, user_agent, success
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11)`,
    [
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
      input.success !== false,
    ]
  );
}

export async function listAuditLogs(options: {
  page: number;
  limit: number;
  action?: string;
  actorType?: string;
  q?: string;
}): Promise<AuditListResult> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (options.action) {
    if (options.action.endsWith(".")) {
      conditions.push(`action LIKE $${paramIndex++}`);
      params.push(`${options.action}%`);
    } else {
      conditions.push(`action = $${paramIndex++}`);
      params.push(options.action);
    }
  }
  if (options.actorType) {
    conditions.push(`actor_type = $${paramIndex++}`);
    params.push(options.actorType);
  }
  if (options.q) {
    conditions.push(
      `(message ILIKE $${paramIndex} OR resource_id ILIKE $${paramIndex} OR actor_name ILIKE $${paramIndex} OR action ILIKE $${paramIndex})`
    );
    params.push(`%${options.q}%`);
    paramIndex++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await getPool().query(
    `SELECT COUNT(*)::int AS c FROM audit_logs ${where}`,
    params
  );
  const total = countResult.rows[0]?.c ?? 0;

  const offset = (options.page - 1) * options.limit;
  const listParams = [...params, options.limit, offset];
  const { rows } = await getPool().query(
    `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC, id DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    listParams
  );

  const totalPages = Math.max(1, Math.ceil(total / options.limit));

  return {
    logs: (rows as AuditLogRow[]).map(rowToAuditLog),
    total,
    page: options.page,
    limit: options.limit,
    totalPages,
  };
}

export async function getAuditStats(): Promise<AuditStats> {
  const p = getPool();

  const [totals, today, authToday, stockToday, searchToday, topRows, activityRows] =
    await Promise.all([
      p.query(`SELECT COUNT(*)::int AS c FROM audit_logs`),
      p.query(
        `SELECT COUNT(*)::int AS c FROM audit_logs WHERE created_at >= date_trunc('day', NOW())`
      ),
      p.query(
        `SELECT COUNT(*)::int AS c FROM audit_logs WHERE created_at >= date_trunc('day', NOW()) AND action LIKE 'auth.%'`
      ),
      p.query(
        `SELECT COUNT(*)::int AS c FROM audit_logs WHERE created_at >= date_trunc('day', NOW()) AND (action LIKE 'product.%' OR action LIKE 'catalog.%') AND action != 'product.search'`
      ),
      p.query(
        `SELECT COUNT(*)::int AS c FROM audit_logs WHERE created_at >= date_trunc('day', NOW()) AND action = 'product.search'`
      ),
      p.query(
        `SELECT
          COALESCE(metadata->>'stockCode', resource_id) AS stock_code,
          metadata->>'productName' AS product_name,
          COUNT(*)::int AS count
        FROM audit_logs
        WHERE action = 'product.search' AND success = true
          AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY 1, 2
        ORDER BY count DESC
        LIMIT 10`
      ),
      p.query(
        `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
         FROM audit_logs
         WHERE created_at >= NOW() - INTERVAL '7 days'
         GROUP BY 1
         ORDER BY 1 ASC`
      ),
    ]);

  const topSearchedProducts: TopSearchedProduct[] = topRows.rows
    .filter((r) => r.stock_code)
    .map((r) => ({
      stockCode: String(r.stock_code),
      productName: r.product_name ? String(r.product_name) : null,
      count: Number(r.count),
    }));

  return {
    totalLogs: totals.rows[0]?.c ?? 0,
    logsToday: today.rows[0]?.c ?? 0,
    authEventsToday: authToday.rows[0]?.c ?? 0,
    stockEventsToday: stockToday.rows[0]?.c ?? 0,
    searchesToday: searchToday.rows[0]?.c ?? 0,
    topSearchedProducts,
    activityByDay: activityRows.rows as ActivityDay[],
  };
}
