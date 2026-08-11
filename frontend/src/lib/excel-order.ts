"use client";

import {
  buildOrderExportData,
  orderExportFileBaseName,
  type OrderExportInput,
} from "@/lib/order-export";
import { saveBlobFile } from "@/lib/download-blob";
import type { Order } from "@/types/order";

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

/**
 * Birden fazla siparişi tek çalışma sayfasında dışa aktarır.
 * Tekil sürümden farkı: başa "Sipariş Kodu" ve "Müşteri" sütunları eklenir,
 * her siparişin sonunda ara toplam satırı bulunur.
 */
export async function downloadOrdersExcel(orders: Order[]): Promise<void> {
  if (orders.length === 0) return;
  if (orders.length === 1) return downloadOrderExcel({ order: orders[0] });

  const XLSX = await import("xlsx");

  const sheetRows: (string | number)[][] = [
    [
      "Sipariş Kodu",
      "Müşteri",
      "Tarih",
      "#",
      "Stok Kodu",
      "Stok Adı",
      "Birim Fiyat",
      "Adet",
      "Toplam",
    ],
  ];

  let grandTotal = 0;
  for (const order of orders) {
    const data = buildOrderExportData({ order });
    for (const row of data.rows) {
      sheetRows.push([
        data.orderCode,
        data.customerName,
        data.orderDate,
        row.no,
        row.stockCode,
        row.name,
        row.unitPrice ?? "",
        row.qty,
        row.total ?? "",
      ]);
    }
    sheetRows.push(["", "", "", "", "", "Sipariş toplamı", "", "", data.grandTotal ?? ""]);
    grandTotal += data.grandTotal ?? 0;
  }
  sheetRows.push([]);
  sheetRows.push(["", "", "", "", "", "GENEL TOPLAM", "", "", grandTotal]);

  const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
  worksheet["!cols"] = [
    { wch: 14 },
    { wch: 24 },
    { wch: 18 },
    { wch: 5 },
    { wch: 16 },
    { wch: 42 },
    { wch: 14 },
    { wch: 8 },
    { wch: 14 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Siparişler");

  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buffer], { type: XLSX_MIME });
  const fileName = `dervis-siparisler-${orders.length}.xlsx`;

  saveBlobFile(blob, fileName, XLSX_MIME);
}
