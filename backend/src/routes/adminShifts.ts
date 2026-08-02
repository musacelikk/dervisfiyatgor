import { Router } from "express";
import { requireAdminOrEmployee } from "../middleware/adminAuth";
import { listShiftEntries } from "../services/shifts";
import { getShopLocation, getShopRadiusMeters } from "../lib/sunset";

const router = Router();

router.use(requireAdminOrEmployee);

router.get("/", async (req, res) => {
  const employeeId = req.query.employeeId ? Number(req.query.employeeId) : undefined;
  const from = typeof req.query.from === "string" ? req.query.from : undefined;
  const to = typeof req.query.to === "string" ? req.query.to : undefined;

  try {
    const entries = await listShiftEntries({
      employeeId: Number.isFinite(employeeId) ? employeeId : undefined,
      from,
      to,
    });
    res.json({
      entries,
      shopLocation: getShopLocation(),
      radiusM: getShopRadiusMeters(),
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Mesai kayıtları yüklenemedi.",
    });
  }
});

export default router;
