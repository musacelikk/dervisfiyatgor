import { Router } from "express";
import { requireAdminOrEmployee } from "../middleware/adminAuth";
import { getAuditContext } from "../lib/auditContext";
import { logAuditFromContext } from "../services/audit";
import {
  createProduct,
  deleteProduct,
  getProductByStockCode,
  listProductsPaged,
  updateProduct,
} from "../services/db";
import { rowToProduct } from "../lib/product-map";
import type { Product } from "../types/product";

const router = Router();

router.use(requireAdminOrEmployee);

function parseBody(body: unknown): Partial<Product> {
  if (!body || typeof body !== "object") return {};
  const b = body as Record<string, unknown>;
  return {
    stockCode: typeof b.stockCode === "string" ? b.stockCode : undefined,
    name: typeof b.name === "string" ? b.name : undefined,
    unit: b.unit === null || typeof b.unit === "string" ? (b.unit as string | null) : undefined,
    barcode:
      b.barcode === null || typeof b.barcode === "string"
        ? (b.barcode as string | null)
        : undefined,
    salePrice1: typeof b.salePrice1 === "number" ? b.salePrice1 : b.salePrice1 === null ? null : undefined,
    salePrice2: typeof b.salePrice2 === "number" ? b.salePrice2 : b.salePrice2 === null ? null : undefined,
    purchasePrice1:
      typeof b.purchasePrice1 === "number"
        ? b.purchasePrice1
        : b.purchasePrice1 === null
          ? null
          : undefined,
    purchasePrice2:
      typeof b.purchasePrice2 === "number"
        ? b.purchasePrice2
        : b.purchasePrice2 === null
          ? null
          : undefined,
    remainingQty:
      typeof b.remainingQty === "number"
        ? b.remainingQty
        : b.remainingQty === null
          ? null
          : undefined,
    description1:
      b.description1 === null || typeof b.description1 === "string"
        ? (b.description1 as string | null)
        : undefined,
    description2:
      b.description2 === null || typeof b.description2 === "string"
        ? (b.description2 as string | null)
        : undefined,
    group:
      b.group === null || typeof b.group === "string"
        ? (b.group as string | null)
        : undefined,
  };
}

function parseLimit(raw: unknown): number | "all" {
  if (raw === "all" || raw === "0") return "all";
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 25;
  if (n >= 100_000) return "all";
  return Math.min(100_000, Math.floor(n));
}

router.get("/", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = parseLimit(req.query.limit);

  const { rows, total } = await listProductsPaged({ q: q || undefined, page, limit });
  const effectiveLimit = limit === "all" ? total : limit;
  const totalPages =
    limit === "all" ? 1 : Math.max(1, Math.ceil(total / effectiveLimit));

  res.json({
    products: rows.map(rowToProduct),
    total,
    page: limit === "all" ? 1 : page,
    limit: limit === "all" ? total : limit,
    totalPages,
    query: q,
    showAll: limit === "all",
  });
});

router.post("/", async (req, res) => {
  try {
    const body = parseBody(req.body);
    if (!body.stockCode || !body.name) {
      res.status(400).json({ error: "stockCode ve name gerekli." });
      return;
    }

    const product: Product = {
      stockCode: body.stockCode,
      name: body.name,
      unit: body.unit ?? null,
      barcode: body.barcode ?? null,
      salePrice1: body.salePrice1 ?? null,
      salePrice2: body.salePrice2 ?? null,
      purchasePrice1: body.purchasePrice1 ?? null,
      purchasePrice2: body.purchasePrice2 ?? null,
      remainingQty: body.remainingQty ?? null,
      description1: body.description1 ?? null,
      description2: body.description2 ?? null,
      group: body.group ?? null,
    };

    await createProduct(product);
    const saved = await getProductByStockCode(product.stockCode);
    logAuditFromContext(getAuditContext(req), {
      action: "product.create",
      resourceType: "product",
      resourceId: product.stockCode,
      message: `Ürün eklendi: ${product.name}`,
      metadata: { stockCode: product.stockCode, name: product.name },
    });
    res.status(201).json({ product: saved ? rowToProduct(saved) : product });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Oluşturulamadı.";
    res.status(400).json({ error: message });
  }
});

router.get("/:stockCode", async (req, res) => {
  const row = await getProductByStockCode(decodeURIComponent(req.params.stockCode));
  if (!row) {
    res.status(404).json({ error: "Ürün bulunamadı." });
    return;
  }
  res.json({ product: rowToProduct(row) });
});

router.patch("/:stockCode", async (req, res) => {
  try {
    const code = decodeURIComponent(req.params.stockCode);
    const updates = parseBody(req.body);
    delete updates.stockCode;
    const product = await updateProduct(code, updates);
    logAuditFromContext(getAuditContext(req), {
      action: "product.update",
      resourceType: "product",
      resourceId: code,
      message: `Ürün güncellendi: ${product.name}`,
      metadata: { stockCode: code, fields: Object.keys(updates) },
    });
    res.json({ product });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Güncellenemedi.";
    const status = message.includes("bulunamadı") ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

router.delete("/:stockCode", async (req, res) => {
  try {
    const code = decodeURIComponent(req.params.stockCode);
    const existing = await getProductByStockCode(code);
    await deleteProduct(code);
    logAuditFromContext(getAuditContext(req), {
      action: "product.delete",
      resourceType: "product",
      resourceId: code,
      message: existing ? `Ürün silindi: ${existing.name}` : `Ürün silindi: ${code}`,
      metadata: { stockCode: code, name: existing?.name ?? null },
    });
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Silinemedi.";
    res.status(404).json({ error: message });
  }
});

export default router;
