import { Router } from "express";
import { searchProducts, type SearchBy } from "../services/db";
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

router.get("/search", (req, res) => {
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

  const rows = searchProducts(by, q);
  const products = rows.map(rowToJson);

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

/** Geriye dönük: barkod veya stok kodu */
router.get("/", (req, res) => {
  const q = String(req.query.barcode ?? req.query.q ?? "").trim();

  if (!q) {
    res.status(400).json({ error: "barcode veya q parametresi gerekli." });
    return;
  }

  const barcodeHit = searchProducts("barcode", q);
  const rows = barcodeHit.length > 0 ? barcodeHit : searchProducts("stockCode", q);

  if (rows.length === 0) {
    res.status(404).json({ error: "Ürün bulunamadı.", barcode: q });
    return;
  }

  res.json(rowToJson(rows[0]));
});

export default router;
