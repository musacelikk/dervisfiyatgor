import { Router } from "express";
import { listProductsPaged, searchProducts, type SearchBy } from "../services/db";
import { getAuditContext } from "../lib/auditContext";
import { logAuditFromContext } from "../services/audit";
import { listImagesForStockCodes } from "../services/productImages";
import type { ProductRow } from "../types/product";

const router = Router();

function rowToJson(row: ProductRow) {
  return {
    stockCode: row.stock_code,
    name: row.name,
    unit: row.unit,
    barcode: row.barcode,
    salePrice1: row.sale_price_1,
    salePrice2: row.sale_price_2,
    purchasePrice1: row.purchase_price_1,
    purchasePrice2: row.purchase_price_2,
    remainingQty: row.remaining_qty,
    description1: row.description_1,
    description2: row.description_2,
    group: row.group_name,
  };
}

const VALID_BY = new Set<SearchBy>(["barcode", "stockCode", "name", "group"]);

function parseLimit(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 24;
  return Math.min(100, Math.floor(n));
}

/** Herkese açık katalogda yalnızca müşteriye gösterilecek alanlar döner
 *  (alış fiyatı, stok miktarı, açıklamalar dışarı sızmasın). */
function rowToCatalogJson(row: ProductRow) {
  return {
    stockCode: row.stock_code,
    name: row.name,
    unit: row.unit,
    group: row.group_name,
    salePrice1: row.sale_price_1,
    salePrice2: row.sale_price_2,
  };
}

/** Satış kataloğu — tüm ürünler + resimler (herkese açık). */
router.get("/catalog", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = parseLimit(req.query.limit);

  try {
    const { rows, total } = await listProductsPaged({
      q: q || undefined,
      page,
      limit,
    });
    const imageMap = await listImagesForStockCodes(rows.map((r) => r.stock_code));
    const products = rows.map((row) => {
      const images = imageMap.get(row.stock_code) ?? [];
      return {
        ...rowToCatalogJson(row),
        images: images.map((img) => ({
          id: img.id,
          url: img.url,
          sortOrder: img.sortOrder,
        })),
        imageUrl: images[0]?.url ?? null,
      };
    });

    res.json({
      products,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      query: q,
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Katalog yüklenemedi.",
    });
  }
});

router.get("/search", async (req, res) => {
  const by = String(req.query.by ?? "").trim() as SearchBy;
  const q = String(req.query.q ?? "").trim();

  if (!VALID_BY.has(by)) {
    res.status(400).json({
      error: "by parametresi gerekli: barcode, stockCode, name veya group",
    });
    return;
  }

  if (!q) {
    res.status(400).json({ error: "q parametresi gerekli." });
    return;
  }

  if ((by === "name" || by === "group") && q.length < 2) {
    res.status(400).json({ error: "Arama en az 2 karakter olmalı." });
    return;
  }

  const rows = await searchProducts(by, q);
  const imageMap = await listImagesForStockCodes(rows.map((r) => r.stock_code));
  const products = rows.map((row) => {
    const images = imageMap.get(row.stock_code) ?? [];
    return {
      ...rowToJson(row),
      images: images.map((img) => ({
        id: img.id,
        url: img.url,
        sortOrder: img.sortOrder,
      })),
      imageUrl: images[0]?.url ?? null,
    };
  });

  const ctx = getAuditContext(req, "store");
  const top = rows[0];
  logAuditFromContext(ctx, {
    action: "product.search",
    resourceType: "product",
    resourceId: top?.stock_code ?? q,
    message:
      products.length > 0
        ? `Ürün sorgusu: ${q} (${products.length} sonuç)`
        : `Ürün bulunamadı: ${q}`,
    metadata: {
      by,
      query: q,
      resultCount: products.length,
      stockCode: top?.stock_code ?? null,
      productName: top?.name ?? null,
    },
    success: products.length > 0,
  });

  if (products.length === 0) {
    res.status(404).json({
      error: "Ürün bulunamadı.",
      by,
      query: q,
      products: [],
      count: 0,
    });
    return;
  }

  res.json({ by, query: q, products, count: products.length });
});

export default router;
