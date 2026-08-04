import { Router } from "express";
import { requireAdmin } from "../middleware/adminAuth";
import { getAuditContext } from "../lib/auditContext";
import { logAuditFromContext } from "../services/audit";
import {
  addClosedDay,
  getCatalogShowPrices,
  getClosedDays,
  removeClosedDay,
  setCatalogShowPrices,
} from "../services/settings";

const router = Router();

router.use(requireAdmin);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

router.get("/", async (_req, res) => {
  try {
    res.json({ settings: { catalogShowPrices: await getCatalogShowPrices() } });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Ayarlar yüklenemedi.",
    });
  }
});

router.patch("/", async (req, res) => {
  try {
    if (typeof req.body?.catalogShowPrices === "boolean") {
      await setCatalogShowPrices(req.body.catalogShowPrices);
      logAuditFromContext(getAuditContext(req), {
        action: "settings.update",
        resourceType: "settings",
        resourceId: "catalog_show_prices",
        message: `Satış kataloğu fiyatları ${req.body.catalogShowPrices ? "açıldı" : "gizlendi"}.`,
        metadata: { catalogShowPrices: req.body.catalogShowPrices },
      });
    }
    res.json({ settings: { catalogShowPrices: await getCatalogShowPrices() } });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : "Ayar kaydedilemedi.",
    });
  }
});

router.get("/closed-days", async (_req, res) => {
  try {
    res.json({ closedDays: await getClosedDays() });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "İzinli günler yüklenemedi.",
    });
  }
});

router.post("/closed-days", async (req, res) => {
  const date = typeof req.body?.date === "string" ? req.body.date.trim() : "";
  const note = typeof req.body?.note === "string" ? req.body.note : null;
  if (!DATE_RE.test(date)) {
    res.status(400).json({ error: "Tarih formatı YYYY-MM-DD olmalı." });
    return;
  }
  try {
    const closedDays = await addClosedDay(date, note);
    logAuditFromContext(getAuditContext(req), {
      action: "settings.update",
      resourceType: "settings",
      resourceId: "shop_closed_days",
      message: `İzinli gün eklendi: ${date}`,
      metadata: { date, note },
    });
    res.status(201).json({ closedDays });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : "İzinli gün eklenemedi.",
    });
  }
});

router.delete("/closed-days/:date", async (req, res) => {
  const date = req.params.date;
  if (!DATE_RE.test(date)) {
    res.status(400).json({ error: "Tarih formatı YYYY-MM-DD olmalı." });
    return;
  }
  try {
    const closedDays = await removeClosedDay(date);
    logAuditFromContext(getAuditContext(req), {
      action: "settings.update",
      resourceType: "settings",
      resourceId: "shop_closed_days",
      message: `İzinli gün kaldırıldı: ${date}`,
      metadata: { date },
    });
    res.json({ closedDays });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : "İzinli gün kaldırılamadı.",
    });
  }
});

export default router;
