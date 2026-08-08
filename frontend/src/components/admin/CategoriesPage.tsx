"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  renameCategory,
} from "@/lib/admin-api";
import type { ProductCategory } from "@/types/product";
import AdminPageHeader from "./AdminPageHeader";
import AdminIconButton from "./AdminIconButton";
import { IconEdit, IconTrash } from "./AdminIcons";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCategories(await fetchCategories());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kategoriler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      setCategories(await createCategory(newName));
      setNewName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kategori eklenemedi.");
    } finally {
      setSaving(false);
    }
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !editing.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      setCategories(await renameCategory(editing.id, editing.name));
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kategori güncellenemedi.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category: ProductCategory) => {
    const count = category.productCount ?? 0;
    const message =
      count > 0
        ? `"${category.name}" kategorisi silinsin mi?\n\n${count} ürünün bu kategoriyle bağlantısı kaldırılacak. Ürünler silinmez.`
        : `"${category.name}" kategorisi silinsin mi?`;
    if (!confirm(message)) return;
    setError(null);
    try {
      setCategories(await deleteCategory(category.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kategori silinemedi.");
    }
  };

  return (
    <div className="admin-page admin-page-wide">
      <AdminPageHeader
        title="Katalog kategorileri"
        description="Satış kataloğunda kullanılacak kategorileri oluşturun. Bir ürün birden fazla kategoride yer alabilir; kategori silindiğinde ürünler silinmez, yalnızca bağlantıları kaldırılır."
      />

      <section className="admin-card settings-section mt-4">
        <form onSubmit={handleCreate} className="closed-days-form">
          <input
            type="text"
            className="admin-input"
            placeholder="Yeni kategori adı (örn. Mutfak Ürünleri)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={60}
            required
          />
          <button
            type="submit"
            className="admin-btn-primary"
            disabled={saving || !newName.trim()}
          >
            {saving ? "Ekleniyor…" : "Kategori ekle"}
          </button>
        </form>

        {error && <div className="admin-alert admin-alert-error mt-3">{error}</div>}

        {loading ? (
          <p className="admin-muted mt-4 text-sm">Yükleniyor…</p>
        ) : categories.length === 0 ? (
          <p className="admin-muted mt-4 text-sm">
            Henüz kategori yok. Yukarıdan ilk kategoriyi ekleyin.
          </p>
        ) : (
          <ul className="category-list mt-4">
            {categories.map((category) => (
              <li key={category.id} className="category-row">
                {editing?.id === category.id ? (
                  <form onSubmit={handleRename} className="category-edit-form">
                    <input
                      className="admin-input"
                      value={editing.name}
                      onChange={(e) =>
                        setEditing((c) => (c ? { ...c, name: e.target.value } : c))
                      }
                      maxLength={60}
                      autoFocus
                      required
                    />
                    <button type="submit" className="admin-btn-primary" disabled={saving}>
                      Kaydet
                    </button>
                    <button
                      type="button"
                      className="admin-btn-secondary"
                      onClick={() => setEditing(null)}
                    >
                      İptal
                    </button>
                  </form>
                ) : (
                  <>
                    <span className="category-name">{category.name}</span>
                    <span className="category-count">
                      {category.productCount ?? 0} ürün
                    </span>
                    <div className="admin-action-icons ml-auto">
                      <AdminIconButton
                        label="Adını değiştir"
                        onClick={() => setEditing({ id: category.id, name: category.name })}
                      >
                        <IconEdit />
                      </AdminIconButton>
                      <AdminIconButton
                        label="Sil"
                        variant="danger"
                        onClick={() => void handleDelete(category)}
                      >
                        <IconTrash />
                      </AdminIconButton>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
