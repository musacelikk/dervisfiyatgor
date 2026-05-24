import { Router } from "express";
import { requireAdmin } from "../middleware/adminAuth";
import { getAuditContext } from "../lib/auditContext";
import { logAuditFromContext } from "../services/audit";
import {
  createEmployee,
  deleteEmployee,
  listEmployees,
  normalizePermissionsInput,
  updateEmployee,
} from "../services/employees";

const router = Router();

router.use(requireAdmin);

router.get("/", async (_req, res) => {
  res.json({ employees: await listEmployees() });
});

router.post("/", async (req, res) => {
  try {
    const { name, username, password } = req.body ?? {};
    if (typeof name !== "string" || typeof username !== "string" || typeof password !== "string") {
      res.status(400).json({ error: "name, username ve password gerekli." });
      return;
    }
    const permissions = normalizePermissionsInput(req.body?.permissions);
    const employee = await createEmployee({ name, username, password, permissions });
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
    const permissions = normalizePermissionsInput(body.permissions);
    const employee = await updateEmployee(id, {
      name: typeof body.name === "string" ? body.name : undefined,
      username: typeof body.username === "string" ? body.username : undefined,
      password: typeof body.password === "string" ? body.password : undefined,
      active: typeof body.active === "boolean" ? body.active : undefined,
      permissions,
    });
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
