import type { Request } from "express";
import type { AuditActorType, AuditContext } from "../types/audit";

const VALID_ACTOR_TYPES = new Set<AuditActorType>(["admin", "employee", "store", "system"]);

export function getAuditContext(req: Request, defaultActor: AuditActorType = "admin"): AuditContext {
  const headerType = req.headers["x-actor-type"];
  const actorType =
    typeof headerType === "string" && VALID_ACTOR_TYPES.has(headerType as AuditActorType)
      ? (headerType as AuditActorType)
      : defaultActor;

  const actorId =
    typeof req.headers["x-actor-id"] === "string" ? req.headers["x-actor-id"] : null;

  const rawName =
    typeof req.headers["x-actor-name"] === "string" ? req.headers["x-actor-name"] : null;
  let actorName: string | null = null;
  if (rawName) {
    try {
      actorName = decodeURIComponent(rawName);
    } catch {
      actorName = rawName;
    }
  } else if (actorType === "admin") {
    actorName = "Yönetici";
  }

  const forwarded = req.headers["x-forwarded-for"];
  const ip =
    (typeof forwarded === "string" ? forwarded.split(",")[0]?.trim() : null) ||
    req.socket.remoteAddress ||
    null;

  const userAgent =
    typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : null;

  return { actorType, actorId, actorName, ip, userAgent };
}
