"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { formatOrderMoney } from "@/lib/orders-api";

type StoreFloatingCartProps = {
  itemCount: number;
  total: number | null;
  onOpen: () => void;
  hidden?: boolean;
  className?: string;
};

export default function StoreFloatingCart({
  itemCount,
  total,
  onOpen,
  hidden = false,
  className,
}: StoreFloatingCartProps) {
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  if (itemCount <= 0 || hidden || !portalReady) return null;

  return createPortal(
    <div className={`store-floating-cart-wrap${className ? ` ${className}` : ""}`}>
      <button type="button" className="store-floating-cart" onClick={onOpen}>
        <span className="store-floating-cart-icon" aria-hidden>
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span className="store-floating-cart-badge">{itemCount}</span>
        </span>
        <span className="store-floating-cart-text">
          <span className="store-floating-cart-label">
            {itemCount} ürün
          </span>
          {total != null && (
            <span className="store-floating-cart-total">{formatOrderMoney(total)}</span>
          )}
        </span>
        <span className="store-floating-cart-cta">Sepeti gör</span>
      </button>
    </div>,
    document.body
  );
}
