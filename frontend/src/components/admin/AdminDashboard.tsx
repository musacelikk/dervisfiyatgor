"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchEmployees } from "@/lib/admin-api";
import { getHealth } from "@/lib/api";
import { IconStock, IconStore, IconUsers } from "./AdminIcons";

export default function AdminDashboard() {
  const [productCount, setProductCount] = useState<number | null>(null);
  const [employeeCount, setEmployeeCount] = useState<number | null>(null);
  const [apiOnline, setApiOnline] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const [health, employees] = await Promise.all([getHealth(), fetchEmployees()]);
        setProductCount(health.productCount);
        setEmployeeCount(employees.filter((e) => e.active).length);
        setApiOnline(true);
      } catch {
        setProductCount(null);
        setEmployeeCount(null);
        setApiOnline(false);
      }
    })();
  }, []);

  return (
    <div className="admin-page">
      <div className="admin-dashboard-head">
        <span
          className={`admin-status-pill ${apiOnline ? "admin-status-pill-ok" : "admin-status-pill-off"}`}
        >
          <span className="admin-status-dot" />
          {apiOnline ? "Sistem çevrimiçi" : "Backend bağlantısı yok"}
        </span>
      </div>

      {!apiOnline && (
        <div className="admin-alert admin-alert-error">Backend&apos;e bağlanılamıyor.</div>
      )}

      <div className="admin-stats-grid">
        <Link href="/admin/stok" className="admin-stat-card admin-stat-card-featured">
          <div className="admin-stat-card-top">
            <div>
              <p className="admin-stat-label">Stok</p>
              <p className="admin-stat-value">
                {productCount === null ? "—" : productCount.toLocaleString("tr-TR")}
              </p>
              <p className="admin-stat-hint">kayıtlı ürün</p>
            </div>
            <div className="admin-stat-icon admin-stat-icon-red">
              <IconStock />
            </div>
          </div>
          <span className="admin-stat-link">Stok yönet →</span>
        </Link>

        <Link href="/admin/personel" className="admin-stat-card">
          <div className="admin-stat-card-top">
            <div>
              <p className="admin-stat-label">Personel</p>
              <p className="admin-stat-value">
                {employeeCount === null ? "—" : employeeCount.toLocaleString("tr-TR")}
              </p>
              <p className="admin-stat-hint">aktif hesap</p>
            </div>
            <div className="admin-stat-icon">
              <IconUsers />
            </div>
          </div>
          <span className="admin-stat-link">Personeli yönet →</span>
        </Link>

        <Link href="/" className="admin-stat-card">
          <div className="admin-stat-card-top">
            <div>
              <p className="admin-stat-label">Mağaza</p>
              <p className="admin-stat-value admin-stat-value-sm">Barkod ekranı</p>
              <p className="admin-stat-hint">müşteri arayüzü</p>
            </div>
            <div className="admin-stat-icon">
              <IconStore />
            </div>
          </div>
          <span className="admin-stat-link">Mağazayı aç →</span>
        </Link>
      </div>

      <div className="admin-dashboard-grid">
        <section className="admin-card">
          <h2 className="admin-card-title">Hızlı işlemler</h2>
          <div className="admin-quick-grid">
            <Link href="/admin/stok/urunler" className="admin-quick-tile">
              <span className="admin-quick-tile-title">Ürün listesi</span>
              <span className="admin-quick-tile-desc">Ara, ekle, düzenle veya sil</span>
            </Link>
            <Link href="/admin/stok/katalog" className="admin-quick-tile">
              <span className="admin-quick-tile-title">Excel içe aktar</span>
              <span className="admin-quick-tile-desc">Toplu yükleme ve indirme</span>
            </Link>
            <Link href="/admin/personel" className="admin-quick-tile">
              <span className="admin-quick-tile-title">Personel ekle</span>
              <span className="admin-quick-tile-desc">Yetkili çalışan hesabı</span>
            </Link>
            <Link href="/admin/sepet" className="admin-quick-tile">
              <span className="admin-quick-tile-title">Sepet yönetimi</span>
              <span className="admin-quick-tile-desc">Mağaza sepetleri</span>
            </Link>
            <Link href="/admin/loglar" className="admin-quick-tile">
              <span className="admin-quick-tile-title">Loglar</span>
              <span className="admin-quick-tile-desc">İşlem kayıtları</span>
            </Link>
            <Link href="/admin/ayarlar" className="admin-quick-tile">
              <span className="admin-quick-tile-title">Ayarlar</span>
              <span className="admin-quick-tile-desc">Mağaza yapılandırması</span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
