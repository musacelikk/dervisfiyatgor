"use client";

import { beginMobileDownloadPreview, saveBlobFile, type DownloadFileOptions } from "@/lib/download-blob";
import {
  buildOrderExportData,
  orderExportFileBaseName,
  type OrderExportInput,
} from "@/lib/order-export";

const FONT_REGULAR = "Roboto-Regular.ttf";
const FONT_BOLD = "Roboto-Bold.ttf";
const FONT_FAMILY = "Roboto";

let cachedFontData: { regular: string; bold: string } | null = null;

export type DownloadOrderPdfOptions = DownloadFileOptions;

/** @deprecated beginMobileDownloadPreview kullanın */
export function beginMobilePdfPreview(): Window | null {
  return beginMobileDownloadPreview("PDF");
}

function formatPrice(value: number | null | undefined): string {
  if (value == null) return "—";
  return (
    new Intl.NumberFormat("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value) + " ₺"
  );
}

type PDFOrderData = OrderExportInput;

export type { OrderExportInputFromCart as PDFOrderDataFromCart, OrderExportInputFromOrder as PDFOrderDataFromOrder } from "@/lib/order-export";

type TextDoc = {
  getTextWidth: (text: string) => number;
  setFont: (font: string, style?: string) => void;
};

async function arrayBufferToBase64(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function registerRobotoFont(doc: {
  addFileToVFS: (fileName: string, data: string) => void;
  addFont: (postScriptName: string, fontName: string, style: string) => void;
}): Promise<void> {
  if (!cachedFontData) {
    const [regularRes, boldRes] = await Promise.all([
      fetch("/fonts/Roboto-Regular.ttf"),
      fetch("/fonts/Roboto-Bold.ttf"),
    ]);
    if (!regularRes.ok || !boldRes.ok) {
      throw new Error("PDF fontları yüklenemedi.");
    }

    const [regularB64, boldB64] = await Promise.all([
      regularRes.arrayBuffer().then(arrayBufferToBase64),
      boldRes.arrayBuffer().then(arrayBufferToBase64),
    ]);
    cachedFontData = { regular: regularB64, bold: boldB64 };
  }

  doc.addFileToVFS(FONT_REGULAR, cachedFontData.regular);
  doc.addFileToVFS(FONT_BOLD, cachedFontData.bold);
  doc.addFont(FONT_REGULAR, FONT_FAMILY, "normal");
  doc.addFont(FONT_BOLD, FONT_FAMILY, "bold");
}

function buildColumnLayout(marginL: number, colWidths: number[], colGap: number): number[] {
  const colX: number[] = [];
  let x = marginL;
  for (let i = 0; i < colWidths.length; i++) {
    colX.push(x);
    x += colWidths[i] + (i < colWidths.length - 1 ? colGap : 0);
  }
  return colX;
}

export async function downloadOrderPDF(
  data: PDFOrderData,
  options?: DownloadOrderPdfOptions
): Promise<void> {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  await registerRobotoFont(doc);

  const pageW = 210;
  const marginL = 14;
  const marginR = 14;
  const contentW = pageW - marginL - marginR;
  const cellPad = 2;
  const colGap = 3;
  const colWidths = [9, 30, 58, 32, 16, 32];
  const colX = buildColumnLayout(marginL, colWidths, colGap);
  const rowH = 7.5;

  const {
    customerName,
    phone,
    orderCode,
    orderDate,
    rows,
    grandTotal,
  } = buildOrderExportData(data);

  let y = marginL;

  try {
    const img = await loadImageAsBase64("/logo.png");
    if (img) {
      doc.addImage(img, "PNG", marginL, y, 28, 28);
    }
  } catch {
    // logo yüklenemezse devam et
  }

  doc.setFont(FONT_FAMILY, "bold");
  doc.setFontSize(20);
  doc.setTextColor(180, 20, 20);
  doc.text("FİYAT TEKLİFİ", pageW / 2, y + 12, { align: "center" });

  y += 32;

  doc.setDrawColor(200, 30, 30);
  doc.setLineWidth(0.6);
  doc.line(marginL, y, pageW - marginR, y);
  y += 6;

  const infoLeft = marginL;
  const infoRight = pageW / 2 + 4;

  doc.setFont(FONT_FAMILY, "bold");
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  doc.text("Müşteri Bilgileri", infoLeft, y);

  doc.setFont(FONT_FAMILY, "normal");
  doc.setTextColor(60, 60, 60);
  y += 5;
  doc.text(`Ad Soyad: ${customerName}`, infoLeft, y);
  y += 5;
  if (phone) {
    doc.text(`Telefon: ${phone}`, infoLeft, y);
    y += 5;
  }

  const infoStartY = y - (phone ? 15 : 10);
  doc.setFont(FONT_FAMILY, "bold");
  doc.setTextColor(40, 40, 40);
  doc.text("Sipariş Bilgileri", infoRight, infoStartY);
  doc.setFont(FONT_FAMILY, "normal");
  doc.setTextColor(60, 60, 60);
  doc.text(`Tarih: ${orderDate}`, infoRight, infoStartY + 5);
  doc.text(`Sipariş Kodu: ${orderCode}`, infoRight, infoStartY + 10);

  y += 4;

  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(marginL, y, pageW - marginR, y);
  y += 7;

  const headers = ["#", "Stok Kodu", "Stok Adı", "Birim Fiyat", "Adet", "Toplam"];
  const tableWidth = colX[colX.length - 1] + colWidths[colWidths.length - 1] - marginL;

  doc.setFillColor(180, 20, 20);
  doc.rect(marginL, y, tableWidth, rowH, "F");
  doc.setFont(FONT_FAMILY, "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);

  headers.forEach((h, i) => {
    const align: "left" | "right" | "center" = i === 0 ? "center" : i >= 3 ? "right" : "left";
    const textX = cellTextX(colX[i], colWidths[i], align, cellPad);
    doc.text(h, textX, y + 4.8, { align });
  });
  y += rowH;

  doc.setFont(FONT_FAMILY, "normal");
  doc.setFontSize(8);

  rows.forEach((row, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(248, 248, 248);
      doc.rect(marginL, y, tableWidth, rowH, "F");
    }

    doc.setTextColor(40, 40, 40);

    const cells = [
      { text: String(row.no), align: "center" as const, colIdx: 0 },
      { text: row.stockCode, align: "left" as const, colIdx: 1 },
      {
        text: truncateText(doc, row.name, colWidths[2] - cellPad * 2),
        align: "left" as const,
        colIdx: 2,
      },
      { text: formatPrice(row.unitPrice), align: "right" as const, colIdx: 3 },
      { text: String(row.qty), align: "right" as const, colIdx: 4 },
      { text: formatPrice(row.total), align: "right" as const, colIdx: 5 },
    ];

    cells.forEach(({ text, align, colIdx }) => {
      const textX = cellTextX(colX[colIdx], colWidths[colIdx], align, cellPad);
      doc.text(text, textX, y + 4.8, { align });
    });

    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.1);
    doc.line(marginL, y + rowH, marginL + tableWidth, y + rowH);

    y += rowH;
  });

  y += 6;
  doc.setDrawColor(180, 20, 20);
  doc.setLineWidth(0.5);
  doc.line(marginL + contentW * 0.5, y, pageW - marginR, y);
  y += 5;

  doc.setFont(FONT_FAMILY, "bold");
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  doc.text("GENEL TOPLAM:", colX[4] + colWidths[4] - cellPad, y + 1, { align: "right" });

  doc.setFontSize(11);
  doc.setTextColor(180, 20, 20);
  doc.text(formatPrice(grandTotal), pageW - marginR, y + 1, { align: "right" });

  const fileName = `${orderExportFileBaseName(orderCode)}.pdf`;
  saveBlobFile(doc.output("blob"), fileName, "application/pdf", options?.previewWindow);
}

function cellTextX(
  colStart: number,
  colWidth: number,
  align: "left" | "right" | "center",
  pad: number
): number {
  if (align === "center") return colStart + colWidth / 2;
  if (align === "right") return colStart + colWidth - pad;
  return colStart + pad;
}

function truncateText(doc: TextDoc, text: string, maxWidth: number): string {
  const width = doc.getTextWidth(text);
  if (width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 1 && doc.getTextWidth(`${truncated}…`) > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated}…`;
}

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
