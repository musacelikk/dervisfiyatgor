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
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<number | null>(null);

  const itemCount = useMemo(() => cartItemCount(lines), [lines]);
  const total = useMemo(() => cartTotal(lines), [lines]);

  const handleClose = () => {
    onClose();
    if (step === "success") {
      setStep("cart");
      setFullName("");
      setPhone("");
      setOrderId(null);
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
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sipariş oluşturulamadı.");
    } finally {
      setLoading(false);
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
            ? `#${orderId ?? ""}`
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
          <p>Siparişiniz mağazaya iletildi. En kısa sürede değerlendirilecektir.</p>
          <button type="button" className="store-cart-checkout-btn mt-4" onClick={handleClose}>
            Tamam
          </button>
        </div>
      )}
    </BottomSheet>
  );
}
