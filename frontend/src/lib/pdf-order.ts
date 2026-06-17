"use client";

import type { CartLine } from "@/lib/cart";
import type { Order } from "@/types/order";
import { formatOrderMoney } from "@/lib/orders-api";
import { productSalePrice } from "@/lib/store-format";

function formatDateTR(iso?: string): string {
  try {
    const d = iso ? new Date(iso) : new Date();
    return new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return iso ?? new Date().toLocaleDateString("tr-TR");
  }
}

function formatPrice(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value) + " ₺";
}

type PDFOrderDataFromCart = {
  lines: CartLine[];
  customerName: string;
  phone?: string;
  orderCode?: string;
};

type PDFOrderDataFromOrder = {
  order: Order;
};

type PDFOrderData = PDFOrderDataFromCart | PDFOrderDataFromOrder;

function isFromOrder(data: PDFOrderData): data is PDFOrderDataFromOrder {
  return "order" in data;
}

export async function downloadOrderPDF(data: PDFOrderData): Promise<void> {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const marginL = 15;
  const marginR = 15;
  const contentW = pageW - marginL - marginR;

  let customerName = "";
  let phone = "";
  let orderCode = "";
  let orderDate = formatDateTR();
  let rows: { no: number; stockCode: string; name: string; unitPrice: number | null; qty: number; total: number | null }[] = [];
  let grandTotal: number | null = null;

  if (isFromOrder(data)) {
    const o = data.order;
    customerName = `${o.firstName} ${o.lastName}`.trim();
    phone = o.phone ?? "";
    orderCode = o.orderCode ?? `#${o.id}`;
    orderDate = formatDateTR(o.createdAt);
    rows = o.items.map((item, i) => ({
      no: i + 1,
      stockCode: item.stockCode,
      name: item.productName,
      unitPrice: item.salePrice,
      qty: item.quantity,
      total: item.lineTotal,
    }));
    grandTotal = o.totalAmount;
  } else {
    customerName = data.customerName;
    phone = data.phone ?? "";
    orderCode = data.orderCode ?? "—";
    rows = data.lines.map((line, i) => {
      const unitPrice = productSalePrice(line.product) ?? null;
      const total = unitPrice != null ? unitPrice * line.quantity : null;
      return {
        no: i + 1,
        stockCode: line.product.stockCode,
        name: line.product.name,
        unitPrice,
        qty: line.quantity,
        total,
      };
    });
    grandTotal = rows.reduce((sum, r) => sum + (r.total ?? 0), 0);
  }

  let y = marginL;

  // ——— Logo ———
  try {
    const logoUrl = "/logo.png";
    const img = await loadImageAsBase64(logoUrl);
    if (img) {
      doc.addImage(img, "PNG", marginL, y, 28, 28);
    }
  } catch {
    // logo yüklenemezse devam et
  }

  // ——— Başlık ———
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(180, 20, 20);
  doc.text("FİYAT TEKLİFİ", pageW / 2, y + 10, { align: "center" });

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text("Derviş Fıyatgör", pageW / 2, y + 17, { align: "center" });

  y += 34;

  // ——— Ayırıcı çizgi ———
  doc.setDrawColor(200, 30, 30);
  doc.setLineWidth(0.6);
  doc.line(marginL, y, pageW - marginR, y);
  y += 5;

  // ——— Müşteri / Sipariş bilgileri ———
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);

  const infoLeft = marginL;
  const infoRight = pageW / 2 + 5;

  // Sol: Müşteri bilgisi
  doc.setFont("helvetica", "bold");
  doc.setTextColor(40, 40, 40);
  doc.text("Müşteri Bilgileri", infoLeft, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  y += 5;
  doc.text(`Ad Soyad: ${customerName}`, infoLeft, y);
  y += 4.5;
  if (phone) {
    doc.text(`Telefon: ${phone}`, infoLeft, y);
    y += 4.5;
  }

  // Sağ: Sipariş bilgisi (aynı y seviyesinde tekrar başla)
  const infoStartY = y - (phone ? 13.5 : 9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(40, 40, 40);
  doc.text("Sipariş Bilgileri", infoRight, infoStartY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text(`Tarih: ${orderDate}`, infoRight, infoStartY + 5);
  doc.text(`Sipariş Kodu: ${orderCode}`, infoRight, infoStartY + 9.5);

  y += 6;

  // ——— İkinci ayırıcı ———
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(marginL, y, pageW - marginR, y);
  y += 6;

  // ——— Tablo başlığı ———
  const colWidths = [10, 28, 65, 27, 15, 27]; // sıra, stok kodu, stok adı, birim fiyat, adet, toplam
  const colX = [marginL];
  for (let i = 0; i < colWidths.length - 1; i++) {
    colX.push(colX[i] + colWidths[i]);
  }
  const rowH = 6.5;
  const headers = ["#", "Stok Kodu", "Stok Adı", "Birim Fiyat", "Adet", "Toplam"];

  // Başlık arka planı
  doc.setFillColor(180, 20, 20);
  doc.rect(marginL, y, contentW, rowH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  headers.forEach((h, i) => {
    const align: "left" | "right" | "center" = i === 0 ? "center" : i >= 3 ? "right" : "left";
    const textX =
      align === "center"
        ? colX[i] + colWidths[i] / 2
        : align === "right"
          ? colX[i] + colWidths[i] - 1.5
          : colX[i] + 1.5;
    doc.text(h, textX, y + 4.2, { align });
  });
  y += rowH;

  // ——— Tablo satırları ———
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  rows.forEach((row, idx) => {
    const isEven = idx % 2 === 0;
    if (isEven) {
      doc.setFillColor(248, 248, 248);
      doc.rect(marginL, y, contentW, rowH, "F");
    }

    doc.setTextColor(40, 40, 40);

    const cells = [
      { text: String(row.no), align: "center" as const, colIdx: 0 },
      { text: row.stockCode, align: "left" as const, colIdx: 1 },
      { text: truncateText(doc, row.name, colWidths[2] - 3), align: "left" as const, colIdx: 2 },
      { text: formatPrice(row.unitPrice), align: "right" as const, colIdx: 3 },
      { text: String(row.qty), align: "right" as const, colIdx: 4 },
      { text: formatPrice(row.total), align: "right" as const, colIdx: 5 },
    ];

    cells.forEach(({ text, align, colIdx }) => {
      const textX =
        align === "center"
          ? colX[colIdx] + colWidths[colIdx] / 2
          : align === "right"
            ? colX[colIdx] + colWidths[colIdx] - 1.5
            : colX[colIdx] + 1.5;
      doc.text(text, textX, y + 4.2, { align });
    });

    // Satır alt çizgisi
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.1);
    doc.line(marginL, y + rowH, pageW - marginR, y + rowH);

    y += rowH;
  });

  // ——— Genel toplam ———
  y += 4;
  doc.setDrawColor(180, 20, 20);
  doc.setLineWidth(0.5);
  doc.line(marginL + contentW * 0.55, y, pageW - marginR, y);
  y += 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  doc.text("GENEL TOPLAM:", colX[4], y + 1, { align: "right" });

  doc.setFontSize(11);
  doc.setTextColor(180, 20, 20);
  doc.text(formatPrice(grandTotal), pageW - marginR, y + 1, { align: "right" });

  y += 12;

  // ——— Alt not ———
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(140, 140, 140);
  doc.text("Bu belge Derviş Fıyatgör sistemi tarafından otomatik oluşturulmuştur.", pageW / 2, y, { align: "center" });

  // ——— İndir ———
  const fileName = `siparis-${orderCode !== "—" ? orderCode : Date.now()}.pdf`;
  doc.save(fileName);
}

function truncateText(doc: { getTextWidth: (text: string) => number }, text: string, maxWidth: number): string {
  const width = doc.getTextWidth(text);
  if (width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 1 && doc.getTextWidth(truncated + "…") > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + "…";
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
