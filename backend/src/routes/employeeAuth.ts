import { Router } from "express";
import { authenticateEmployee } from "../services/employees";
import { getAuditContext } from "../lib/auditContext";
import { logAuditFromContext } from "../services/audit";

const router = Router();

function clientIp(req: Parameters<typeof getAuditContext>[0]): string | null {
  return getAuditContext(req, "store").ip;
}

router.post("/login", async (req, res) => {
  const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  if (!username || !password) {
    res.status(400).json({ error: "Kullanıcı adı ve şifre gerekli." });
    return;
  }

  const employee = await authenticateEmployee(username, password);
  const ctx = getAuditContext(req, "employee");
  ctx.ip = clientIp(req);
  ctx.userAgent =
    typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : null;

  if (!employee) {
    logAuditFromContext(ctx, {
      action: "auth.employee.login_failed",
      resourceType: "auth",
      resourceId: username,
      message: `Başarısız personel girişi: ${username}`,
      metadata: { username },
      success: false,
    });
    res.status(401).json({ error: "Kullanıcı adı veya şifre hatalı." });
    return;
  }

  logAuditFromContext(
    { ...ctx, actorId: String(employee.id), actorName: employee.name },
    {
      action: "auth.employee.login",
      resourceType: "auth",
      resourceId: String(employee.id),
      message: `Personel girişi: ${employee.name}`,
      metadata: { username: employee.username },
    }
  );

  res.json({ employee });
});

export default router;
