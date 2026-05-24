import type { Request, Response, NextFunction } from "express";
import {
  validateAdminSession,
  validateEmployeeSession,
} from "../services/sessions";

function adminKeyAuthorized(req: Request): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  const key = req.headers["x-admin-key"];
  return typeof key === "string" && key === secret;
}

function adminSessionAuthorized(req: Request): boolean {
  const token = req.headers["x-admin-session"];
  return typeof token === "string" && validateAdminSession(token.trim());
}

function employeeSessionAuthorized(req: Request): boolean {
  const token = req.headers["x-employee-session"];
  if (typeof token !== "string") return false;
  const session = validateEmployeeSession(token.trim());
  if (!session) return false;
  (req as Request & { employeeId?: number }).employeeId = session.employeeId;
  return true;
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!process.env.ADMIN_SECRET && !adminSessionAuthorized(req)) {
    res.status(503).json({ error: "ADMIN_SECRET yapılandırılmamış." });
    return;
  }

  if (adminKeyAuthorized(req) || adminSessionAuthorized(req)) {
    next();
    return;
  }

  res.status(401).json({ error: "Yetkisiz erişim." });
}

export function requireAdminOrEmployee(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (
    !process.env.ADMIN_SECRET &&
    !adminSessionAuthorized(req) &&
    !employeeSessionAuthorized(req)
  ) {
    res.status(503).json({ error: "ADMIN_SECRET yapılandırılmamış." });
    return;
  }

  if (
    adminKeyAuthorized(req) ||
    adminSessionAuthorized(req) ||
    employeeSessionAuthorized(req)
  ) {
    next();
    return;
  }

  res.status(401).json({ error: "Yetkisiz erişim." });
}
