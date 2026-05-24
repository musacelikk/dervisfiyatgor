import { isPostgres } from "../lib/database";
import type {
  AuditContext,
  AuditListResult,
  AuditLogInput,
  AuditStats,
} from "../types/audit";
import * as sqlite from "./audit-sqlite";
import * as pg from "./audit-pg";

export type { AuditLogInput, AuditStats, AuditListResult };

export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  if (isPostgres()) return pg.writeAuditLog(input);
  sqlite.writeAuditLog(input);
}

export function logAudit(input: AuditLogInput): void {
  void writeAuditLog(input).catch((err) => {
    console.error("Audit log yazılamadı:", err);
  });
}

export function logAuditFromContext(
  ctx: AuditContext,
  input: Omit<AuditLogInput, "actorType" | "actorId" | "actorName" | "ip" | "userAgent">
): void {
  logAudit({
    ...input,
    actorType: ctx.actorType,
    actorId: ctx.actorId,
    actorName: ctx.actorName,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });
}

export async function listAuditLogs(options: {
  page: number;
  limit: number;
  action?: string;
  actorType?: string;
  q?: string;
}): Promise<AuditListResult> {
  if (isPostgres()) return pg.listAuditLogs(options);
  return sqlite.listAuditLogs(options);
}

export async function getAuditStats(): Promise<AuditStats> {
  if (isPostgres()) return pg.getAuditStats();
  return sqlite.getAuditStats();
}
