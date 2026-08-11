import { Router } from "express";
import { requireAdminOrEmployee } from "../middleware/adminAuth";
import { getAuditContext } from "../lib/auditContext";
import { logAuditFromContext } from "../services/audit";
import {
  deleteOrder,
  deleteOrders,
  getOrderById,
  listOrders,
  updateOrderStatus,
  updateOrdersStatus,
} from "../services/orders";
import type { OrderStatus } from "../types/order";

const router = Router();

/** Tek istekte işlenebilecek en fazla kayıt — aralık patlamasını önler. */
const MAX_BULK_IDS = 500;

const ORDER_STATUSES = ["pending", "preparing", "completed", "cancelled"];

/** Gövdeden benzersiz, pozitif sipariş id listesi çıkarır. */
function parseBulkIds(value: unknown): number[] | { error: string } {
  if (!Array.isArray(value)) return { error: "ids bir dizi olmalı." };
  if (value.length === 0) return { error: "En az bir sipariş seçin." };
  if (value.length > MAX_BULK_IDS) {
    return { error: `Tek seferde en fazla ${MAX_BULK_IDS} sipariş işlenebilir.` };
  }
  const ids: number[] = [];
  for (const raw of value) {
    const id = Number(raw);
    if (!Number.isInteger(id) || id < 1) return { error: "Geçersiz sipariş id." };
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}

router.use(requireAdminOrEmployee);

router.get("/", async (req, res) => {
  try {
    const channel =
      req.query.channel === "sales" || req.query.channel === "store"
        ? req.query.channel
        : undefined;
    const orders = await listOrders(channel);
    res.json({ orders, total: orders.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Siparişler yüklenemedi.";
    res.status(500).json({ error: message });
  }
});

/** Toplu silme — POST olduğu için "/:id" rotalarıyla çakışmaz. */
router.post("/bulk-delete", async (req, res) => {
  const parsed = parseBulkIds(req.body?.ids);
  if (!Array.isArray(parsed)) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  try {
    // Audit mesajı için silinmeden önce sipariş kodları toplanır
    const existing = await Promise.all(parsed.map((id) => getOrderById(id)));
    const codes = existing
      .filter((o): o is NonNullable<typeof o> => Boolean(o))
      .map((o) => o.orderCode || `#${o.id}`);

    const deleted = await deleteOrders(parsed);
    logAuditFromContext(getAuditContext(req), {
      action: "order.bulk_delete",
      resourceType: "order",
      resourceId: parsed.join(","),
      message: `${deleted} sipariş toplu silindi${codes.length ? `: ${codes.slice(0, 10).join(", ")}${codes.length > 10 ? "…" : ""}` : ""}`,
      metadata: { ids: parsed, deleted, orderCodes: codes },
    });
    res.json({ deleted });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : "Siparişler silinemedi.",
    });
  }
});

/** Toplu durum güncelleme. */
router.post("/bulk-status", async (req, res) => {
  const parsed = parseBulkIds(req.body?.ids);
  if (!Array.isArray(parsed)) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  const status = req.body?.status;
  if (typeof status !== "string" || !ORDER_STATUSES.includes(status)) {
    res.status(400).json({
      error: "status: pending, preparing, completed veya cancelled olmalı.",
    });
    return;
  }

  try {
    const orders = await updateOrdersStatus(parsed, status as OrderStatus);
    logAuditFromContext(getAuditContext(req), {
      action: "order.bulk_status_update",
      resourceType: "order",
      resourceId: parsed.join(","),
      message: `${orders.length} siparişin durumu toplu güncellendi: ${status}`,
      metadata: { ids: parsed, status, updated: orders.length },
    });
    res.json({ orders });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : "Durumlar güncellenemedi.",
    });
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
  if (
    typeof status !== "string" ||
    !["pending", "preparing", "completed", "cancelled"].includes(status)
  ) {
    res.status(400).json({
      error: "status: pending, preparing, completed veya cancelled olmalı.",
    });
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

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Geçersiz sipariş id." });
    return;
  }
  try {
    const existing = await getOrderById(id);
    if (!existing) {
      res.status(404).json({ error: "Sipariş bulunamadı." });
      return;
    }
    await deleteOrder(id);
    logAuditFromContext(getAuditContext(req), {
      action: "order.delete",
      resourceType: "order",
      resourceId: String(id),
      message: `Sipariş silindi: ${existing.orderCode || `#${id}`}`,
      metadata: {
        orderCode: existing.orderCode,
        customer: `${existing.firstName} ${existing.lastName}`.trim(),
      },
    });
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Silinemedi.";
    const code = message.includes("bulunamadı") ? 404 : 400;
    res.status(code).json({ error: message });
  }
});

export default router;
