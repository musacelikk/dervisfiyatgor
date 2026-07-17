"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createExpense,
  createExpenseCategory,
  createExpensePerson,
  deleteExpense,
  deleteExpenseCategory,
  deleteExpensePerson,
  fetchExpenseCategories,
  fetchExpensePeople,
  fetchExpenses,
  updateExpense,
  updateExpenseCategory,
  updateExpensePerson,
} from "@/lib/expense-api";
import {
  DEFAULT_EXPENSE_COLOR,
  EXPENSE_CATEGORY_ICONS,
  EXPENSE_COLORS,
  EXPENSE_PERSON_ICONS,
  ExpenseIcon,
} from "@/lib/expense-icons";
import type { Expense, ExpenseCategory, ExpensePerson } from "@/types/expense";
import AdminPageHeader from "./AdminPageHeader";
import AdminModal from "./AdminModal";
import AdminIconButton from "./AdminIconButton";
import { IconEdit, IconTrash } from "./AdminIcons";

type NamedItem = ExpenseCategory | ExpensePerson;
type ManagerKind = "category" | "person";

type ExpenseFormState = {
  description: string;
  amount: string;
  categoryId: number | null;
  personId: number | null;
  paidAt: string;
};

const MANAGER_META: Record<
  ManagerKind,
  { title: string; addLabel: string; icons: typeof EXPENSE_CATEGORY_ICONS }
> = {
  category: {
    title: "Kategoriler",
    addLabel: "Kategori adı (örn. Mutfak, Yakıt…)",
    icons: EXPENSE_CATEGORY_ICONS,
  },
  person: {
    title: "Kişiler",
    addLabel: "Kişi adı (örn. Ahmet, Patron…)",
    icons: EXPENSE_PERSON_ICONS,
  },
};

function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function parseAmount(raw: string): number | null {
  const cleaned = raw.trim().replace(/\./g, "").replace(",", ".");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

const currencyFmt = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  minimumFractionDigits: 2,
});

function formatAmount(amount: number | null): string {
  return amount == null ? "—" : currencyFmt.format(amount);
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const [y, m, d] = value.split("-");
  if (!y || !m || !d) return value;
  return `${d}.${m}.${y}`;
}

function ItemBadge({
  item,
  size = "md",
}: {
  item: NamedItem | undefined;
  size?: "sm" | "md";
}) {
  if (!item) return <span className="text-zinc-400">—</span>;
  const color = item.color || DEFAULT_EXPENSE_COLOR;
  return (
    <span
      className={`expense-badge ${size === "sm" ? "expense-badge-sm" : ""}`}
      style={{ backgroundColor: `${color}1a`, color }}
    >
      <ExpenseIcon icon={item.icon} className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
      <span className="expense-badge-name">{item.name}</span>
    </span>
  );
}

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="expense-color-grid">
      {EXPENSE_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          className={`expense-color-swatch ${value === color ? "expense-color-swatch-active" : ""}`}
          style={{ backgroundColor: color }}
          aria-label={`Renk ${color}`}
          aria-pressed={value === color}
          onClick={() => onChange(color)}
        />
      ))}
    </div>
  );
}

function IconPicker({
  icons,
  value,
  color,
  onChange,
}: {
  icons: typeof EXPENSE_CATEGORY_ICONS;
  value: string;
  color: string;
  onChange: (icon: string) => void;
}) {
  return (
    <div className="expense-icon-grid">
      {icons.map((icon) => {
        const active = value === icon.id;
        return (
          <button
            key={icon.id}
            type="button"
            title={icon.label}
            aria-pressed={active}
            className={`expense-icon-option ${active ? "expense-icon-option-active" : ""}`}
            style={active ? { borderColor: color, color } : undefined}
            onClick={() => onChange(icon.id)}
          >
            <ExpenseIcon icon={icon.id} className="h-5 w-5" />
          </button>
        );
      })}
    </div>
  );
}

