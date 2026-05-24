import { Router } from "express";
import { getAuditContext } from "../lib/auditContext";
import { logAuditFromContext } from "../services/audit";
import {
  createAdminSession,
  revokeAdminSession,
  validateAdminSession,
} from "../services/sessions";

const router = Router();

function sessionToken(req: { headers: Record<string, unknown> }): string {
  const header = req.headers["x-admin-session"];
  return typeof header === "string" ? header.trim() : "";
}

router.post("/login", (req, res) => {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    res.status(503).json({ error: "ADMIN_SECRET yapılandırılmamış." });
    return;
  }

  const password =
    typeof req.body?.password === "string" ? req.body.password.trim() : "";
  const ctx = getAuditContext(req, "admin");
  ctx.actorName = "Yönetici";

  if (!password) {
    res.status(400).json({ error: "Şifre gerekli." });
    return;
  }

  if (password !== secret) {
    logAuditFromContext(ctx, {
      action: "auth.admin.login_failed",
      resourceType: "auth",
      message: "Başarısız admin giriş denemesi",
      success: false,
    });
    res.status(401).json({ error: "Hatalı şifre." });
    return;
  }

  const token = createAdminSession();
  logAuditFromContext(ctx, {
    action: "auth.admin.login",
    resourceType: "auth",
    message: "Admin paneline giriş yapıldı",
  });
  res.json({ token });
});

router.post("/verify", (req, res) => {
  const token =
    sessionToken(req) ||
    (typeof req.body?.token === "string" ? req.body.token.trim() : "");
  if (!validateAdminSession(token)) {
    res.status(401).json({ error: "Geçersiz oturum." });
    return;
  }
  res.json({ valid: true });
});

router.post("/logout", (req, res) => {
  const token = sessionToken(req);
  revokeAdminSession(token);
  const ctx = getAuditContext(req, "admin");
  ctx.actorName = "Yönetici";
  logAuditFromContext(ctx, {
    action: "auth.admin.logout",
    resourceType: "auth",
    message: "Admin panelinden çıkış yapıldı",
  });
  res.json({ success: true });
});

export default router;
