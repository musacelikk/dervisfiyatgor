import { Router } from "express";
import { requireAdmin } from "../middleware/adminAuth";
import { getAuditContext } from "../lib/auditContext";
import { logAuditFromContext } from "../services/audit";
import { getCatalogShowPrices, setCatalogShowPrices } from "../services/settings";

const router = Router();

router.use(requireAdmin);

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

export default router;
