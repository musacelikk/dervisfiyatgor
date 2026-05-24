import { Router } from "express";
import { requireAdmin, requireAdminOrEmployee } from "../middleware/adminAuth";
import {
  getStockCountState,
  startStockCount,
  stopStockCount,
} from "../services/stockCount";

const router = Router();

router.get("/", requireAdminOrEmployee, async (_req, res) => {
  const state = await getStockCountState();
  res.json(state);
});

router.post("/start", requireAdmin, async (_req, res) => {
  const state = await startStockCount();
  res.json(state);
});

router.post("/stop", requireAdmin, async (_req, res) => {
  const state = await stopStockCount();
  res.json(state);
});

export default router;
