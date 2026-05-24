import { Router } from "express";
import { requireAdmin } from "../middleware/adminAuth";
import { getAuditContext } from "../lib/auditContext";
import { getAuditStats, listAuditLogs, logAuditFromContext, writeAuditLog } from "../services/audit";
import type { AuditLogInput } from "../types/audit";

const router = Router();

router.use(requireAdmin);

router.get("/", async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(10, Number(req.query.limit) || 30));
  const action = String(req.query.action ?? "").trim() || undefined;
  const actorType = String(req.query.actorType ?? "").trim() || undefined;
  const q = String(req.query.q ?? "").trim() || undefined;

  const result = await listAuditLogs({ page, limit, action, actorType, q });
  res.json(result);
});

router.get("/stats", async (_req, res) => {
  const stats = await getAuditStats();
  res.json(stats);
});

router.post("/", async (req, res) => {
  const body = req.body ?? {};
  const action = typeof body.action === "string" ? body.action.trim() : "";
  if (!action) {
    res.status(400).json({ error: "action gerekli." });
    return;
  }

  const ctx = getAuditContext(req);
  const input: AuditLogInput = {
    actorType:
      typeof body.actorType === "string" &&
      ["admin", "employee", "store", "system"].includes(body.actorType)
        ? body.actorType
        : ctx.actorType,
    actorId:
      typeof body.actorId === "string"
        ? body.actorId
        : ctx.actorId ?? (body.actorId === null ? null : ctx.actorId),
    actorName:
      typeof body.actorName === "string"
        ? body.actorName
        : ctx.actorName,
    action,
    resourceType: typeof body.resourceType === "string" ? body.resourceType : null,
    resourceId: typeof body.resourceId === "string" ? body.resourceId : null,
    message: typeof body.message === "string" ? body.message : null,
    metadata:
      body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
        ? (body.metadata as Record<string, unknown>)
        : null,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
    success: body.success !== false,
  };

  await writeAuditLog(input);
  res.status(201).json({ success: true });
});

export function auditFromRequest(
  req: Parameters<typeof getAuditContext>[0],
  input: Omit<Parameters<typeof logAuditFromContext>[1], never>
): void {
  logAuditFromContext(getAuditContext(req), input);
}

export default router;
