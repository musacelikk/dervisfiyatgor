"use client";

import { useState } from "react";
import StoreQtyStepper from "./StoreQtyStepper";
import { formatStorePrice, productSalePrice } from "@/lib/store-format";
import type { Product } from "@/types/product";

type StoreProductResultItemProps = {
  product: Product;
  onSelect?: (product: Product) => void;
  onAddToCart?: (product: Product, quantity: number) => void;
};

function StoreProductResultItem({
  product,
  onSelect,
  onAddToCart,
}: StoreProductResultItemProps) {
  const [qty, setQty] = useState(1);
  const price = productSalePrice(product);
  const lineTotal = price != null ? price * qty : null;

  return (
    <article className="store-product-card">
      <button type="button" className="store-product-card-main" onClick={() => onSelect?.(product)}>
        <div className="store-product-card-text">
          <h3 className="store-product-card-name">{product.name}</h3>
          <p className="store-product-card-meta">
            <span>{product.stockCode}</span>
            {product.group && (
              <>
                <span className="store-product-card-dot">·</span>
                <span>{product.group}</span>
              </>
            )}
          </p>
        </div>
        <div className="store-product-card-price-wrap">
          <p className="store-product-card-price">{formatStorePrice(price)}</p>
          {product.remainingQty != null && (
            <p className="store-product-card-stock">
              Stok: {product.remainingQty.toLocaleString("tr-TR")}
            </p>
          )}
        </div>
      </button>

      {onAddToCart && (
        <div className="store-product-card-actions">
          <StoreQtyStepper value={qty} onChange={setQty} size="sm" />
          <button
            type="button"
            className="store-product-add-btn"
            onClick={() => onAddToCart(product, qty)}
          >
            Sepete ekle
          </button>
        </div>
      )}

      {lineTotal != null && qty > 1 && (
        <p className="store-product-card-line-total">
          {qty} adet · {formatStorePrice(lineTotal)}
        </p>
      )}
    </article>
  );
}

interface ProductResultListProps {
  products: Product[];
  onSelect?: (product: Product) => void;
  storeMode?: boolean;
  onAddToCart?: (product: Product, quantity: number) => void;
}

export default function ProductResultList({
  products,
  onSelect,
  storeMode = false,
  onAddToCart,
}: ProductResultListProps) {
  if (products.length === 0) {
    return (
      <div className="store-empty-results">
        <p>Ürün bulunamadı.</p>
        <p className="store-empty-results-hint">Farklı bir barkod veya isim deneyin.</p>
      </div>
    );
  }

  if (storeMode) {
    return (
      <ul className="store-product-list">
        {products.map((p) => (
          <li key={p.stockCode}>
            <StoreProductResultItem
              product={p}
              onSelect={onSelect}
              onAddToCart={onAddToCart}
            />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl ring-1 ring-zinc-200/80">
      {products.map((p) => {
        const price = productSalePrice(p);
        return (
          <li key={p.stockCode}>
            <button
              type="button"
              onClick={() => onSelect?.(p)}
              className="flex w-full items-center gap-3 bg-white px-4 py-3.5 text-left transition hover:bg-zinc-50 active:bg-zinc-100"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-900">{p.name}</p>
                <p className="mt-0.5 font-mono text-xs text-zinc-500">{p.stockCode}</p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-accent">
                {formatStorePrice(price)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
