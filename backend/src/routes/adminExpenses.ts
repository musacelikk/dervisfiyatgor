import { Router } from "express";
import { requireAdmin } from "../middleware/adminAuth";
import {
  createExpense,
  createExpenseCategory,
  createExpensePerson,
  deleteExpense,
  deleteExpenseCategory,
  deleteExpensePerson,
  listExpenseCategories,
  listExpensePeople,
  listExpenses,
  updateExpense,
  updateExpenseCategory,
  updateExpensePerson,
} from "../services/expenses";

const router = Router();

router.use(requireAdmin);

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

// ——— Kategoriler ———

router.get("/categories", async (_req, res) => {
  try {
    res.json({ categories: await listExpenseCategories() });
  } catch (err) {
    res.status(500).json({ error: errorMessage(err, "Kategoriler yüklenemedi.") });
  }
});

router.post("/categories", async (req, res) => {
  try {
    const category = await createExpenseCategory(req.body ?? {});
    res.status(201).json({ category });
  } catch (err) {
    res.status(400).json({ error: errorMessage(err, "Kategori oluşturulamadı.") });
  }
});

router.patch("/categories/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Geçersiz id." });
    return;
  }
  try {
    const category = await updateExpenseCategory(id, req.body ?? {});
    res.json({ category });
  } catch (err) {
    const message = errorMessage(err, "Kategori güncellenemedi.");
    res.status(message.includes("bulunamadı") ? 404 : 400).json({ error: message });
  }
});

router.delete("/categories/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Geçersiz id." });
    return;
  }
  try {
    await deleteExpenseCategory(id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: errorMessage(err, "Kategori silinemedi.") });
  }
});

// ——— Kişiler ———

router.get("/people", async (_req, res) => {
  try {
    res.json({ people: await listExpensePeople() });
  } catch (err) {
    res.status(500).json({ error: errorMessage(err, "Kişiler yüklenemedi.") });
  }
});

router.post("/people", async (req, res) => {
  try {
    const person = await createExpensePerson(req.body ?? {});
    res.status(201).json({ person });
  } catch (err) {
    res.status(400).json({ error: errorMessage(err, "Kişi oluşturulamadı.") });
  }
});

router.patch("/people/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Geçersiz id." });
    return;
  }
  try {
    const person = await updateExpensePerson(id, req.body ?? {});
    res.json({ person });
  } catch (err) {
    const message = errorMessage(err, "Kişi güncellenemedi.");
    res.status(message.includes("bulunamadı") ? 404 : 400).json({ error: message });
  }
});

router.delete("/people/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Geçersiz id." });
    return;
  }
  try {
    await deleteExpensePerson(id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: errorMessage(err, "Kişi silinemedi.") });
  }
});

// ——— Giderler ———

router.get("/", async (_req, res) => {
  try {
    res.json({ expenses: await listExpenses() });
  } catch (err) {
    res.status(500).json({ error: errorMessage(err, "Giderler yüklenemedi.") });
  }
});

router.post("/", async (req, res) => {
  try {
    const expense = await createExpense(req.body ?? {});
    res.status(201).json({ expense });
  } catch (err) {
    res.status(400).json({ error: errorMessage(err, "Gider oluşturulamadı.") });
  }
});

router.patch("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Geçersiz id." });
    return;
  }
  try {
    const expense = await updateExpense(id, req.body ?? {});
    res.json({ expense });
  } catch (err) {
    const message = errorMessage(err, "Gider güncellenemedi.");
    res.status(message.includes("bulunamadı") ? 404 : 400).json({ error: message });
  }
});

router.delete("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Geçersiz id." });
    return;
  }
  try {
    await deleteExpense(id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: errorMessage(err, "Gider silinemedi.") });
  }
});

export default router;
