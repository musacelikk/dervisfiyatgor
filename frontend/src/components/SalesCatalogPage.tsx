"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BrandLogo from "@/components/BrandLogo";
import type {
  CatalogListResult,
  CatalogProduct,
  ProductImage,
} from "@/types/product";
import type { Order } from "@/types/order";
import { productSalePrice, formatStorePrice } from "@/lib/store-format";
import {
  buildShareText,
  clearSalesCart,
  readCreatorName,
  readSalesCart,
  submitSalesOrder,
  writeCreatorName,
  writeSalesCart,
  type SalesCartItem,
} from "@/lib/sales-cart";

function formatPrice(product: CatalogProduct): string | null {
  const price = productSalePrice(product);
  return price == null ? null : formatStorePrice(price);
}

type QtyPrompt = { product: CatalogProduct; value: string };

export default function SalesCatalogPage() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<CatalogProduct[]>([]);
  const [meta, setMeta] = useState<CatalogListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<CatalogProduct | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const [cart, setCart] = useState<SalesCartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [qtyPrompt, setQtyPrompt] = useState<QtyPrompt | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [creatorName, setCreatorName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const shellRef = useRef<HTMLDivElement>(null);
  const showPrices = meta?.showPrices ?? false;

  useEffect(() => {
    setCart(readSalesCart());
    setCreatorName(readCreatorName());
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const ctrl = new AbortController();
    const append = page > 1;
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);

    (async () => {
      try {
        const params = new URLSearchParams({ page: String(page), limit: "24" });
        if (debouncedQ) params.set("q", debouncedQ);
        const res = await fetch(`/api/catalog?${params}`, { signal: ctrl.signal });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            typeof body.error === "string" ? body.error : "Katalog yüklenemedi."
          );
        }
        const result = body as CatalogListResult;
        setMeta(result);
        setItems((prev) => (append ? [...prev, ...result.products] : result.products));
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Katalog yüklenemedi.");
      } finally {
        if (!ctrl.signal.aborted) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    })();

    return () => ctrl.abort();
  }, [page, debouncedQ]);

  /* ————— Ürün detayı ————— */

  const openProduct = (product: CatalogProduct) => {
    setSelected(product);
    setActiveImage(0);
  };

  const closeProduct = useCallback(() => setSelected(null), []);

  const anyOverlayOpen = Boolean(selected || cartOpen || qtyPrompt);
  useEffect(() => {
    if (!anyOverlayOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setQtyPrompt(null);
        setCartOpen(false);
        setSelected(null);
      }
    };
    document.addEventListener("keydown", onKey);
    const shell = shellRef.current;
    if (shell) shell.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      if (shell) shell.style.overflow = "";
    };
  }, [anyOverlayOpen]);

  const handleCarouselScroll = () => {
    const el = carouselRef.current;
    if (!el || el.clientWidth === 0) return;
    setActiveImage(Math.round(el.scrollLeft / el.clientWidth));
  };

  const scrollToImage = (index: number) => {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
  };

  /* ————— Sepet ————— */

  const cartCount = useMemo(() => cart.reduce((sum, i) => sum + i.qty, 0), [cart]);

  const updateCart = (next: SalesCartItem[]) => {
    setCart(next);
    writeSalesCart(next);
  };

  const openQtyPrompt = (product: CatalogProduct) => {
    const existing = cart.find((i) => i.stockCode === product.stockCode);
    setQtyPrompt({ product, value: existing ? String(existing.qty) : "" });
  };

  const confirmQty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qtyPrompt) return;
    const qty = Number(qtyPrompt.value);
    if (!Number.isFinite(qty) || qty < 1) return;
    const { product } = qtyPrompt;
    const rest = cart.filter((i) => i.stockCode !== product.stockCode);
    updateCart([
      ...rest,
      {
        stockCode: product.stockCode,
        name: product.name,
        imageUrl: product.imageUrl,
        qty: Math.floor(qty),
      },
    ]);
    setQtyPrompt(null);
  };

  const changeItemQty = (stockCode: string, raw: string) => {
    const qty = Math.floor(Number(raw));
    updateCart(
      cart
        .map((i) => (i.stockCode === stockCode ? { ...i, qty } : i))
        .filter((i) => Number.isFinite(i.qty) && i.qty > 0)
    );
  };

  const removeItem = (stockCode: string) => {
    updateCart(cart.filter((i) => i.stockCode !== stockCode));
  };

  /* ————— Sipariş ————— */

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      writeCreatorName(creatorName.trim());
      const order = await submitSalesOrder({
        customerName,
        phone: customerPhone,
        createdBy: creatorName,
        items: cart,
      });
      setCompletedOrder(order);
      clearSalesCart();
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sipariş oluşturulamadı.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = async () => {
    if (!completedOrder) return;
    const text = buildShareText(completedOrder);
    setShareFeedback(null);
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Derviş Plastik Sipariş", text });
        return;
      } catch {
        /* kullanıcı iptal etti → panoya kopyalamayı dene */
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setShareFeedback("Sipariş metni panoya kopyalandı.");
    } catch {
      setShareFeedback("Paylaşım desteklenmiyor; metni elle kopyalayın.");
    }
  };

  const closeCart = () => {
    setCartOpen(false);
    setCompletedOrder(null);
    setShareFeedback(null);
  };

  const total = meta?.total ?? 0;
  const hasMore = meta ? page < meta.totalPages : false;
  const selectedImages: ProductImage[] = selected?.images ?? [];
  const selectedInCart = selected
    ? cart.find((i) => i.stockCode === selected.stockCode)
    : undefined;

  return (
    <div className="sales-shell" ref={shellRef}>
      <header className="sales-header">
        <div className="sales-header-inner">
          <BrandLogo size="sm" priority />
          <div className="sales-header-text">
            <p className="sales-eyebrow">Derviş Plastik</p>
            <h1 className="sales-title">Ürün kataloğu</h1>
          </div>
          <span className="sales-count" aria-live="polite">
            {loading ? "…" : `${total.toLocaleString("tr-TR")} ürün`}
          </span>
        </div>
        <div className="sales-search">
          <svg className="sales-search-icon" viewBox="0 0 20 20" fill="none" aria-hidden>
            <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2" />
            <path
              d="m14 14 3.5 3.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ürün adı, stok kodu veya grup ara…"
            className="sales-search-input"
            autoComplete="off"
          />
          {q && (
            <button
              type="button"
              className="sales-search-clear"
              aria-label="Aramayı temizle"
              onClick={() => setQ("")}
            >
              ×
            </button>
          )}
        </div>
      </header>

      <main className="sales-main sales-main-cart-space">
        {error && !cartOpen && (
          <div className="admin-alert admin-alert-error">{error}</div>
        )}

        {loading && items.length === 0 ? (
          <div className="sales-grid" aria-hidden>
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="sales-card sales-card-skeleton">
                <div className="sales-card-media" />
                <div className="sales-card-body">
                  <span className="sales-skeleton-line w-1/3" />
                  <span className="sales-skeleton-line w-full" />
                  <span className="sales-skeleton-line w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="sales-empty">
            {debouncedQ ? "Aramanızla eşleşen ürün yok." : "Henüz ürün yok."}
          </p>
        ) : (
          <div className="sales-grid">
            {items.map((p) => {
              const inCart = cart.find((i) => i.stockCode === p.stockCode);
              const price = showPrices ? formatPrice(p) : null;
              return (
                <article
                  key={p.stockCode}
                  className="sales-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => openProduct(p)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openProduct(p);
                    }
                  }}
                >
                  <div className="sales-card-media">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt={p.name} loading="lazy" />
                    ) : (
                      <div className="sales-card-placeholder" aria-hidden>
                        <span>{p.name.slice(0, 1).toUpperCase()}</span>
                      </div>
                    )}
                    {(p.images?.length ?? 0) > 1 && (
                      <span className="sales-card-badge">{p.images!.length} resim</span>
                    )}
                    {inCart && (
                      <span className="sales-card-incart">{inCart.qty} adet sepette</span>
                    )}
                  </div>
                  <div className="sales-card-body">
                    <p className="sales-card-code">{p.stockCode}</p>
                    <h2 className="sales-card-name">{p.name}</h2>
                    {p.group && <p className="sales-card-group">{p.group}</p>}
                    <div className="sales-card-footer">
                      {price && <p className="sales-card-price">{price}</p>}
                      <button
                        type="button"
                        className="sales-card-add"
                        aria-label={`${p.name} sepete ekle`}
                        onClick={(e) => {
                          e.stopPropagation();
                          openQtyPrompt(p);
                        }}
                      >
                        + Sepete
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {hasMore && (
          <div className="sales-more">
            <button
              type="button"
              className="sales-more-btn"
              disabled={loadingMore}
              onClick={() => setPage((p) => p + 1)}
            >
              {loadingMore
                ? "Yükleniyor…"
                : `Daha fazla göster (${items.length} / ${total.toLocaleString("tr-TR")})`}
            </button>
          </div>
        )}
      </main>

      {/* Sepet çubuğu */}
      {cartCount > 0 && !cartOpen && (
        <button type="button" className="sales-cart-bar" onClick={() => setCartOpen(true)}>
          <span className="sales-cart-bar-count">{cartCount}</span>
          <span className="sales-cart-bar-label">Sepeti görüntüle</span>
          <span className="sales-cart-bar-arrow" aria-hidden>→</span>
        </button>
      )}

      {/* Ürün detay modalı */}
      {selected && (
        <div
          className="sales-modal-backdrop"
          onClick={closeProduct}
          role="dialog"
          aria-modal="true"
          aria-label={selected.name}
        >
          <div className="sales-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sales-modal-grab" aria-hidden />
            <button
              type="button"
              className="sales-modal-close"
              aria-label="Kapat"
              onClick={closeProduct}
            >
              ×
            </button>

            {selectedImages.length > 0 ? (
              <div className="sales-modal-gallery">
                <div
                  className="sales-modal-carousel"
                  ref={carouselRef}
                  onScroll={handleCarouselScroll}
                >
                  {selectedImages.map((img) => (
                    <div key={img.id} className="sales-modal-slide">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt={selected.name} />
                    </div>
                  ))}
                </div>
                {selectedImages.length > 1 && (
                  <div className="sales-modal-dots" role="tablist">
                    {selectedImages.map((img, i) => (
                      <button
                        key={img.id}
                        type="button"
                        role="tab"
                        aria-selected={i === activeImage}
                        aria-label={`Resim ${i + 1}`}
                        className={`sales-modal-dot ${i === activeImage ? "is-active" : ""}`}
                        onClick={() => scrollToImage(i)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="sales-modal-media">
                <div className="sales-card-placeholder" aria-hidden>
                  <span>{selected.name.slice(0, 1).toUpperCase()}</span>
                </div>
              </div>
            )}

            <div className="sales-modal-body">
              <p className="sales-card-code">{selected.stockCode}</p>
              <h2 className="sales-modal-name">{selected.name}</h2>
              <div className="sales-modal-tags">
                {selected.group && (
                  <span className="sales-modal-tag">{selected.group}</span>
                )}
                {selected.unit && (
                  <span className="sales-modal-tag">Birim: {selected.unit}</span>
                )}
              </div>
              {showPrices && formatPrice(selected) && (
                <p className="sales-modal-price">{formatPrice(selected)}</p>
              )}
              <button
                type="button"
                className="sales-btn-accent"
                onClick={() => openQtyPrompt(selected)}
              >
                {selectedInCart
                  ? `Sepette ${selectedInCart.qty} adet — değiştir`
                  : "Sepete ekle"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adet girişi */}
      {qtyPrompt && (
        <div className="sales-modal-backdrop sales-qty-backdrop" onClick={() => setQtyPrompt(null)}>
          <form
            className="sales-qty-card"
            onClick={(e) => e.stopPropagation()}
            onSubmit={confirmQty}
          >
            <p className="sales-qty-title">{qtyPrompt.product.name}</p>
            <label className="sales-qty-label" htmlFor="sales-qty-input">
              Kaç adet?
            </label>
            <input
              id="sales-qty-input"
              className="sales-qty-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoFocus
              placeholder="0"
              value={qtyPrompt.value}
              onChange={(e) =>
                setQtyPrompt({
                  ...qtyPrompt,
                  value: e.target.value.replace(/\D/g, "").slice(0, 5),
                })
              }
            />
            <div className="sales-qty-actions">
              <button
                type="button"
                className="sales-btn-ghost"
                onClick={() => setQtyPrompt(null)}
              >
                Vazgeç
              </button>
              <button
                type="submit"
                className="sales-btn-accent"
                disabled={!qtyPrompt.value || Number(qtyPrompt.value) < 1}
              >
                Sepete ekle
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sepet / sipariş paneli */}
      {cartOpen && (
        <div className="sales-modal-backdrop" onClick={closeCart}>
          <div className="sales-modal sales-cart-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sales-modal-grab" aria-hidden />
            <button
              type="button"
              className="sales-modal-close"
              aria-label="Kapat"
              onClick={closeCart}
            >
              ×
            </button>

            {completedOrder ? (
              <div className="sales-order-done">
                <div className="sales-order-check" aria-hidden>✓</div>
                <h2 className="sales-order-title">Sipariş oluşturuldu</h2>
                <p className="sales-order-code-label">Sipariş kodu</p>
                <p className="sales-order-code">{completedOrder.orderCode}</p>
                <p className="sales-order-summary">
                  {completedOrder.itemCount} adet ürün
                  {`${completedOrder.firstName} ${completedOrder.lastName}`.trim() &&
                    ` · ${`${completedOrder.firstName} ${completedOrder.lastName}`.trim()}`}
                </p>
                {shareFeedback && <p className="sales-order-feedback">{shareFeedback}</p>}
                <button type="button" className="sales-btn-accent" onClick={handleShare}>
                  Müşteriyle paylaş
                </button>
                <button type="button" className="sales-btn-ghost" onClick={closeCart}>
                  Kataloğa dön
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitOrder} className="sales-cart-content">
                <h2 className="sales-cart-title">
                  Sepet <span className="sales-cart-title-count">{cartCount} adet</span>
                </h2>

                {cart.length === 0 ? (
                  <p className="sales-empty">Sepet boş.</p>
                ) : (
                  <div className="sales-cart-items">
                    {cart.map((item) => (
                      <div key={item.stockCode} className="sales-cart-item">
                        <div className="sales-cart-item-thumb">
                          {item.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.imageUrl} alt="" />
                          ) : (
                            <span aria-hidden>{item.name.slice(0, 1).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="sales-cart-item-info">
                          <p className="sales-cart-item-name">{item.name}</p>
                          <p className="sales-cart-item-code">{item.stockCode}</p>
                        </div>
                        <input
                          className="sales-cart-item-qty"
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={String(item.qty)}
                          aria-label={`${item.name} adedi`}
                          onChange={(e) =>
                            changeItemQty(
                              item.stockCode,
                              e.target.value.replace(/\D/g, "").slice(0, 5) || "0"
                            )
                          }
                        />
                        <button
                          type="button"
                          className="sales-cart-item-remove"
                          aria-label={`${item.name} sepetten çıkar`}
                          onClick={() => removeItem(item.stockCode)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="sales-cart-form">
                  <label className="sales-cart-field">
                    <span>Müşteri adı soyadı</span>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Boş bırakılabilir"
                      autoComplete="off"
                    />
                  </label>
                  <label className="sales-cart-field">
                    <span>Telefon</span>
                    <input
                      type="tel"
                      inputMode="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Boş bırakılabilir"
                      autoComplete="off"
                    />
                  </label>
                  <label className="sales-cart-field">
                    <span>Siparişi oluşturan</span>
                    <input
                      type="text"
                      value={creatorName}
                      onChange={(e) => setCreatorName(e.target.value)}
                      placeholder="Personel adı (boş bırakılabilir)"
                      autoComplete="off"
                    />
                  </label>
                </div>

                {error && <p className="shift-error">{error}</p>}

                <button
                  type="submit"
                  className="sales-btn-accent"
                  disabled={submitting || cart.length === 0}
                >
                  {submitting ? "Oluşturuluyor…" : "Siparişi oluştur"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