function ChipSelect({
  items,
  value,
  onChange,
  emptyText,
  onManage,
}: {
  items: NamedItem[];
  value: number | null;
  onChange: (id: number | null) => void;
  emptyText: string;
  onManage: () => void;
}) {
  return (
    <div className="expense-chip-row">
      {items.length === 0 && <span className="text-xs text-zinc-500">{emptyText}</span>}
      {items.map((item) => {
        const active = value === item.id;
        const color = item.color || DEFAULT_EXPENSE_COLOR;
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={active}
            className={`expense-chip ${active ? "expense-chip-active" : ""}`}
            style={
              active
                ? { backgroundColor: `${color}1a`, borderColor: color, color }
                : undefined
            }
            onClick={() => onChange(active ? null : item.id)}
          >
            <ExpenseIcon icon={item.icon} className="h-4 w-4" />
            <span>{item.name}</span>
          </button>
        );
      })}
      <button type="button" className="expense-chip expense-chip-add" onClick={onManage}>
        + Yeni
      </button>
    </div>
  );
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [people, setPeople] = useState<ExpensePerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Gider formu
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState<ExpenseFormState>({
    description: "",
    amount: "",
    categoryId: null,
    personId: null,
    paidAt: todayISO(),
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Kategori / kişi yönetimi
  const [manager, setManager] = useState<ManagerKind | null>(null);
  const [managerEditing, setManagerEditing] = useState<NamedItem | null>(null);
  const [managerName, setManagerName] = useState("");
  const [managerColor, setManagerColor] = useState<string>(EXPENSE_COLORS[0]);
  const [managerIcon, setManagerIcon] = useState<string>("");
  const [managerSaving, setManagerSaving] = useState(false);
  const [managerError, setManagerError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [expensesData, categoriesData, peopleData] = await Promise.all([
        fetchExpenses(),
        fetchExpenseCategories(),
        fetchExpensePeople(),
      ]);
      setExpenses(expensesData);
      setCategories(categoriesData);
      setPeople(peopleData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Giderler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const categoryById = useMemo(
    () => new Map(categories.map((cat) => [cat.id, cat])),
    [categories]
  );
  const personById = useMemo(
    () => new Map(people.map((person) => [person.id, person])),
    [people]
  );

  const totalAll = useMemo(
    () => expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0),
    [expenses]
  );
  const totalThisMonth = useMemo(() => {
    const prefix = todayISO().slice(0, 7);
    return expenses.reduce((sum, e) => {
      const date = e.paidAt ?? e.createdAt.slice(0, 10);
      return date.startsWith(prefix) ? sum + (e.amount ?? 0) : sum;
    }, 0);
  }, [expenses]);

  // ——— Gider formu ———

  const openCreate = () => {
    setEditing(null);
    setForm({
      description: "",
      amount: "",
      categoryId: null,
      personId: null,
      paidAt: todayISO(),
    });
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (expense: Expense) => {
    setEditing(expense);
    setForm({
      description: expense.description ?? "",
      amount:
        expense.amount != null
          ? String(expense.amount).replace(".", ",")
          : "",
      categoryId: expense.categoryId,
      personId: expense.personId,
      paidAt: expense.paidAt ?? "",
    });
    setFormError(null);
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    const input = {
      description: form.description,
      amount: parseAmount(form.amount),
      categoryId: form.categoryId,
      personId: form.personId,
      paidAt: form.paidAt || null,
    };
    try {
      if (editing) {
        await updateExpense(editing.id, input);
      } else {
        await createExpense(input);
      }
      setFormOpen(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (expense: Expense) => {
    if (!confirm("Bu gider silinsin mi?")) return;
    try {
      await deleteExpense(expense.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Silinemedi.");
    }
  };

  // ——— Kategori / kişi yönetimi ———

  const openManager = (kind: ManagerKind) => {
    setManager(kind);
    setManagerEditing(null);
    setManagerName("");
    setManagerColor(EXPENSE_COLORS[0]);
    setManagerIcon(MANAGER_META[kind].icons[0].id);
    setManagerError(null);
  };

  const startManagerEdit = (item: NamedItem) => {
    setManagerEditing(item);
    setManagerName(item.name);
    setManagerColor(item.color || EXPENSE_COLORS[0]);
    setManagerIcon(item.icon || MANAGER_META[manager!].icons[0].id);
    setManagerError(null);
  };

  const resetManagerForm = () => {
    setManagerEditing(null);
    setManagerName("");
    setManagerError(null);
    if (manager) {
      setManagerColor(EXPENSE_COLORS[0]);
      setManagerIcon(MANAGER_META[manager].icons[0].id);
    }
  };

  const handleManagerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manager) return;
    const name = managerName.trim();
    if (!name) {
      setManagerError("İsim yazın.");
      return;
    }
    setManagerSaving(true);
    setManagerError(null);
    const input = { name, color: managerColor, icon: managerIcon };
    try {
      if (manager === "category") {
        if (managerEditing) {
          await updateExpenseCategory(managerEditing.id, input);
        } else {
          await createExpenseCategory(input);
        }
        setCategories(await fetchExpenseCategories());
      } else {
        if (managerEditing) {
          await updateExpensePerson(managerEditing.id, input);
        } else {
          await createExpensePerson(input);
        }
        setPeople(await fetchExpensePeople());
      }
      resetManagerForm();
    } catch (err) {
      setManagerError(err instanceof Error ? err.message : "Kaydedilemedi.");
    } finally {
      setManagerSaving(false);
    }
  };

  const handleManagerDelete = async (item: NamedItem) => {
    if (!manager) return;
    if (!confirm(`"${item.name}" silinsin mi? Mevcut giderlerde bu alan boşalır.`)) return;
    try {
      if (manager === "category") {
        await deleteExpenseCategory(item.id);
        setCategories(await fetchExpenseCategories());
      } else {
        await deleteExpensePerson(item.id);
        setPeople(await fetchExpensePeople());
      }
      if (managerEditing?.id === item.id) resetManagerForm();
      setExpenses(await fetchExpenses());
    } catch (err) {
      setManagerError(err instanceof Error ? err.message : "Silinemedi.");
    }
  };

  const managerItems: NamedItem[] = manager === "category" ? categories : people;

  const headerActions = (
    <>
      <button type="button" className="admin-btn-secondary" onClick={() => openManager("category")}>
        Kategoriler
      </button>
      <button type="button" className="admin-btn-secondary" onClick={() => openManager("person")}>
        Kişiler
      </button>
      <button type="button" className="admin-btn-primary" onClick={openCreate}>
        + Gider ekle
      </button>
    </>
  );

  return (
    <div className="admin-page">
      <AdminPageHeader actions={headerActions} />

      {error && <div className="admin-alert admin-alert-error mt-4">{error}</div>}

      <div className="expense-summary mt-4">
        <div className="admin-card expense-summary-card">
          <p className="expense-summary-label">Bu ay</p>
          <p className="expense-summary-value">{currencyFmt.format(totalThisMonth)}</p>
        </div>
        <div className="admin-card expense-summary-card">
          <p className="expense-summary-label">Toplam</p>
          <p className="expense-summary-value">{currencyFmt.format(totalAll)}</p>
        </div>
        <div className="admin-card expense-summary-card">
          <p className="expense-summary-label">Kayıt</p>
          <p className="expense-summary-value">{expenses.length}</p>
        </div>
      </div>

      {loading ? (
        <p className="mt-8 text-center text-sm text-zinc-500">Yükleniyor…</p>
      ) : expenses.length === 0 ? (
        <div className="admin-card mt-6 text-center">
          <p className="text-sm text-zinc-600">Henüz gider kaydı yok.</p>
          <button type="button" onClick={openCreate} className="admin-link mt-3 text-sm font-semibold">
            İlk gideri ekle
          </button>
        </div>
      ) : (
        <>
          <div className="admin-table-wrap mt-6 hidden lg:block">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Açıklama</th>
                  <th>Kategori</th>
                  <th>Ödeyen</th>
                  <th className="text-right">Tutar</th>
                  <th className="text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td className="whitespace-nowrap text-xs text-zinc-600">
                      {formatDate(expense.paidAt ?? expense.createdAt.slice(0, 10))}
                    </td>
                    <td className="max-w-[18rem] text-sm text-zinc-900">
                      {expense.description || <span className="text-zinc-400">—</span>}
                    </td>
                    <td>
                      <ItemBadge item={expense.categoryId != null ? categoryById.get(expense.categoryId) : undefined} size="sm" />
                    </td>
                    <td>
                      <ItemBadge item={expense.personId != null ? personById.get(expense.personId) : undefined} size="sm" />
                    </td>
                    <td className="whitespace-nowrap text-right font-semibold text-zinc-900">
                      {formatAmount(expense.amount)}
                    </td>
                    <td>
                      <div className="admin-action-icons justify-end">
                        <AdminIconButton label="Düzenle" onClick={() => openEdit(expense)}>
                          <IconEdit />
                        </AdminIconButton>
                        <AdminIconButton label="Sil" variant="danger" onClick={() => void handleDelete(expense)}>
                          <IconTrash />
                        </AdminIconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 space-y-3 lg:hidden">
            {expenses.map((expense) => (
              <div key={expense.id} className="admin-card expense-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-900">
                      {expense.description || "Açıklama yok"}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {formatDate(expense.paidAt ?? expense.createdAt.slice(0, 10))}
                    </p>
                  </div>
                  <p className="shrink-0 text-base font-bold text-zinc-900">
                    {formatAmount(expense.amount)}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {expense.categoryId != null && (
                    <ItemBadge item={categoryById.get(expense.categoryId)} size="sm" />
                  )}
                  {expense.personId != null && (
                    <ItemBadge item={personById.get(expense.personId)} size="sm" />
                  )}
                  <div className="admin-action-icons ml-auto">
                    <AdminIconButton label="Düzenle" onClick={() => openEdit(expense)}>
                      <IconEdit />
                    </AdminIconButton>
                    <AdminIconButton label="Sil" variant="danger" onClick={() => void handleDelete(expense)}>
                      <IconTrash />
                    </AdminIconButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {formOpen && (
        <AdminModal
          open
          onClose={() => setFormOpen(false)}
          size="lg"
          title={editing ? "Gideri düzenle" : "Yeni gider"}
          description="Tüm alanlar isteğe bağlı; sadece bildiklerinizi doldurun."
        >
          <form onSubmit={handleSubmit} className="admin-modal-form">
            <div className="admin-modal-body space-y-4">
              <div>
                <label className="admin-label">Tutar (TL)</label>
                <input
                  className="admin-input text-lg font-semibold"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  autoFocus
                />
              </div>
              <div>
                <label className="admin-label">Açıklama</label>
                <input
                  className="admin-input"
                  placeholder="Ne için ödendi?"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div>
                <label className="admin-label">Kategori</label>
                <ChipSelect
                  items={categories}
                  value={form.categoryId}
                  onChange={(categoryId) => setForm((f) => ({ ...f, categoryId }))}
                  emptyText="Henüz kategori yok."
                  onManage={() => openManager("category")}
                />
              </div>
              <div>
                <label className="admin-label">Ödeyen kişi</label>
                <ChipSelect
                  items={people}
                  value={form.personId}
                  onChange={(personId) => setForm((f) => ({ ...f, personId }))}
                  emptyText="Henüz kişi yok."
                  onManage={() => openManager("person")}
                />
              </div>
              <div>
                <label className="admin-label">Ödenme tarihi</label>
                <input
                  type="date"
                  className="admin-input"
                  value={form.paidAt}
                  onChange={(e) => setForm((f) => ({ ...f, paidAt: e.target.value }))}
                />
              </div>

              {formError && <p className="text-sm text-red-600">{formError}</p>}
            </div>

            <div className="admin-modal-footer">
              <button type="button" onClick={() => setFormOpen(false)} className="admin-btn-secondary">
                İptal
              </button>
              <button type="submit" disabled={saving} className="admin-btn-primary">
                {saving ? "Kaydediliyor…" : "Kaydet"}
              </button>
            </div>
          </form>
        </AdminModal>
      )}

      {manager && (
        <AdminModal
          open
          onClose={() => setManager(null)}
          size="lg"
          title={MANAGER_META[manager].title}
          description="Renk ve ikon seçerek ekleyin; mevcutları düzenleyin."
        >
          <div className="admin-modal-body space-y-5">
            {managerItems.length > 0 && (
              <div className="space-y-2">
                {managerItems.map((item) => (
                  <div key={item.id} className="expense-manager-row">
                    <ItemBadge item={item} />
                    <div className="admin-action-icons ml-auto">
                      <AdminIconButton label="Düzenle" onClick={() => startManagerEdit(item)}>
                        <IconEdit />
                      </AdminIconButton>
                      <AdminIconButton
                        label="Sil"
                        variant="danger"
                        onClick={() => void handleManagerDelete(item)}
                      >
                        <IconTrash />
                      </AdminIconButton>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleManagerSubmit} className="expense-manager-form">
              <p className="text-sm font-semibold text-zinc-900">
                {managerEditing ? `"${managerEditing.name}" düzenleniyor` : "Yeni ekle"}
              </p>
              <input
                className="admin-input mt-2"
                placeholder={MANAGER_META[manager].addLabel}
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
              />
              <label className="admin-label mt-4 block">Renk</label>
              <ColorPicker value={managerColor} onChange={setManagerColor} />
              <label className="admin-label mt-4 block">İkon</label>
              <IconPicker
                icons={MANAGER_META[manager].icons}
                value={managerIcon}
                color={managerColor}
                onChange={setManagerIcon}
              />

              {managerError && <p className="mt-3 text-sm text-red-600">{managerError}</p>}

              <div className="mt-4 flex flex-wrap justify-end gap-2">
                {managerEditing && (
                  <button type="button" className="admin-btn-secondary" onClick={resetManagerForm}>
                    Vazgeç
                  </button>
                )}
                <button type="submit" disabled={managerSaving} className="admin-btn-primary">
                  {managerSaving
                    ? "Kaydediliyor…"
                    : managerEditing
                      ? "Güncelle"
                      : "Ekle"}
                </button>
              </div>
            </form>
          </div>
        </AdminModal>
      )}
    </div>
  );
}
