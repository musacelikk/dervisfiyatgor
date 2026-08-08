import { Router } from "express";
import { requireAdmin } from "../middleware/adminAuth";
import { getAuditContext } from "../lib/auditContext";
import { logAuditFromContext } from "../services/audit";
import {
  createEmployee,
  deleteEmployee,
  findEmployeeById,
  listEmployees,
  normalizePermissionsInput,
  updateEmployee,
} from "../services/employees";
import { revokeEmployeeSessionsFor } from "../services/sessions";
import { revokeShiftTokensForEmployee } from "../services/shifts";
import { normalizeHonorific, randomShiftCode } from "../lib/shiftCode";
import { isEmployeeShift, type EmployeeShift } from "../lib/attendance";

function parseShiftCode(body: Record<string, unknown>): string | null | undefined {
  if (!("shiftCode" in body)) return undefined;
  const v = body.shiftCode;
  if (v === null || v === "") return null;
  return typeof v === "string" ? v.trim() : undefined;
}

/** "1" | "2" (sayı da kabul edilir); gövdede yoksa undefined → alan değişmez. */
function parseShift(body: Record<string, unknown>): EmployeeShift | undefined {
  if (!("shift" in body)) return undefined;
  const v = typeof body.shift === "number" ? String(body.shift) : body.shift;
  return isEmployeeShift(v) ? v : undefined;
}

const router = Router();

router.use(requireAdmin);

router.get("/", async (_req, res) => {
  res.json({ employees: await listEmployees() });
});

/** Admin formunda "otomatik oluştur" için boşta olan 4 haneli bir mesai ID'si üretir. */
router.get("/shift-code/new", async (_req, res) => {
  const existing = new Set(
    (await listEmployees()).map((e) => e.shiftCode).filter((c): c is string => Boolean(c))
  );
  let code = randomShiftCode();
  let attempts = 0;
  while (existing.has(code) && attempts < 50) {
    code = randomShiftCode();
    attempts++;
  }
  res.json({ shiftCode: code });
});

router.post("/", async (req, res) => {
  try {
    const { name, username, password } = req.body ?? {};
    if (typeof name !== "string" || typeof username !== "string" || typeof password !== "string") {
      res.status(400).json({ error: "name, username ve password gerekli." });
      return;
    }
    const permissions = normalizePermissionsInput(req.body?.permissions);
    const shiftCode = parseShiftCode(req.body ?? {});
    const honorific = normalizeHonorific(req.body?.honorific);
    const employee = await createEmployee({
      name,
      username,
      password,
      permissions,
      shiftCode,
      honorific,
      shift: parseShift(req.body ?? {}),
    });
    logAuditFromContext(getAuditContext(req), {
      action: "employee.create",
      resourceType: "employee",
      resourceId: String(employee.id),
      message: `Personel eklendi: ${employee.name}`,
      metadata: { username: employee.username },
    });
    res.status(201).json({ employee });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kayıt oluşturulamadı.";
    res.status(400).json({ error: message });
  }
});

router.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Geçersiz id." });
    return;
  }

  try {
    const body = req.body ?? {};
    const before = await findEmployeeById(id);
    const permissions = normalizePermissionsInput(body.permissions);
    const shiftCode = parseShiftCode(body);
    const honorific = "honorific" in body ? normalizeHonorific(body.honorific) : undefined;
    const employee = await updateEmployee(id, {
      name: typeof body.name === "string" ? body.name : undefined,
      username: typeof body.username === "string" ? body.username : undefined,
      password: typeof body.password === "string" ? body.password : undefined,
      active: typeof body.active === "boolean" ? body.active : undefined,
      permissions,
      shiftCode,
      honorific,
      shift: parseShift(body),
    });
    const shiftCodeChanged =
      shiftCode !== undefined && shiftCode !== (before?.shift_code ?? null);
    if (employee.active === false) {
      revokeEmployeeSessionsFor(id);
    }
    if (employee.active === false || shiftCodeChanged || body.password !== undefined) {
      await revokeShiftTokensForEmployee(id);
    }
    logAuditFromContext(getAuditContext(req), {
      action: "employee.update",
      resourceType: "employee",
      resourceId: String(id),
      message: `Personel güncellendi: ${employee.name}`,
      metadata: {
        active: employee.active,
        fields: Object.keys(body).filter((k) => k !== "password"),
      },
    });
    res.json({ employee });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Güncellenemedi.";
    const status = message.includes("bulunamadı") ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Geçersiz id." });
    return;
  }

  try {
    await deleteEmployee(id);
    revokeEmployeeSessionsFor(id);
    await revokeShiftTokensForEmployee(id);
    logAuditFromContext(getAuditContext(req), {
      action: "employee.delete",
      resourceType: "employee",
      resourceId: String(id),
      message: `Personel silindi (id: ${id})`,
    });
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Silinemedi.";
    res.status(404).json({ error: message });
  }
});

export default router;
