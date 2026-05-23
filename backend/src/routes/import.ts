import { Router, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import { requireAdmin } from "../middleware/adminAuth";
import { parseExcelBuffer, getExcelHeaders } from "../services/excel";
import { upsertProducts, clearProducts, getProductCount } from "../services/db";

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

router.post("/", requireAdmin, upload.single("file"), (req, res) => {
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

    if (replace) {
      clearProducts();
    }

    const imported = upsertProducts(products);

    res.json({
      success: true,
      imported,
      skipped,
      totalRows,
      productCount: getProductCount(),
      headers,
      replace,
    });
  } catch (err) {
    let message = err instanceof Error ? err.message : "Import hatası";
    if (message.includes("UNIQUE constraint failed: products.barcode")) {
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
