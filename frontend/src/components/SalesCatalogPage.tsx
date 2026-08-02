"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import BrandLogo from "@/components/BrandLogo";
import type {
  CatalogListResult,
  CatalogProduct,
  ProductImage,
} from "@/types/product";
import { productSalePrice, formatStorePrice } from "@/lib/store-format";

function formatPrice(product: CatalogProduct): string {
  const price = productSalePrice(product);
  return price == null ? "—" : formatStorePrice(price);
}

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
  const shellRef = useRef<HTMLDivElement>(null);

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
        const res = await fetch(`/api/catalog?${params}`, {
          signal: ctrl.signal,
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            typeof body.error === "string" ? body.error : "Katalog yüklenemedi."
          );
        }
        const result = body as CatalogListResult;
        setMeta(result);
        setItems((prev) =>
          append ? [...prev, ...result.products] : result.products
        );
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

  const openProduct = (product: CatalogProduct) => {
    setSelected(product);
    setActiveImage(0);
  };

  const closeProduct = useCallback(() => setSelected(null), []);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeProduct();
    };
    document.addEventListener("keydown", onKey);
    const shell = shellRef.current;
    if (shell) shell.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      if (shell) shell.style.overflow = "";
    };
  }, [selected, closeProduct]);

  const total = meta?.total ?? 0;
  const hasMore = meta ? page < meta.totalPages : false;
  const selectedImages: ProductImage[] = selected?.images ?? [];
  const selectedImageUrl =
    selectedImages[activeImage]?.url ?? selected?.imageUrl ?? null;

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
          <svg
            className="sales-search-icon"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden
          >
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

      <main className="sales-main">
        {error && <div className="admin-alert admin-alert-error">{error}</div>}

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
            {items.map((p) => (
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
                    <span className="sales-card-badge">
                      {p.images!.length} resim
                    </span>
                  )}
                </div>
                <div className="sales-card-body">
                  <p className="sales-card-code">{p.stockCode}</p>
                  <h2 className="sales-card-name">{p.name}</h2>
                  {p.group && <p className="sales-card-group">{p.group}</p>}
                  <p className="sales-card-price">{formatPrice(p)}</p>
                </div>
              </article>
            ))}
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
            <div className="sales-modal-media">
              {selectedImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selectedImageUrl} alt={selected.name} />
              ) : (
                <div className="sales-card-placeholder" aria-hidden>
                  <span>{selected.name.slice(0, 1).toUpperCase()}</span>
                </div>
              )}
            </div>
            {selectedImages.length > 1 && (
              <div className="sales-modal-thumbs">
                {selectedImages.map((img, i) => (
                  <button
                    key={img.id}
                    type="button"
                    className={
                      i === activeImage
                        ? "sales-modal-thumb is-active"
                        : "sales-modal-thumb"
                    }
                    aria-label={`Resim ${i + 1}`}
                    onClick={() => setActiveImage(i)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="" />
                  </button>
                ))}
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
              <p className="sales-modal-price">{formatPrice(selected)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
