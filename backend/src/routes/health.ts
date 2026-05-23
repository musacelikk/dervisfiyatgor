import { Router } from "express";
import { getProductCount } from "../services/db";

const router = Router();

router.get("/", (_req, res) => {
  res.json({
    status: "ok",
    productCount: getProductCount(),
    timestamp: new Date().toISOString(),
  });
});

export default router;
