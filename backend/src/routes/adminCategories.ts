import { Router } from "express";
import { requireAdminOrEmployee } from "../middleware/adminAuth";
import { getAuditContext } from "../lib/auditContext";
import { logAuditFromContext } from "../services/audit";
import {
  createCategory,
  deleteCategory,
  listCategories,
  renameCategory,
} from "../services/categories";

const router = Router();

router.use(requireAdminOrEmployee);

router.get("/", async (_req, res) => {
  try {
    res.json({ categories: await listCategories() });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Kategoriler yüklenemedi.",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const category = await createCategory(String(req.body?.name ?? ""));
    logAuditFromContext(getAuditContext(req), {
      action: "category.create",
      resourceType: "category",
      resourceId: String(category.id),
      message: `Kategori eklendi: ${category.name}`,
      metadata: { name: category.name },
    });
    res.status(201).json({ category, categories: await listCategories() });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : "Kategori eklenemedi.",
    });
  }
});

router.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: "Geçersiz kategori id." });
    return;
  }
  try {
    const category = await renameCategory(id, String(req.body?.name ?? ""));
    logAuditFromContext(getAuditContext(req), {
      action: "category.update",
      resourceType: "category",
      resourceId: String(id),
      message: `Kategori adı değiştirildi: ${category.name}`,
      metadata: { name: category.name },
    });
    res.json({ category, categories: await listCategories() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Güncellenemedi.";
    res.status(message.includes("bulunamadı") ? 404 : 400).json({ error: message });
  }
});

/** Kategori silinir; ürünler silinmez, yalnızca bu kategoriyle bağlantıları kaldırılır. */
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: "Geçersiz kategori id." });
    return;
  }
  try {
    const removed = await deleteCategory(id);
    logAuditFromContext(getAuditContext(req), {
      action: "category.delete",
      resourceType: "category",
      resourceId: String(id),
      message: `Kategori silindi: ${removed.name} (ürünler korundu)`,
      metadata: { name: removed.name },
    });
    res.json({ success: true, categories: await listCategories() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Silinemedi.";
    res.status(message.includes("bulunamadı") ? 404 : 400).json({ error: message });
  }
});

export default router;
