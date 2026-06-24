"use client";

import {
  buildOrderExportData,
  orderExportFileBaseName,
  type OrderExportInput,
} from "@/lib/order-export";
import { saveBlobFile } from "@/lib/download-blob";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function downloadOrderExcel(data: OrderExportInput): Promise<void> {
  const XLSX = await import("xlsx");
  const exportData = buildOrderExportData(data);

  const sheetRows: (string | number)[][] = [
    ["#", "Stok Kodu", "Stok Adı", "Birim Fiyat", "Adet", "Toplam"],
  ];

  for (const row of exportData.rows) {
    sheetRows.push([
      row.no,
      row.stockCode,
      row.name,
      row.unitPrice ?? "",
      row.qty,
      row.total ?? "",
    ]);
  }

  const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
  worksheet["!cols"] = [
    { wch: 5 },
    { wch: 16 },
    { wch: 42 },
    { wch: 14 },
    { wch: 8 },
    { wch: 14 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sipariş");

  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buffer], { type: XLSX_MIME });
  const fileName = `${orderExportFileBaseName(exportData.orderCode)}.xlsx`;

  saveBlobFile(blob, fileName, XLSX_MIME);
}
