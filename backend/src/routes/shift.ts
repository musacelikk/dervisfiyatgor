import { Router } from "express";
import {
  authenticateEmployee,
  findEmployeeById,
  findEmployeeByShiftCode,
} from "../services/employees";
import { rowToEmployee } from "../types/employee";
import { getAuditContext } from "../lib/auditContext";
import { logAuditFromContext } from "../services/audit";
import { getShopLocation, getShopRadiusMeters } from "../lib/sunset";
import {
  OutOfRangeError,
  checkIn,
  createShiftToken,
  getTodayEntry,
  revokeShiftToken,
  validateShiftToken,
} from "../services/shifts";

const router = Router();

function bearerToken(req: { headers: Record<string, unknown> }): string {
  const header = req.headers["authorization"];
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    return header.slice(7).trim();
  }
  return "";
}

/** giris.dervisplastik.com — herkese açık ama yalnızca 4 haneli mesai ID'si
 *  veya kullanıcı adı/şifre bilen personel için (fiziksel dükkanda okutuluyor). */
router.post("/login", async (req, res) => {
  const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
  const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  const ctx = getAuditContext(req, "employee");

  let employeeRow = null as Awaited<ReturnType<typeof findEmployeeByShiftCode>> | null;
  if (code) {
    if (!/^\d{4}$/.test(code)) {
      res.status(400).json({ error: "Mesai ID'si 4 haneli olmalı." });
      return;
    }
    const row = await findEmployeeByShiftCode(code);
    if (row && (row.active === 1 || row.active === true)) {
      employeeRow = row;
    }
  } else if (username && password) {
    const employee = await authenticateEmployee(username, password);
    if (employee) {
      employeeRow = await findEmployeeById(employee.id);
    }
  } else {
    res.status(400).json({ error: "Mesai ID'si veya kullanıcı adı/şifre gerekli." });
    return;
  }

  if (!employeeRow) {
    logAuditFromContext(ctx, {
      action: "auth.shift.login_failed",
      resourceType: "auth",
      resourceId: code || username,
      message: `Başarısız mesai girişi: ${code || username}`,
      success: false,
    });
    res.status(401).json({ error: "Bilgiler hatalı veya hesap pasif." });
    return;
  }

  const employee = rowToEmployee(employeeRow);
  const token = await createShiftToken(employee.id);

  logAuditFromContext(
    { ...ctx, actorId: String(employee.id), actorName: employee.name },
    {
      action: "auth.shift.login",
      resourceType: "auth",
      resourceId: String(employee.id),
      message: `Mesai girişi: ${employee.name}`,
    }
  );

  res.json({
    token,
    employee: { id: employee.id, name: employee.name, honorific: employee.honorific },
  });
});

router.get("/me", async (req, res) => {
  const token = bearerToken(req);
  const session = await validateShiftToken(token);
  if (!session) {
    res.status(401).json({ error: "Geçersiz veya süresi dolmuş oturum." });
    return;
  }

  const row = await findEmployeeById(session.employeeId);
  if (!row || (row.active !== 1 && row.active !== true)) {
    await revokeShiftToken(token);
    res.status(401).json({ error: "Hesap pasif." });
    return;
  }

  const employee = rowToEmployee(row);
  const todayEntry = await getTodayEntry(employee.id);
  res.json({
    employee: { id: employee.id, name: employee.name, honorific: employee.honorific },
    todayEntry,
  });
});

router.post("/checkin", async (req, res) => {
  const token = bearerToken(req);
  const session = await validateShiftToken(token);
  if (!session) {
    res.status(401).json({ error: "Geçersiz veya süresi dolmuş oturum." });
    return;
  }

  const lat = Number(req.body?.lat);
  const lng = Number(req.body?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    res.status(400).json({ error: "Konum bilgisi gerekli." });
    return;
  }

  const row = await findEmployeeById(session.employeeId);
  if (!row || (row.active !== 1 && row.active !== true)) {
    await revokeShiftToken(token);
    res.status(401).json({ error: "Hesap pasif." });
    return;
  }
  const employee = rowToEmployee(row);
  const ctx = {
    ...getAuditContext(req, "employee"),
    actorId: String(employee.id),
    actorName: employee.name,
  };

  try {
    const { entry, alreadyStarted, distanceM } = await checkIn(employee.id, lat, lng);
    if (!alreadyStarted) {
      logAuditFromContext(ctx, {
        action: "shift.checkin",
        resourceType: "shift",
        resourceId: String(entry.id),
        message: `Mesai başladı: ${employee.name}`,
        metadata: { distanceM: Math.round(distanceM) },
      });
    }
    res.json({ entry, alreadyStarted, distanceM: Math.round(distanceM) });
  } catch (err) {
    if (err instanceof OutOfRangeError) {
      logAuditFromContext(ctx, {
        action: "shift.checkin_out_of_range",
        resourceType: "shift",
        message: `Mesai reddedildi (uzak): ${employee.name}`,
        metadata: { distanceM: Math.round(err.distanceM) },
        success: false,
      });
      res.status(403).json({ error: err.message, distanceM: Math.round(err.distanceM) });
      return;
    }
    res.status(400).json({
      error: err instanceof Error ? err.message : "Mesai başlatılamadı.",
    });
  }
});

router.post("/logout", async (req, res) => {
  const token = bearerToken(req);
  await revokeShiftToken(token);
  res.json({ success: true });
});

/** Dükkan konumu/yarıçapı — cihazda mesafe önizlemesi için (opsiyonel kullanım). */
router.get("/shop-location", (_req, res) => {
  res.json({ ...getShopLocation(), radiusM: getShopRadiusMeters() });
});

export default router;
