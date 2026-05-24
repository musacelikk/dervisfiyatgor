import { Router, type Response } from "express";
import { requireAdmin } from "../middleware/adminAuth";
import { getAuditContext } from "../lib/auditContext";
import { buildExcelBuffer, buildTemplateExcelBuffer } from "../services/excel";
import { logAuditFromContext } from "../services/audit";
import { rowToProduct } from "../lib/product-map";
import { listAllProducts } from "../services/db";

const router = Router();

function sendExcel(res: Response, buffer: Buffer, filename: string): void {
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
  );
  res.send(buffer);
}

router.get("/template", requireAdmin, (req, res) => {
  logAuditFromContext(getAuditContext(req), {
    action: "catalog.export",
    resourceType: "catalog",
    message: "Excel şablonu indirildi.",
    metadata: { type: "template" },
  });
  const buffer = buildTemplateExcelBuffer();
  sendExcel(res, buffer, "urun-sablonu.xlsx");
});

router.get("/products", requireAdmin, async (req, res) => {
  const products = (await listAllProducts()).map(rowToProduct);
  logAuditFromContext(getAuditContext(req), {
    action: "catalog.export",
    resourceType: "catalog",
    message: `Katalog Excel indirildi (${products.length} ürün).`,
    metadata: { type: "catalog", productCount: products.length },
  });
  const buffer = buildExcelBuffer(products);
  const date = new Date().toISOString().slice(0, 10);
  sendExcel(res, buffer, `katalog-${date}.xlsx`);
});

export default router;
