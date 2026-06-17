"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminModal from "./AdminModal";
import {
  deleteManagerOrder,
  deleteOrder,
  fetchManagerOrders,
  fetchOrders,
  formatOrderDate,
  formatOrderMoney,
  updateManagerOrderStatus,
  updateOrderStatus,
} from "@/lib/orders-api";
import { downloadOrderPDF } from "@/lib/pdf-order";
import {
  ORDER_STATUS_CLASSES,
  ORDER_STATUS_LABELS,
  type Order,
  type OrderStatus,
} from "@/types/order";

type OrdersPageProps = {
  mode?: "admin" | "manager";
};

type StatusFilter = "all" | OrderStatus;

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "Tümü" },
  { id: "pending", label: "Bekleyen" },
  { id: "completed", label: "Tamamlandı" },
  { id: "cancelled", label: "İptal" },
];

function customerName(order: Order): string {
  return `${order.firstName} ${order.lastName}`.trim();
}

function customerInitials(order: Order): string {
  const a = order.firstName.trim()[0] ?? "";
  const b = order.lastName.trim()[0] ?? "";
  return (a + b).toUpperCase() || "?";
}

function formatOrderCardDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function OrdersPage({ mode = "admin" }: OrdersPageProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Order | null>(null);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = mode === "manager" ? await fetchManagerOrders() : await fetchOrders();
      setOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Siparişler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    void load();
  }, [load]);

  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const completedCount = orders.filter((o) => o.status === "completed").length;

  const filteredOrders = useMemo(() => {
    if (statusFilter === "all") return orders;
    return orders.filter((o) => o.status === statusFilter);
  }, [orders, statusFilter]);

  const updateOrder = async (orderId: number, status: OrderStatus) => {
    return mode === "manager"
      ? updateManagerOrderStatus(orderId, status)
      : updateOrderStatus(orderId, status);
  };

  const removeOrder = async (orderId: number) => {
    return mode === "manager" ? deleteManagerOrder(orderId) : deleteOrder(orderId);
  };

  const handleDelete = async () => {
    if (!selected) return;
    const label = selected.orderCode || `#${selected.id}`;
    const customer = customerName(selected);
    if (
      !confirm(
        `${label} numaralı siparişi${customer ? ` (${customer})` : ""} kalıcı olarak silmek istediğinize emin misiniz?`
      )
    ) {
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      await removeOrder(selected.id);
      setOrders((prev) => prev.filter((o) => o.id !== selected.id));
      setSelected(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sipariş silinemedi.");
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusChange = async (status: OrderStatus) => {
    if (!selected) return;
    setUpdating(true);
    setError(null);
    try {
      const updated = await updateOrder(selected.id, status);
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      setSelected(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Durum güncellenemedi.");
    } finally {
      setUpdating(false);
    }
  };

  const handleDownloadPDF = async (order: Order) => {
    setPdfLoading(true);
    try {
      await downloadOrderPDF({ order });
    } finally {
      setPdfLoading(false);
    }
  };

  const handleQuickComplete = async (order: Order) => {
    setUpdating(true);
    setError(null);
    try {
      const updated = await updateOrder(order.id, "completed");
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      if (selected?.id === order.id) setSelected(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Durum güncellenemedi.");
    } finally {
      setUpdating(false);
    }
  };

  const renderOrderCard = (order: Order) => (
    <article
      key={order.id}
      className={`admin-order-card admin-order-card--${order.status}`}
      role="button"
      tabIndex={0}
      onClick={() => setSelected(order)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setSelected(order);
        }
      }}
    >
      <div className="admin-order-card-inner">
        <div className="admin-order-card-top">
          <div className="admin-order-card-avatar" aria-hidden>
            {customerInitials(order)}
          </div>
          <div className="admin-order-card-info">
            <p className="admin-order-card-customer">{customerName(order)}</p>
            {order.phone ? (
              <p className="admin-order-card-phone">{order.phone}</p>
            ) : null}
            <p className="admin-order-card-id">
              {order.orderCode ?? `#${order.id}`}
            </p>
          </div>
          <span className={`admin-order-status ${ORDER_STATUS_CLASSES[order.status]}`}>
            {ORDER_STATUS_LABELS[order.status]}
          </span>
        </div>

        <div className="admin-order-card-metrics">
          <div className="admin-order-metric">
            <span className="admin-order-metric-label">Ürün</span>
            <span className="admin-order-metric-value">{order.itemCount}</span>
          </div>
          <div className="admin-order-metric admin-order-metric-total">
            <span className="admin-order-metric-label">Toplam</span>
            <span className="admin-order-metric-value">{formatOrderMoney(order.totalAmount)}</span>
          </div>
        </div>

        <div className="admin-order-card-footer">
          <time className="admin-order-card-date">{formatOrderCardDate(order.createdAt)}</time>
          <div className="admin-order-card-actions">
            {order.status === "pending" && (
              <button
                type="button"
                className="admin-order-card-complete"
                disabled={updating}
                onClick={(e) => {
                  e.stopPropagation();
                  void handleQuickComplete(order);
                }}
              >
                Tamamlandı
              </button>
            )}
            <span className="admin-order-card-chevron" aria-hidden>
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path
                  fillRule="evenodd"
                  d="M7.21 14.77a.75.75 0 01.02-1.06L10.94 10 7.23 6.29a.75.75 0 111.06-1.06l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06 0z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </article>
  );

  return (
    <div className={`admin-page admin-page-wide admin-orders-page${mode === "manager" ? " employee-page" : ""}`}>
      <div className="admin-orders-toolbar">
        <div className="admin-orders-filters" role="tablist" aria-label="Sipariş filtresi">
          {STATUS_FILTERS.map((filter) => {
            const count =
              filter.id === "all"
                ? orders.length
                : orders.filter((o) => o.status === filter.id).length;
            return (
              <button
                key={filter.id}
                type="button"
                role="tab"
                aria-selected={statusFilter === filter.id}
                className={`admin-orders-filter${statusFilter === filter.id ? " admin-orders-filter-active" : ""}`}
                onClick={() => setStatusFilter(filter.id)}
              >
                {filter.label}
                <span className="admin-orders-filter-count">{count}</span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="admin-orders-refresh"
          onClick={() => void load()}
          disabled={loading}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
            <path
              fillRule="evenodd"
              d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466 5.5 5.5 0 010-7.966 5.5 5.5 0 017.519-1.24.75.75 0 111.06 1.06 4 4 0 00-5.64 5.64 4 4 0 006.12-1.04.75.75 0 011.18.92 5.5 5.5 0 01-1.569 1.12z"
              clipRule="evenodd"
            />
          </svg>
          Yenile
        </button>
      </div>

      {error && <div className="admin-alert admin-alert-error">{error}</div>}

      <div className="admin-orders-stats">
        <div className="admin-orders-stat">
          <div className="admin-orders-stat-icon admin-orders-stat-icon-all">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <p className="admin-orders-stat-label">Toplam sipariş</p>
            <p className="admin-orders-stat-value">{orders.length}</p>
          </div>
        </div>
        <div className="admin-orders-stat admin-orders-stat-featured">
          <div className="admin-orders-stat-icon admin-orders-stat-icon-pending">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="admin-orders-stat-label">Bekleyen</p>
            <p className="admin-orders-stat-value">{pendingCount}</p>
          </div>
        </div>
        <div className="admin-orders-stat">
          <div className="admin-orders-stat-icon admin-orders-stat-icon-done">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="admin-orders-stat-label">Tamamlanan</p>
            <p className="admin-orders-stat-value">{completedCount}</p>
          </div>
        </div>
      </div>

      <section className="admin-orders-section">
        <div className="admin-orders-section-head">
          <h2 className="admin-orders-section-title">Siparişler</h2>
          <span className="admin-orders-section-count">{filteredOrders.length} kayıt</span>
        </div>

        {loading ? (
          <div className="admin-order-cards">
            {[0, 1, 2].map((i) => (
              <div key={i} className="admin-order-skeleton" aria-hidden />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="admin-orders-empty">
            <div className="admin-orders-empty-icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="admin-orders-empty-title">
              {statusFilter === "all" ? "Henüz sipariş yok" : "Bu filtrede sipariş yok"}
            </p>
            <p className="admin-orders-empty-desc">
              Mağaza müşterileri sepete ürün ekleyip sipariş oluşturduğunda burada görünür.
            </p>
          </div>
        ) : (
          <>
            <div className="admin-table-wrap admin-orders-table-wrap hidden lg:block">
              <table className="admin-table admin-table-orders">
                <thead>
                  <tr>
                    <th>Kod</th>
                    <th>Müşteri</th>
                    <th>Telefon</th>
                    <th>Ürün</th>
                    <th>Tutar</th>
                    <th>Durum</th>
                    <th>Tarih</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="admin-table-row-clickable"
                      onClick={() => setSelected(order)}
                    >
                      <td className="admin-table-id">{order.orderCode ?? `#${order.id}`}</td>
                      <td className="font-medium text-zinc-900">{customerName(order)}</td>
                      <td>{order.phone ?? "—"}</td>
                      <td>{order.itemCount}</td>
                      <td className="admin-table-money">{formatOrderMoney(order.totalAmount)}</td>
                      <td>
                        <span className={`admin-order-status ${ORDER_STATUS_CLASSES[order.status]}`}>
                          {ORDER_STATUS_LABELS[order.status]}
                        </span>
                      </td>
                      <td className="admin-table-date">{formatOrderDate(order.createdAt)}</td>
                      <td>
                        <button
                          type="button"
                          className="admin-order-pdf-btn"
                          disabled={pdfLoading}
                          title="PDF İndir"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDownloadPDF(order);
                          }}
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="admin-order-cards lg:hidden">{filteredOrders.map(renderOrderCard)}</div>
          </>
        )}
      </section>

      <AdminModal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `Sipariş ${selected.orderCode ?? `#${selected.id}`}` : ""}
        description={selected ? customerName(selected) : undefined}
        size="lg"
      >
        {selected && (
          <>
            <div className="admin-modal-body admin-order-detail">
              <div className="admin-order-detail-meta">
                <span className={`admin-order-status ${ORDER_STATUS_CLASSES[selected.status]}`}>
                  {ORDER_STATUS_LABELS[selected.status]}
                </span>
                <time className="admin-order-detail-date">{formatOrderDate(selected.createdAt)}</time>
              </div>

              {selected.phone && (
                <a href={`tel:${selected.phone}`} className="admin-order-phone">
                  {selected.phone}
                </a>
              )}

              <p className="admin-order-section-label">
                Ürünler <span>({selected.itemCount})</span>
              </p>

              <ul className="admin-order-items">
                {selected.items.map((item) => (
                  <li key={item.id} className="admin-order-item">
                    <div className="admin-order-item-main">
                      <p className="admin-order-item-name">{item.productName}</p>
                      <p className="admin-order-item-meta">
                        {item.stockCode}
                        {item.salePrice != null && (
                          <>
                            {" · "}
                            Birim {formatOrderMoney(item.salePrice)}
                          </>
                        )}
                        {" · "}
                        {item.quantity} adet
                      </p>
                    </div>
                    <div className="admin-order-item-prices">
                      <p className="admin-order-item-total">{formatOrderMoney(item.lineTotal)}</p>
                      {item.salePrice != null && item.quantity > 1 && (
                        <p className="admin-order-item-calc">
                          {formatOrderMoney(item.salePrice)} × {item.quantity}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              <div className="admin-order-total">
                <span>Toplam</span>
                <strong>{formatOrderMoney(selected.totalAmount)}</strong>
              </div>

              {selected.status === "completed" && (
                <p className="admin-order-done-banner">Bu sipariş tamamlandı.</p>
              )}
              {selected.status === "cancelled" && (
                <p className="admin-order-cancelled-banner">Bu sipariş iptal edildi.</p>
              )}
            </div>

            <div className="admin-modal-footer admin-order-modal-footer">
              {selected.status === "pending" && (
                <>
                  <button
                    type="button"
                    disabled={updating || deleting}
                    className="admin-order-complete-btn"
                    onClick={() => void handleStatusChange("completed")}
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {updating ? "Kaydediliyor…" : "Tamamlandı"}
                  </button>
                  <button
                    type="button"
                    disabled={updating || deleting}
                    className="admin-order-cancel-btn"
                    onClick={() => void handleStatusChange("cancelled")}
                  >
                    İptal et
                  </button>
                </>
              )}
              <button
                type="button"
                className="admin-order-pdf-btn admin-order-pdf-btn-modal"
                disabled={pdfLoading || deleting}
                onClick={() => void handleDownloadPDF(selected)}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {pdfLoading ? "Hazırlanıyor…" : "PDF İndir"}
              </button>
              <button
                type="button"
                className="admin-order-delete-btn"
                disabled={updating || deleting}
                onClick={() => void handleDelete()}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {deleting ? "Siliniyor…" : "Siparişi sil"}
              </button>
            </div>
          </>
        )}
      </AdminModal>
    </div>
  );
}
