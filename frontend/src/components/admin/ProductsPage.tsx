"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createProduct,
  deleteProduct,
  fetchProducts,
  updateProduct,
} from "@/lib/admin-api";
import {
  managerCreateProduct,
  managerDeleteProduct,
  managerFetchProducts,
  managerUpdateProduct,
} from "@/lib/manager-api";
import {
  hasPermission,
  type PageSizeOption,
  type PermissionId,
} from "@/lib/permissions";
import type { Product, StockCountState, StockCountStatus } from "@/types/product";
import AdminPagination from "./AdminPagination";
import AdminModal from "./AdminModal";
import AdminIconButton from "./AdminIconButton";
import { IconEdit, IconTrash } from "./AdminIcons";
import NumericField from "@/components/NumericField";
import BarcodeScanner from "@/components/BarcodeScanner";
import { formatNumericInput, parseNumericInput } from "@/lib/numeric-input";

type FormMode = { type: "create" } | { type: "edit"; product: Product };

const emptyProduct = (): Product => ({
  stockCode: "",
  name: "",
  unit: null,
  barcode: null,
  salePrice1: null,
  salePrice2: null,
  purchasePrice1: null,
  purchasePrice2: null,
  remainingQty: null,
  description1: null,
  description2: null,
  group: null,
});

