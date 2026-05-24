import { Router } from "express";
import { requireAdmin } from "../middleware/adminAuth";
import { getAuditContext } from "../lib/auditContext";
import { logAuditFromContext } from "../services/audit";
import { getOrderById, listOrders, updateOrderStatus } from "../services/orders";
import type { OrderStatus } from "../types/order";

const router = Router();

router.use(requireAdmin);

router.get("/", async (_req, res) => {
  try {
    const orders = await listOrders();
    res.json({ orders, total: orders.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Siparişler yüklenemedi.";
    res.status(500).json({ error: message });
  }
});

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Geçersiz sipariş id." });
    return;
  }
  try {
    const order = await getOrderById(id);
    if (!order) {
      res.status(404).json({ error: "Sipariş bulunamadı." });
      return;
    }
    res.json({ order });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sipariş yüklenemedi.";
    res.status(500).json({ error: message });
  }
});

router.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Geçersiz sipariş id." });
    return;
  }
  const status = req.body?.status;
  if (typeof status !== "string" || !["pending", "completed", "cancelled"].includes(status)) {
    res.status(400).json({ error: "status: pending, completed veya cancelled olmalı." });
    return;
  }
  try {
    const order = await updateOrderStatus(id, status as OrderStatus);
    logAuditFromContext(getAuditContext(req), {
      action: "order.status_update",
      resourceType: "order",
      resourceId: String(id),
      message: `Sipariş #${id} durumu: ${status}`,
      metadata: { status },
    });
    res.json({ order });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Güncellenemedi.";
    const code = message.includes("bulunamadı") ? 404 : 400;
    res.status(code).json({ error: message });
  }
});

export default router;
