"use client";

import { useMemo, useState } from "react";
import BottomSheet from "@/components/BottomSheet";
import {
  cartItemCount,
  clearCartStorage,
  removeFromCart,
  updateCartQuantity,
  type CartLine,
  type PriceTier,
} from "@/lib/cart";
import { formatOrderMoney, submitOrder } from "@/lib/orders-api";
import { formatPersonnelCustomerName, splitPersonnelOrderName } from "@/lib/personnel-order";
import { formatStorePrice, productUnitPrice } from "@/lib/store-format";
import { downloadOrderExcel } from "@/lib/excel-order";
import { downloadOrderPDF } from "@/lib/pdf-order";
import type { Order } from "@/types/order";

type CartSheetProps = {
  open: boolean;
  onClose: () => void;
  lines: CartLine[];
  onLinesChange: (lines: CartLine[]) => void;
  mode?: "store" | "personnel";
  personnelName?: string;
  priceTier: PriceTier;
  onPriceTierChange: (tier: PriceTier) => void;
};

export default function CartSheet({
  open,
  onClose,
  lines,
  onLinesChange,
  mode = "store",
  personnelName,
  priceTier,
  onPriceTierChange,
}: CartSheetProps) {
  const isPersonnel = mode === "personnel" && Boolean(personnelName?.trim());
  const personnelCustomerName = personnelName
    ? formatPersonnelCustomerName(personnelName)
    : "Personel";
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

  const getUnitPrice = (product: CartLine["product"]) => productUnitPrice(product, priceTier);

  const total = useMemo(() => {
    let sum = 0;
    let hasPrice = false;
    for (const line of lines) {
      const price = getUnitPrice(line.product);
      if (price != null) {
        hasPrice = true;
        sum += price * line.quantity;
      }
    }
    return hasPrice ? sum : null;
  }, [lines, priceTier]);

  const hasAnyPrice2 = useMemo(
    () => lines.some((l) => l.product.salePrice2 != null),
    [lines]
  );

  const cartScope = isPersonnel ? "personnel" : "store";
  const exportBusy = pdfLoading || excelLoading;

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

  const handleSubmitOrder = async (e?: React.FormEvent) => {
    e?.preventDefault();

    let firstName: string;
    let lastName: string;
    let phoneValue: string | undefined;

    if (isPersonnel) {
      ({ firstName, lastName } = splitPersonnelOrderName(personnelName!));
      phoneValue = undefined;
    } else {
      const normalized = fullName.trim().replace(/\s+/g, " ");
      const spaceIndex = normalized.indexOf(" ");
      if (spaceIndex === -1) {
        setError("Ad ve soyadınızı birlikte yazın (örn. Ahmet Yılmaz).");
        return;
      }

      firstName = normalized.slice(0, spaceIndex);
      lastName = normalized.slice(spaceIndex + 1);
      if (firstName.length < 2 || lastName.length < 2) {
        setError("Ad ve soyad en az 2 karakter olmalı.");
        return;
      }
      phoneValue = phone.trim() || undefined;
    }

    setLoading(true);
    setError(null);
    try {
      const order = await submitOrder({
        firstName,
        lastName,
        phone: phoneValue,
        items: lines.map((line) => ({
          stockCode: line.product.stockCode,
          quantity: line.quantity,
        })),
      });
      clearCartStorage(cartScope);
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

  const handleStartCheckout = () => {
    if (isPersonnel) {
      void handleSubmitOrder();
      return;
    }
    setStep("checkout");
  };

  const handleClearCart = () => {
    if (lines.length === 0) return;
    if (!confirm("Sepetteki tüm ürünler silinecek. Baştan başlamak istiyor musunuz?")) {
      return;
    }
    clearCartStorage(cartScope);
    onLinesChange([]);
    setFullName("");
    setPhone("");
    setError(null);
    setStep("cart");
    onClose();
  };

  const handleDownloadCartPDF = async () => {
    if (lines.length === 0) return;
    setPdfLoading(true);
    setError(null);
    try {
      await downloadOrderPDF({
        lines,
        customerName: isPersonnel ? personnelCustomerName : fullName.trim() || "—",
        phone: isPersonnel ? undefined : phone.trim() || undefined,
        orderCode: "—",
        priceTier,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF oluşturulamadı.");
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownloadOrderPDF = async () => {
    if (!completedOrder) return;
    setPdfLoading(true);
    setError(null);
    try {
      await downloadOrderPDF({ order: completedOrder });
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF oluşturulamadı.");
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownloadCartExcel = async () => {
    if (lines.length === 0) return;
    setExcelLoading(true);
    setError(null);
    try {
      await downloadOrderExcel({
        lines,
        customerName: isPersonnel ? personnelCustomerName : fullName.trim() || "—",
        phone: isPersonnel ? undefined : phone.trim() || undefined,
        orderCode: "—",
        priceTier,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Excel oluşturulamadı.");
    } finally {
      setExcelLoading(false);
    }
  };

  const handleDownloadOrderExcel = async () => {
    if (!completedOrder) return;
    setExcelLoading(true);
    setError(null);
    try {
      await downloadOrderExcel({ order: completedOrder });
    } catch (err) {
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
                  const unitPrice = getUnitPrice(line.product) ?? 0;
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
                  <strong>{total != null ? formatOrderMoney(total) : "—"}</strong>
                </div>
                {hasAnyPrice2 ? (
                  <div className="store-cart-price-tier-row">
                    <span className="store-cart-price-tier-label">Fiyat:</span>
                    <div className="store-cart-price-tier-toggle">
                      <button
                        type="button"
                        className={`store-cart-tier-btn${priceTier === 1 ? " active" : ""}`}
                        onClick={() => onPriceTierChange(1)}
                        disabled={loading || exportBusy}
                      >
                        Satış&nbsp;1
                      </button>
                      <button
                        type="button"
                        className={`store-cart-tier-btn${priceTier === 2 ? " active" : ""}`}
                        onClick={() => onPriceTierChange(2)}
                        disabled={loading || exportBusy}
                      >
                        Satış&nbsp;2
                      </button>
                    </div>
                    <button
                      type="button"
                      className="store-cart-clear-btn store-cart-clear-btn--inline"
                      disabled={loading || exportBusy}
                      onClick={handleClearCart}
                    >
                      Sepeti temizle
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="store-cart-clear-btn"
                    disabled={loading || exportBusy}
                    onClick={handleClearCart}
                  >
                    Sepeti temizle
                  </button>
                )}
                {isPersonnel && (
                  <p className="store-cart-personnel-note">
                    Müşteri: <strong>{personnelCustomerName}</strong>
                  </p>
                )}
                <button
                  type="button"
                  className="store-cart-checkout-btn"
                  disabled={loading || (isPersonnel && !personnelName?.trim())}
                  onClick={() => void handleStartCheckout()}
                >
                  {loading ? "Gönderiliyor…" : "Siparişi oluştur"}
                </button>
                <button
                  type="button"
                  className="store-cart-pdf-btn"
                  disabled={exportBusy}
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
                  disabled={exportBusy}
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
          <button type="submit" className="store-cart-checkout-btn" disabled={loading || exportBusy}>
            {loading ? "Gönderiliyor…" : "Siparişi onayla"}
          </button>
          <button
            type="button"
            className="store-cart-clear-btn"
            disabled={loading || exportBusy}
            onClick={handleClearCart}
          >
            Sepeti temizle
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
          <p>
            {isPersonnel
              ? "Sipariş oluşturuldu ve sipariş listesine eklendi."
              : "Siparişiniz mağazaya iletildi. En kısa sürede değerlendirilecektir."}
          </p>
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
