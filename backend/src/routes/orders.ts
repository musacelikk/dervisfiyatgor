import { Router } from "express";
import { createOrder } from "../services/orders";
import { getAuditContext } from "../lib/auditContext";
import { logAuditFromContext } from "../services/audit";
import type { CreateOrderInput } from "../types/order";

const router = Router();

function parseBody(body: unknown): CreateOrderInput {
  if (!body || typeof body !== "object") {
    throw new Error("Geçersiz istek gövdesi.");
  }
  const b = body as Record<string, unknown>;
  const items = Array.isArray(b.items)
    ? b.items.map((item) => {
        if (!item || typeof item !== "object") throw new Error("Geçersiz sepet satırı.");
        const row = item as Record<string, unknown>;
        return {
          stockCode: String(row.stockCode ?? ""),
          quantity: Number(row.quantity ?? 1),
        };
      })
    : [];
  return {
    firstName: typeof b.firstName === "string" ? b.firstName : "",
    lastName: typeof b.lastName === "string" ? b.lastName : "",
    phone: typeof b.phone === "string" ? b.phone : undefined,
    channel: b.channel === "sales" ? "sales" : "store",
    createdBy: typeof b.createdBy === "string" ? b.createdBy : undefined,
    items,
  };
}

router.post("/", async (req, res) => {
  try {
    const input = parseBody(req.body);
    const order = await createOrder(input);
    const customer =
      `${order.firstName} ${order.lastName}`.trim() || "isimsiz müşteri";
    logAuditFromContext(getAuditContext(req, "store"), {
      action: order.channel === "sales" ? "order.create_sales" : "order.create",
      resourceType: "order",
      resourceId: String(order.id),
      message:
        order.channel === "sales"
          ? `Toplu sipariş (${order.orderCode}): ${customer}${order.createdBy ? ` — oluşturan: ${order.createdBy}` : ""}`
          : `Yeni sipariş: ${customer}`,
      metadata: {
        itemCount: order.items.length,
        phone: order.phone ?? null,
        channel: order.channel,
        createdBy: order.createdBy,
        orderCode: order.orderCode,
      },
    });
    res.status(201).json({ order });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sipariş oluşturulamadı.";
    res.status(400).json({ error: message });
  }
});

export default router;
