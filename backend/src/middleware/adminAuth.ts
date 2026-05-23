import type { Request, Response, NextFunction } from "express";

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    res.status(503).json({ error: "ADMIN_SECRET yapılandırılmamış." });
    return;
  }

  const key = req.headers["x-admin-key"];
  if (key !== secret) {
    res.status(401).json({ error: "Yetkisiz erişim." });
    return;
  }

  next();
}