function formatPrice(value: number | null | undefined): string {
  if (value == null) return "—";
  return value.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseNum(value: string): number | null {
  return parseNumericInput(value);
}

function stockCountClass(active: boolean, status?: StockCountStatus): string {
  if (!active) return "";
  if (status === "updated") return "stock-count-row-updated";
  if (status === "unchanged") return "stock-count-row-unchanged";
  return "stock-count-row-pending";
}

function productToForm(p: Product) {
  return {
    stockCode: p.stockCode,
    name: p.name,
    unit: p.unit ?? "",
    barcode: p.barcode ?? "",
    salePrice1: formatNumericInput(p.salePrice1),
    salePrice2: formatNumericInput(p.salePrice2),
    purchasePrice1: formatNumericInput(p.purchasePrice1),
    purchasePrice2: formatNumericInput(p.purchasePrice2),
    remainingQty: formatNumericInput(p.remainingQty),
    description1: p.description1 ?? "",
    description2: p.description2 ?? "",
    group: p.group ?? "",
  };
}

type FormState = ReturnType<typeof productToForm>;

interface ProductsPageProps {
  mode?: "admin" | "employee";
  permissions?: PermissionId[];
}

export default function ProductsPage({
  mode = "admin",
  permissions = [],
}: ProductsPageProps) {
  const isEmployee = mode === "employee";
  const canCreate = !isEmployee || hasPermission(permissions, "products.create");
  const canEdit = !isEmployee || hasPermission(permissions, "products.edit");
  const canDelete = !isEmployee || hasPermission(permissions, "products.delete");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSizeOption>(25);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [form, setForm] = useState<FormState>(productToForm(emptyProduct()));
  const [saving, setSaving] = useState(false);
  const [stockCount, setStockCount] = useState<StockCountState | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        q: debouncedSearch || undefined,
        page,
        pageSize,
      };
      const data = isEmployee
        ? await managerFetchProducts(params)
        : await fetchProducts(params);
      setProducts(data.products);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setStockCount(data.stockCount ?? { active: false, startedAt: null });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Liste yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, pageSize, isEmployee]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setForm(productToForm(emptyProduct()));
    setFormMode({ type: "create" });
  };

  const openEdit = (product: Product) => {
    setForm(productToForm(product));
    setFormMode({ type: "edit", product });
  };

  const closeForm = () => {
    setFormMode(null);
    setForm(productToForm(emptyProduct()));
  };

  const buildProduct = (): Product => ({
    stockCode: form.stockCode.trim(),
    name: form.name.trim(),
    unit: form.unit.trim() || null,
    barcode: form.barcode.trim() || null,
    salePrice1: parseNum(form.salePrice1),
    salePrice2: parseNum(form.salePrice2),
    purchasePrice1: parseNum(form.purchasePrice1),
    purchasePrice2: parseNum(form.purchasePrice2),
    remainingQty: parseNum(form.remainingQty),
    description1: form.description1.trim() || null,
    description2: form.description2.trim() || null,
    group: form.group.trim() || null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMode) return;
    setSaving(true);
    setError(null);

    try {
      const payload = buildProduct();
      if (formMode.type === "create") {
        if (isEmployee) await managerCreateProduct(payload);
        else await createProduct(payload);
      } else {
        if (isEmployee) await managerUpdateProduct(formMode.product.stockCode, payload);
        else await updateProduct(formMode.product.stockCode, payload);
      }
      closeForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`"${product.name}" silinsin mi?`)) return;
    try {
      if (isEmployee) await managerDeleteProduct(product.stockCode);
      else await deleteProduct(product.stockCode);
      if (products.length === 1 && page > 1) setPage((p) => p - 1);
      else await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Silinemedi.");
    }
  };

  const handleBarcodeScan = useCallback(async (code: string) => {
    const q = code.trim();
    if (!q) return;
    setSearch(q);
    setDebouncedSearch(q);
    setPage(1);
  }, []);

  const createButton = canCreate ? (
    <button type="button" onClick={openCreate} className="admin-btn-primary">
      + Yeni ürün
    </button>
  ) : null;

  const countActive = Boolean(stockCount?.active);

  return (
    <div className={`admin-page admin-page-wide${isEmployee ? " employee-page" : ""}`}>
      <div className="admin-toolbar-card">
        <div className="admin-toolbar-search-block">
          <div className="admin-search-row">
            <div className="admin-search-wrap">
              <svg
                className="admin-search-icon"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Stok kodu, barkod, ürün adı veya grup ara…"
                className="admin-input admin-search-input"
                autoComplete="off"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="admin-search-clear"
                  aria-label="Aramayı temizle"
                >
                  ×
                </button>
              )}
            </div>
            <div className="admin-search-scan">
              <BarcodeScanner
                mode="icon"
                variant="default"
                onScan={handleBarcodeScan}
              />
            </div>
          </div>
        </div>
        <div className="admin-toolbar-end">
          {createButton}
          <p className="admin-list-meta">
          {loading ? (
            "Yükleniyor…"
          ) : (
            <>
              <strong>{total.toLocaleString("tr-TR")}</strong> ürün
              {debouncedSearch && (
                <span className="text-zinc-400"> · &quot;{debouncedSearch}&quot;</span>
              )}
            </>
          )}
          </p>
        </div>
      </div>

      {error && !formMode && (
        <div className="admin-alert admin-alert-error mt-4">{error}</div>
      )}

      {countActive && (
        <div className="stock-count-banner" role="status">
          <p className="stock-count-banner-title">Stok sayımı aktif</p>
          <p className="stock-count-banner-desc">
            <span className="stock-count-legend-item stock-count-legend-pending">Kontrol edilmedi</span>
            <span className="stock-count-legend-item stock-count-legend-updated">Güncellendi</span>
            <span className="stock-count-legend-item stock-count-legend-unchanged">Değişiklik yok</span>
          </p>
        </div>
      )}

      {loading ? (
        <div className="admin-skeleton mt-4">Ürünler yükleniyor…</div>
      ) : products.length === 0 ? (
        <div className="admin-card mt-4 text-center">
          <p className="text-sm text-zinc-600">
            {debouncedSearch ? "Aramanızla eşleşen ürün yok." : "Henüz ürün yok."}
          </p>
          {canCreate && (
            <button
              type="button"
              onClick={openCreate}
              className="admin-link mt-3 text-sm font-semibold"
            >
              İlk ürünü ekle
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="admin-table-wrap mt-4 hidden lg:block">
            <table className="admin-table admin-table-products">
              <thead>
                <tr>
                  <th>Stok kodu</th>
                  <th>Ürün adı</th>
                  <th>Barkod</th>
                  <th className="text-right">Satış 1</th>
                  <th className="text-right">Satış 2</th>
                  <th className="text-right">Alış 1</th>
                  <th>Grup</th>
                  <th className="text-right">Stok</th>
                  {(canEdit || canDelete) && <th className="text-right">İşlem</th>}
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr
                    key={p.stockCode}
                    className={stockCountClass(countActive, p.countStatus) || undefined}
                  >
                    <td className="font-mono text-xs font-medium text-zinc-800">
                      {p.stockCode}
                    </td>
                    <td className="max-w-[12rem] font-medium text-zinc-900">
                      <span className="line-clamp-2">{p.name}</span>
                    </td>
                    <td className="font-mono text-xs text-zinc-600">{p.barcode ?? "—"}</td>
                    <td className="text-right tabular-nums">{formatPrice(p.salePrice1)}</td>
                    <td className="text-right tabular-nums">{formatPrice(p.salePrice2)}</td>
                    <td className="text-right tabular-nums text-zinc-500">
                      {formatPrice(p.purchasePrice1)}
                    </td>
                    <td className="text-sm text-zinc-600">{p.group ?? "—"}</td>
                    <td className="text-right tabular-nums text-sm">
                      {p.remainingQty != null ? p.remainingQty.toLocaleString("tr-TR") : "—"}
                    </td>
                    {(canEdit || canDelete) && (
                      <td>
                        <div className="admin-action-icons">
                          {canEdit && (
                            <AdminIconButton label="Düzenle" onClick={() => openEdit(p)}>
                              <IconEdit />
                            </AdminIconButton>
                          )}
                          {canDelete && (
                            <AdminIconButton
                              label="Sil"
                              variant="danger"
                              onClick={() => void handleDelete(p)}
                            >
                              <IconTrash />
                            </AdminIconButton>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 space-y-3 lg:hidden">
            {products.map((p) => (
              <article
                key={p.stockCode}
                className={`admin-product-card ${stockCountClass(countActive, p.countStatus)}`.trim()}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-900">{p.name}</p>
                    <p className="mt-0.5 font-mono text-xs text-zinc-500">{p.stockCode}</p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-accent">
                    {formatPrice(p.salePrice1)} ₺
                  </p>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-zinc-600">
                  <div>
                    <dt className="text-zinc-400">Barkod</dt>
                    <dd className="font-mono">{p.barcode ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-400">Grup</dt>
                    <dd>{p.group ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-400">Satış 2</dt>
                    <dd className="tabular-nums">{formatPrice(p.salePrice2)}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-400">Stok</dt>
                    <dd className="tabular-nums">
                      {p.remainingQty != null ? p.remainingQty.toLocaleString("tr-TR") : "—"}
                    </dd>
                  </div>
                </dl>
                {(canEdit || canDelete) && (
                  <div className="admin-action-icons mt-3 border-t border-zinc-100 pt-3">
                    {canEdit && (
                      <AdminIconButton label="Düzenle" onClick={() => openEdit(p)}>
                        <IconEdit />
                      </AdminIconButton>
                    )}
                    {canDelete && (
                      <AdminIconButton
                        label="Sil"
                        variant="danger"
                        onClick={() => void handleDelete(p)}
                      >
                        <IconTrash />
                      </AdminIconButton>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>

          <AdminPagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </>
      )}

      {formMode && (
        <AdminModal
          open
          onClose={closeForm}
          size="lg"
          title={formMode.type === "create" ? "Yeni ürün" : "Ürünü düzenle"}
          description={
            formMode.type === "create"
              ? "Kataloga tek tek yeni ürün ekleyin."
              : "Ürün bilgilerini güncelleyin ve kaydedin."
          }
        >
          <form onSubmit={handleSubmit} className="admin-modal-form">
            <div className="admin-modal-body">
              <div className="admin-form-grid">
                <div>
                  <label className="admin-label">Stok kodu *</label>
                  <input
                    className="admin-input font-mono text-sm"
                    value={form.stockCode}
                    onChange={(e) => setForm((f) => ({ ...f, stockCode: e.target.value }))}
                    required
                    readOnly={formMode.type === "edit"}
                    disabled={formMode.type === "edit"}
                  />
                </div>
                <div className="admin-form-grid-full">
                  <label className="admin-label">Ürün adı *</label>
                  <input
                    className="admin-input"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="admin-label">Barkod</label>
                  <input
                    className="admin-input font-mono text-sm"
                    value={form.barcode}
                    onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="admin-label">Birim</label>
                  <input
                    className="admin-input"
                    value={form.unit}
                    onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                    placeholder="Adet, Kg…"
                  />
                </div>
                <NumericField
                  label="Satış fiyatı 1"
                  value={form.salePrice1}
                  onChange={(salePrice1) => setForm((f) => ({ ...f, salePrice1 }))}
                  placeholder="115 veya 115,50"
                />
                <NumericField
                  label="Satış fiyatı 2"
                  value={form.salePrice2}
                  onChange={(salePrice2) => setForm((f) => ({ ...f, salePrice2 }))}
                  placeholder="115 veya 115,50"
                />
                <NumericField
                  label="Alış fiyatı 1"
                  value={form.purchasePrice1}
                  onChange={(purchasePrice1) => setForm((f) => ({ ...f, purchasePrice1 }))}
                  placeholder="90 veya 90,25"
                />
                <NumericField
                  label="Alış fiyatı 2"
                  value={form.purchasePrice2}
                  onChange={(purchasePrice2) => setForm((f) => ({ ...f, purchasePrice2 }))}
                  placeholder="90 veya 90,25"
                />
                <NumericField
                  label="Kalan miktar"
                  value={form.remainingQty}
                  onChange={(remainingQty) => setForm((f) => ({ ...f, remainingQty }))}
                  placeholder="10 veya 2,5"
                />
                <div>
                  <label className="admin-label">Grup</label>
                  <input
                    className="admin-input"
                    value={form.group}
                    onChange={(e) => setForm((f) => ({ ...f, group: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="admin-label">Açıklama 1</label>
                  <input
                    className="admin-input"
                    value={form.description1}
                    onChange={(e) => setForm((f) => ({ ...f, description1: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="admin-label">Açıklama 2</label>
                  <input
                    className="admin-input"
                    value={form.description2}
                    onChange={(e) => setForm((f) => ({ ...f, description2: e.target.value }))}
                  />
                </div>
              </div>

              {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
            </div>

            <div className="admin-modal-footer">
              <button type="button" onClick={closeForm} className="admin-btn-secondary">
                İptal
              </button>
              <button type="submit" disabled={saving} className="admin-btn-primary">
                {saving ? "Kaydediliyor…" : "Kaydet"}
              </button>
            </div>
          </form>
        </AdminModal>
      )}
    </div>
  );
}
