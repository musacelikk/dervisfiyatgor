"use client";

import { useMemo, useState } from "react";
import BottomSheet from "@/components/BottomSheet";
import {
  cartItemCount,
  cartTotal,
  clearCartStorage,
  removeFromCart,
  updateCartQuantity,
  type CartLine,
} from "@/lib/cart";
import { formatOrderMoney, submitOrder } from "@/lib/orders-api";
import { formatStorePrice, productSalePrice } from "@/lib/store-format";
import { beginMobileDownloadPreview } from "@/lib/download-blob";
import { downloadOrderExcel } from "@/lib/excel-order";
import { beginMobilePdfPreview, downloadOrderPDF } from "@/lib/pdf-order";
import type { Order } from "@/types/order";

type CartSheetProps = {
  open: boolean;
  onClose: () => void;
  lines: CartLine[];
  onLinesChange: (lines: CartLine[]) => void;
};

export default function CartSheet({ open, onClose, lines, onLinesChange }: CartSheetProps) {
  const [step, setStep] = useState<"cart" | "checkout" | "success">("cart");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  const itemCount = useMemo(() => cartItemCount(lines), [lines]);
  const total = useMemo(() => cartTotal(lines), [lines]);

  const handleClose = () => {
    onClose();
    if (step === "success") {
      setStep("cart");
      setFullName("");
      setPhone("");
      setOrderId(null);
      setCompletedOrder(null);
      setError(null);
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = fullName.trim().replace(/\s+/g, " ");
    const spaceIndex = normalized.indexOf(" ");
    if (spaceIndex === -1) {
      setError("Ad ve soyadınızı birlikte yazın (örn. Ahmet Yılmaz).");
      return;
    }

    const firstName = normalized.slice(0, spaceIndex);
    const lastName = normalized.slice(spaceIndex + 1);
    if (firstName.length < 2 || lastName.length < 2) {
      setError("Ad ve soyad en az 2 karakter olmalı.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const order = await submitOrder({
        firstName,
        lastName,
        phone: phone.trim() || undefined,
        items: lines.map((line) => ({
          stockCode: line.product.stockCode,
          quantity: line.quantity,
        })),
      });
      clearCartStorage();
      onLinesChange([]);
      setOrderId(order.id);
      setCompletedOrder(order);
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sipariş oluşturulamadı.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCartPDF = async () => {
    if (lines.length === 0) return;
    const previewWindow = beginMobilePdfPreview();
    setPdfLoading(true);
    setError(null);
    try {
      await downloadOrderPDF(
        {
          lines,
          customerName: fullName.trim() || "—",
          phone: phone.trim() || undefined,
          orderCode: "—",
        },
        { previewWindow }
      );
    } catch (err) {
      previewWindow?.close();
      setError(err instanceof Error ? err.message : "PDF oluşturulamadı.");
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownloadOrderPDF = async () => {
    if (!completedOrder) return;
    const previewWindow = beginMobilePdfPreview();
    setPdfLoading(true);
    setError(null);
    try {
      await downloadOrderPDF({ order: completedOrder }, { previewWindow });
    } catch (err) {
      previewWindow?.close();
      setError(err instanceof Error ? err.message : "PDF oluşturulamadı.");
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownloadCartExcel = async () => {
    if (lines.length === 0) return;
    const previewWindow = beginMobileDownloadPreview("Excel");
    setExcelLoading(true);
    setError(null);
    try {
      await downloadOrderExcel(
        {
          lines,
          customerName: fullName.trim() || "—",
          phone: phone.trim() || undefined,
          orderCode: "—",
        },
        { previewWindow }
      );
    } catch (err) {
      previewWindow?.close();
      setError(err instanceof Error ? err.message : "Excel oluşturulamadı.");
    } finally {
      setExcelLoading(false);
    }
  };

  const handleDownloadOrderExcel = async () => {
    if (!completedOrder) return;
    const previewWindow = beginMobileDownloadPreview("Excel");
    setExcelLoading(true);
    setError(null);
    try {
      await downloadOrderExcel({ order: completedOrder }, { previewWindow });
    } catch (err) {
      previewWindow?.close();
      setError(err instanceof Error ? err.message : "Excel oluşturulamadı.");
    } finally {
      setExcelLoading(false);
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={handleClose}
      onBack={
        step === "checkout"
          ? () => {
              setStep("cart");
              setError(null);
            }
          : undefined
      }
      title={
        step === "success"
          ? "Sipariş alındı"
          : step === "checkout"
            ? "Sipariş bilgileri"
            : `Sepetim (${itemCount})`
      }
      subtitle={
        step === "cart" && lines.length > 0
          ? formatOrderMoney(total)
          : step === "success"
            ? completedOrder?.orderCode
              ? `Kod: ${completedOrder.orderCode}`
              : `#${orderId ?? ""}`
            : undefined
      }
    >
      {step === "cart" && (
        <div className="store-cart">
          {lines.length === 0 ? (
            <p className="store-cart-empty">Sepetiniz boş. Ürün detayından sepete ekleyin.</p>
          ) : (
            <>
              <ul className="store-cart-list">
                {lines.map((line) => {
                  const unitPrice = productSalePrice(line.product) ?? 0;
                  const lineTotal = unitPrice * line.quantity;

                  return (
                  <li key={line.product.stockCode} className="store-cart-item">
                    <div className="store-cart-item-top">
                      <div className="store-cart-item-main">
                        <p className="store-cart-item-name">{line.product.name}</p>
                        <p className="store-cart-item-meta">{line.product.stockCode}</p>
                        <p className="store-cart-item-unit">
                          Birim fiyat: {formatStorePrice(unitPrice)}
                        </p>
                      </div>
                      <div className="store-cart-item-price-wrap">
                        <p className="store-cart-item-price">{formatOrderMoney(lineTotal)}</p>
                        {line.quantity > 1 && (
                          <p className="store-cart-item-qty-hint">
                            {formatStorePrice(unitPrice)} × {line.quantity}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="store-cart-item-actions">
                      <div className="store-cart-qty">
                        <button
                          type="button"
                          onClick={() =>
                            onLinesChange(
                              updateCartQuantity(
                                lines,
                                line.product.stockCode,
                                line.quantity - 1
                              )
                            )
                          }
                          aria-label="Azalt"
                        >
                          −
                        </button>
                        <span>{line.quantity}</span>
                        <button
                          type="button"
                          onClick={() =>
                            onLinesChange(
                              updateCartQuantity(
                                lines,
                                line.product.stockCode,
                                line.quantity + 1
                              )
                            )
                          }
                          aria-label="Artır"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="store-cart-remove"
                        onClick={() =>
                          onLinesChange(removeFromCart(lines, line.product.stockCode))
                        }
                      >
                        Kaldır
                      </button>
                    </div>
                  </li>
                  );
                })}
              </ul>
              <div className="store-cart-footer">
                <div className="store-cart-total-row">
                  <span>Toplam</span>
                  <strong>{formatOrderMoney(total)}</strong>
                </div>
                <button
                  type="button"
                  className="store-cart-checkout-btn"
                  onClick={() => setStep("checkout")}
                >
                  Siparişi oluştur
                </button>
                <button
                  type="button"
                  className="store-cart-pdf-btn"
                  disabled={pdfLoading || excelLoading}
                  onClick={() => void handleDownloadCartPDF()}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {pdfLoading ? "Hazırlanıyor…" : "PDF İndir"}
                </button>
                <button
                  type="button"
                  className="store-cart-excel-btn"
                  disabled={pdfLoading || excelLoading}
                  onClick={() => void handleDownloadCartExcel()}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M10 3v18M3 6.5A1.5 1.5 0 014.5 5h15A1.5 1.5 0 0121 6.5v11a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 17.5v-11z" />
                  </svg>
                  {excelLoading ? "Hazırlanıyor…" : "Excel İndir"}
                </button>
                {error && <p className="store-cart-error">{error}</p>}
              </div>
            </>
          )}
        </div>
      )}

      {step === "checkout" && (
        <form className="store-checkout-form" onSubmit={handleSubmitOrder}>
          <div>
            <label className="store-field-label">Ad Soyad *</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="store-field-input"
              required
              minLength={5}
              autoFocus
              autoComplete="name"
              placeholder="Ahmet Yılmaz"
            />
          </div>
          <div>
            <label className="store-field-label">Telefon (opsiyonel)</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="store-field-input"
              inputMode="tel"
              placeholder="05xx xxx xx xx"
            />
          </div>
          {error && <p className="store-cart-error">{error}</p>}
          <button type="submit" className="store-cart-checkout-btn" disabled={loading}>
            {loading ? "Gönderiliyor…" : "Siparişi onayla"}
          </button>
        </form>
      )}

      {step === "success" && (
        <div className="store-cart-success">
          {completedOrder?.orderCode && (
            <p className="store-cart-success-code">
              Sipariş kodunuz: <strong>{completedOrder.orderCode}</strong>
            </p>
          )}
          <p>Siparişiniz mağazaya iletildi. En kısa sürede değerlendirilecektir.</p>
          <div className="store-cart-success-actions">
            {completedOrder && (
              <>
                <button
                  type="button"
                  className="store-cart-pdf-btn"
                  disabled={pdfLoading || excelLoading}
                  onClick={() => void handleDownloadOrderPDF()}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {pdfLoading ? "Hazırlanıyor…" : "PDF İndir"}
                </button>
                <button
                  type="button"
                  className="store-cart-excel-btn"
                  disabled={pdfLoading || excelLoading}
                  onClick={() => void handleDownloadOrderExcel()}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M10 3v18M3 6.5A1.5 1.5 0 014.5 5h15A1.5 1.5 0 0121 6.5v11a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 17.5v-11z" />
                  </svg>
                  {excelLoading ? "Hazırlanıyor…" : "Excel İndir"}
                </button>
              </>
            )}
            <button type="button" className="store-cart-checkout-btn" onClick={handleClose}>
              Tamam
            </button>
          </div>
          {error && <p className="store-cart-error mt-3">{error}</p>}
        </div>
      )}
    </BottomSheet>
  );
}
