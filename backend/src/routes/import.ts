import { Router, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import { requireAdminOrEmployee } from "../middleware/adminAuth";
import { getAuditContext } from "../lib/auditContext";
import { parseExcelBuffer, getExcelHeaders } from "../services/excel";
import { upsertProducts, clearProducts, getProductCount } from "../services/db";
import { logAuditFromContext } from "../services/audit";
import {
  listAllProductImages,
  restoreProductImages,
} from "../services/productImages";
import type { ProductImage } from "../types/productImage";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype.includes("spreadsheet") ||
      file.mimetype.includes("excel") ||
      !!file.originalname.match(/\.(xlsx|xls|csv)$/i);
    if (ok) cb(null, true);
    else cb(new Error("Sadece .xlsx, .xls veya .csv dosyaları kabul edilir."));
  },
});

const router = Router();

router.post("/", requireAdminOrEmployee, upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "file alanı gerekli (multipart/form-data)." });
    return;
  }

  try {
    const replace = req.query.replace === "true";
    const { products, skipped, totalRows } = parseExcelBuffer(req.file.buffer);
    const headers = getExcelHeaders(req.file.buffer);

    if (products.length === 0) {
      res.status(400).json({
        error: "Geçerli ürün satırı bulunamadı. Kolon adlarını kontrol edin.",
        headers,
        totalRows,
        skipped,
      });
      return;
    }

    let imageBackup: ProductImage[] = [];
    if (replace) {
      imageBackup = await listAllProductImages();
      await clearProducts();
      logAuditFromContext(getAuditContext(req), {
        action: "catalog.clear",
        resourceType: "catalog",
        message: "Mevcut ürün kataloğu temizlendi (Excel yeniden yükleme).",
        metadata: { replace: true },
      });
    }

    const imported = await upsertProducts(products);

    // Excel işlemleri resimlere dokunmaz: replace sonrası kayıtlar geri bağlanır,
    // depodaki dosyalar asla silinmez. (Kataloğa dönmeyen stok kodlarının
    // kayıtları FK gereği bağlanamaz; ürün tekrar eklenirse resmi yeniden yüklenir.)
    if (replace && imageBackup.length > 0) {
      const newCodes = new Set(products.map((p) => p.stockCode.trim()));
      const keep = imageBackup.filter((img) => newCodes.has(img.stockCode));
      await restoreProductImages(keep);
    }

    logAuditFromContext(getAuditContext(req), {
      action: "catalog.import",
      resourceType: "catalog",
      message: `${imported} ürün Excel ile içe aktarıldı.`,
      metadata: {
        imported,
        skipped,
        totalRows,
        replace,
        fileName: req.file.originalname,
      },
    });

    res.json({
      success: true,
      imported,
      skipped,
      totalRows,
      productCount: await getProductCount(),
      headers,
      replace,
    });
  } catch (err) {
    let message = err instanceof Error ? err.message : "Import hatası";
    if (
      message.includes("UNIQUE constraint failed: products.barcode") ||
      message.includes("duplicate key value violates unique constraint") ||
      message.includes("products_barcode_key")
    ) {
      message =
        "Aynı barkod birden fazla üründe kullanılıyor. Excel dosyasında tekrarlayan barkodları kontrol edin veya “Mevcut ürünleri sil” seçeneğiyle tam yeniden yükleyin.";
    }
    res.status(500).json({ error: message });
  }
});

router.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    res.status(400).json({ error: err.message });
    return;
  }
  if (err instanceof Error) {
    res.status(400).json({ error: err.message });
    return;
  }
  res.status(500).json({ error: "Bilinmeyen hata" });
});

export default router;
