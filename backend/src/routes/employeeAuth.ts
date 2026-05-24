import { Router } from "express";
import { authenticateEmployee, findEmployeeById } from "../services/employees";
import { rowToEmployee } from "../types/employee";
import { getAuditContext } from "../lib/auditContext";
import { logAuditFromContext } from "../services/audit";
import {
  createEmployeeSession,
  revokeEmployeeSession,
  validateEmployeeSession,
} from "../services/sessions";

const router = Router();

function clientIp(req: Parameters<typeof getAuditContext>[0]): string | null {
  return getAuditContext(req, "store").ip;
}

function sessionToken(req: { headers: Record<string, unknown> }): string {
  const header = req.headers["x-employee-session"];
  return typeof header === "string" ? header.trim() : "";
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

  const token = createEmployeeSession(employee.id);
  res.json({ employee, token });
});

router.post("/verify", (req, res) => {
  const token =
    sessionToken(req) ||
    (typeof req.body?.token === "string" ? req.body.token.trim() : "");
  const session = validateEmployeeSession(token);
  if (!session) {
    res.status(401).json({ error: "Geçersiz oturum." });
    return;
  }
  res.json({ valid: true, employeeId: session.employeeId });
});

router.get("/me", async (req, res) => {
  const token = sessionToken(req);
  const session = validateEmployeeSession(token);
  if (!session) {
    res.status(401).json({ error: "Geçersiz oturum." });
    return;
  }

  const row = await findEmployeeById(session.employeeId);
  if (!row || (row.active !== 1 && row.active !== true)) {
    revokeEmployeeSession(token);
    res.status(401).json({ error: "Geçersiz oturum." });
    return;
  }

  res.json({ employee: rowToEmployee(row) });
});

router.post("/logout", async (req, res) => {
  const token = sessionToken(req);
  const session = validateEmployeeSession(token);
  if (session) {
    const row = await findEmployeeById(session.employeeId);
    if (row) {
      const employee = rowToEmployee(row);
      logAuditFromContext(
        {
          ...getAuditContext(req, "employee"),
          actorId: String(employee.id),
          actorName: employee.name,
        },
        {
          action: "auth.employee.logout",
          resourceType: "auth",
          resourceId: String(employee.id),
          message: `Personel çıkışı: ${employee.name}`,
          metadata: { username: employee.username },
        }
      );
    }
  }
  revokeEmployeeSession(token);
  res.json({ success: true });
});

export default router;
