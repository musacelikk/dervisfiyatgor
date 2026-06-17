"use client";

import {
  buildOrderExportData,
  orderExportFileBaseName,
  type OrderExportInput,
} from "@/lib/order-export";
import { saveBlobFile, type DownloadFileOptions } from "@/lib/download-blob";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function downloadOrderExcel(
  data: OrderExportInput,
  options?: DownloadFileOptions
): Promise<void> {
  const XLSX = await import("xlsx");
  const exportData = buildOrderExportData(data);

  const sheetRows: (string | number)[][] = [
    ["FİYAT TEKLİFİ"],
    [],
    ["Müşteri Bilgileri"],
    ["Ad Soyad", exportData.customerName],
  ];

  if (exportData.phone) {
    sheetRows.push(["Telefon", exportData.phone]);
  }

  sheetRows.push(
    [],
    ["Sipariş Bilgileri"],
    ["Tarih", exportData.orderDate],
    ["Sipariş Kodu", exportData.orderCode],
    [],
    ["#", "Stok Kodu", "Stok Adı", "Birim Fiyat", "Adet", "Toplam"]
  );

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

  sheetRows.push([], ["", "", "", "", "GENEL TOPLAM", exportData.grandTotal ?? ""]);

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
  XLSX.utils.book_append_sheet(workbook, worksheet, "Fiyat Teklifi");

  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buffer], { type: XLSX_MIME });
  const fileName = `${orderExportFileBaseName(exportData.orderCode)}.xlsx`;

  saveBlobFile(blob, fileName, XLSX_MIME, options?.previewWindow);
}
