import { Router } from "express";
import { getProductCount } from "../services/db";
import { getEmployeeCount } from "../services/employees";

const router = Router();

router.get("/", async (_req, res) => {
  res.json({
    status: "ok",
    productCount: await getProductCount(),
    employeeCount: await getEmployeeCount(),
    timestamp: new Date().toISOString(),
  });
});

export default router;
