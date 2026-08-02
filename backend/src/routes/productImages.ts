import { Router } from "express";
import { requireAdminOrEmployee } from "../middleware/adminAuth";
import {
  createPresignedUpload,
  isS3Configured,
  publicUrlForKey,
  sanitizeStockCodeForKey,
} from "../lib/tigris";
import { getProductByStockCode } from "../services/db";
import {
  createProductImage,
  deleteProductImage,
  listImagesForStockCode,
} from "../services/productImages";

const router = Router();

router.use(requireAdminOrEmployee);

router.get("/status", (_req, res) => {
  res.json({ configured: isS3Configured() });
});

router.get("/:stockCode", async (req, res) => {
  const stockCode = req.params.stockCode.trim();
  if (!stockCode) {
    res.status(400).json({ error: "Stok kodu gerekli." });
    return;
  }
  try {
    const images = await listImagesForStockCode(stockCode);
    res.json({ images });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Resimler yüklenemedi.",
    });
  }
});

router.post("/presign", async (req, res) => {
  const stockCode =
    typeof req.body?.stockCode === "string" ? req.body.stockCode.trim() : "";
  const contentType =
    typeof req.body?.contentType === "string" ? req.body.contentType.trim() : "";

  if (!stockCode) {
    res.status(400).json({ error: "Stok kodu zorunlu." });
    return;
  }
  if (!contentType) {
    res.status(400).json({ error: "contentType gerekli." });
    return;
  }

  try {
    const product = await getProductByStockCode(stockCode);
    if (!product) {
      res.status(400).json({
        error: "Önce ürünü kaydedin; resim stok koduna bağlanır.",
      });
      return;
    }

    const signed = await createPresignedUpload({ stockCode, contentType });
    res.json(signed);
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : "Presign oluşturulamadı.",
    });
  }
});

router.post("/confirm", async (req, res) => {
  const stockCode =
    typeof req.body?.stockCode === "string" ? req.body.stockCode.trim() : "";
  const objectKey =
    typeof req.body?.objectKey === "string" ? req.body.objectKey.trim() : "";

  if (!stockCode) {
    res.status(400).json({ error: "Stok kodu zorunlu." });
    return;
  }
  if (!objectKey) {
    res.status(400).json({ error: "objectKey gerekli." });
    return;
  }

  try {
    const product = await getProductByStockCode(stockCode);
    if (!product) {
      res.status(404).json({ error: "Ürün bulunamadı." });
      return;
    }
    if (!objectKey.startsWith(`products/${sanitizeStockCodeForKey(stockCode)}/`)) {
      res.status(400).json({ error: "Geçersiz objectKey." });
      return;
    }

    const url = publicUrlForKey(objectKey);
    const image = await createProductImage({ stockCode, objectKey, url });
    res.status(201).json({ image });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : "Resim kaydedilemedi.",
    });
  }
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id < 1) {
    res.status(400).json({ error: "Geçersiz id." });
    return;
  }
  try {
    await deleteProductImage(id);
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Silinemedi.";
    res.status(message.includes("bulunamadı") ? 404 : 400).json({ error: message });
  }
});

export default router;
