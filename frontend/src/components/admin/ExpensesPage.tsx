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
type TimeRange =
  | "all"
  | "today"
  | "week"
  | "month"
  | "lastMonth"
  | "year"
  | "pickMonth"
  | "custom";
type SortKey = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";

const TIME_RANGE_OPTIONS: { id: TimeRange; label: string }[] = [
  { id: "month", label: "Bu ay" },
  { id: "lastMonth", label: "Geçen ay" },
  { id: "week", label: "Son 7 gün" },
  { id: "today", label: "Bugün" },
  { id: "year", label: "Bu yıl" },
  { id: "all", label: "Tüm zamanlar" },
  { id: "pickMonth", label: "Ay seç" },
  { id: "custom", label: "Tarih aralığı" },
];

const MONTH_LABELS = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  const monthIndex = Number(m) - 1;
  if (!y || !Number.isFinite(monthIndex) || monthIndex < 0 || monthIndex > 11) return ym;
  return `${MONTH_LABELS[monthIndex]} ${y}`;
}

function currentMonthISO(): string {
  return todayISO().slice(0, 7);
}

function expenseDateOf(e: Expense): string {
  return e.paidAt ?? e.createdAt.slice(0, 10);
}

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: "date-desc", label: "Tarih (yeni → eski)" },
  { id: "date-asc", label: "Tarih (eski → yeni)" },
  { id: "amount-desc", label: "Tutar (yüksek → düşük)" },
  { id: "amount-asc", label: "Tutar (düşük → yüksek)" },
];

/** Filtrede "kategorisiz" seçimi için özel id (gerçek kategori id'leri pozitif) */
const UNCATEGORIZED_FILTER = -1;

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

/**
 * Aşağı doğru açılan seçim kutusu. Panel akış içinde açıldığı için
 * modal içinde de kesilmeden, mobilde de rahat kullanılır.
 */
function ItemSelect({
  items,
  value,
  onChange,
  placeholder,
  clearLabel = "Seçim yok",
  onManage,
}: {
  items: NamedItem[];
  value: number | null;
  onChange: (id: number | null) => void;
  placeholder: string;
  clearLabel?: string;
  onManage?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = value != null ? items.find((item) => item.id === value) : undefined;

  const pick = (id: number | null) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <div className="expense-select">
      <button
        type="button"
        className="expense-select-btn"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {selected ? (
          <ItemBadge item={selected} size="sm" />
        ) : (
          <span className="text-sm text-zinc-500">{placeholder}</span>
        )}
        <svg
          className={`expense-select-chevron ${open ? "expense-select-chevron-open" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="expense-select-panel" role="listbox">
          <button
            type="button"
            className={`expense-select-option ${value == null ? "expense-select-option-active" : ""}`}
            onClick={() => pick(null)}
          >
            <span className="text-zinc-500">{clearLabel}</span>
          </button>
          {items.map((item) => {
            const active = value === item.id;
            const color = item.color || DEFAULT_EXPENSE_COLOR;
            return (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={active}
                className={`expense-select-option ${active ? "expense-select-option-active" : ""}`}
                onClick={() => pick(item.id)}
              >
                <span
                  className="expense-select-option-icon"
                  style={{ backgroundColor: `${color}1a`, color }}
                >
                  <ExpenseIcon icon={item.icon} className="h-4 w-4" />
                </span>
                <span className="expense-select-option-name">{item.name}</span>
                {active && (
                  <svg
                    className="ml-auto h-4 w-4 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
          {onManage && (
            <button
              type="button"
              className="expense-select-option expense-select-manage"
              onClick={() => {
                setOpen(false);
                onManage();
              }}
            >
              + Yeni ekle / düzenle
            </button>
          )}
        </div>
      )}
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

  // Filtre ve sıralama
  const [filterCategoryId, setFilterCategoryId] = useState<number | null>(null);
  const [filterPersonId, setFilterPersonId] = useState<number | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [selectedMonth, setSelectedMonth] = useState(currentMonthISO);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date-desc");

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

  const filtersActive =
    filterCategoryId != null ||
    filterPersonId != null ||
    timeRange !== "all" ||
    sortKey !== "date-desc";

  const clearFilters = () => {
    setFilterCategoryId(null);
    setFilterPersonId(null);
    setTimeRange("all");
    setSelectedMonth(currentMonthISO());
    setCustomFrom("");
    setCustomTo("");
    setSortKey("date-desc");
  };

  const periodExpenses = useMemo(() => {
    const today = todayISO();

    let minDate: string | null = null;
    let prefix: string | null = null;
    if (timeRange === "today") {
      minDate = today;
    } else if (timeRange === "week") {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      minDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    } else if (timeRange === "month") {
      prefix = today.slice(0, 7);
    } else if (timeRange === "lastMonth") {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    } else if (timeRange === "pickMonth") {
      prefix = selectedMonth || null;
    } else if (timeRange === "year") {
      prefix = today.slice(0, 4);
    }

    const rangeFrom = timeRange === "custom" && customFrom ? customFrom : null;
    const rangeTo = timeRange === "custom" && customTo ? customTo : null;

    return expenses.filter((e) => {
      if (filterPersonId != null && e.personId !== filterPersonId) return false;
      const date = expenseDateOf(e);
      if (timeRange === "today" && date !== today) return false;
      if (minDate && timeRange === "week" && (date < minDate || date > today)) return false;
      if (prefix && !date.startsWith(prefix)) return false;
      if (rangeFrom && date < rangeFrom) return false;
      if (rangeTo && date > rangeTo) return false;
      return true;
    });
  }, [expenses, filterPersonId, timeRange, selectedMonth, customFrom, customTo]);

  const visibleExpenses = useMemo(() => {
    const filtered = periodExpenses.filter((e) => {
      if (filterCategoryId === UNCATEGORIZED_FILTER) {
        if (e.categoryId != null) return false;
      } else if (filterCategoryId != null && e.categoryId !== filterCategoryId) {
        return false;
      }
      return true;
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (sortKey) {
        case "date-asc":
          return expenseDateOf(a).localeCompare(expenseDateOf(b)) || a.id - b.id;
        case "amount-desc":
          return (b.amount ?? -Infinity) - (a.amount ?? -Infinity) || b.id - a.id;
        case "amount-asc":
          return (a.amount ?? Infinity) - (b.amount ?? Infinity) || a.id - b.id;
        default:
          return expenseDateOf(b).localeCompare(expenseDateOf(a)) || b.id - a.id;
      }
    });
    return sorted;
  }, [periodExpenses, filterCategoryId, sortKey]);

  const visibleTotal = useMemo(
    () => visibleExpenses.reduce((sum, e) => sum + (e.amount ?? 0), 0),
    [visibleExpenses]
  );

  const periodTotal = useMemo(
    () => periodExpenses.reduce((sum, e) => sum + (e.amount ?? 0), 0),
    [periodExpenses]
  );

  const categoryBreakdown = useMemo(() => {
    const totals = new Map<number | null, { total: number; count: number }>();
    for (const expense of periodExpenses) {
      const key = expense.categoryId;
      const prev = totals.get(key) ?? { total: 0, count: 0 };
      totals.set(key, {
        total: prev.total + (expense.amount ?? 0),
        count: prev.count + 1,
      });
    }

    return [...totals.entries()]
      .map(([categoryId, stats]) => ({
        categoryId,
        category: categoryId != null ? categoryById.get(categoryId) : undefined,
        ...stats,
      }))
      .sort((a, b) => b.total - a.total || b.count - a.count);
  }, [periodExpenses, categoryById]);

  const periodLabel = useMemo(() => {
    switch (timeRange) {
      case "today":
        return "Bugün";
      case "week":
        return "Son 7 gün";
      case "month":
        return "Bu ay";
      case "lastMonth":
        return "Geçen ay";
      case "pickMonth":
        return selectedMonth ? formatMonthLabel(selectedMonth) : "Seçilen ay";
      case "custom": {
        if (customFrom && customTo) return `${formatDate(customFrom)} – ${formatDate(customTo)}`;
        if (customFrom) return `${formatDate(customFrom)} sonrası`;
        if (customTo) return `${formatDate(customTo)} öncesi`;
        return "Özel aralık";
      }
      case "year":
        return "Bu yıl";
      default:
        return "Tüm zamanlar";
    }
  }, [timeRange, selectedMonth, customFrom, customTo]);

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

      {/* Dönem + özet: tek dokunuşla zaman seçimi, seçime göre canlı toplam */}
      <div className="admin-card expense-hero mt-4">
        <div className="expense-chip-row" role="tablist" aria-label="Dönem">
          {TIME_RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              role="tab"
              aria-selected={timeRange === opt.id}
              className={`expense-chip ${timeRange === opt.id ? "is-active" : ""}`}
              onClick={() => setTimeRange(opt.id)}
            >
              {opt.id === "pickMonth" && timeRange === "pickMonth"
                ? formatMonthLabel(selectedMonth)
                : opt.label}
            </button>
          ))}
        </div>

        {timeRange === "pickMonth" && (
          <div className="expense-hero-extra">
            <input
              type="month"
              className="admin-input"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value || currentMonthISO())}
            />
          </div>
        )}

        {timeRange === "custom" && (
          <div className="expense-hero-extra expense-hero-range">
            <input
              type="date"
              className="admin-input"
              value={customFrom}
              max={customTo || undefined}
              onChange={(e) => setCustomFrom(e.target.value)}
              aria-label="Başlangıç"
            />
            <span className="expense-hero-range-sep" aria-hidden>
              –
            </span>
            <input
              type="date"
              className="admin-input"
              value={customTo}
              min={customFrom || undefined}
              onChange={(e) => setCustomTo(e.target.value)}
              aria-label="Bitiş"
            />
          </div>
        )}

        <div className="expense-hero-main">
          <div className="expense-hero-total">
            <p className="expense-hero-label">
              {periodLabel}
              {(filterCategoryId != null || filterPersonId != null) && " · filtreli"}
            </p>
            <p className="expense-hero-value">{currencyFmt.format(visibleTotal)}</p>
            <p className="expense-hero-sub">{visibleExpenses.length} kayıt</p>
          </div>
          <div className="expense-hero-side">
            <div className="expense-hero-mini">
              <span>Bu ay</span>
              <b>{currencyFmt.format(totalThisMonth)}</b>
            </div>
            <div className="expense-hero-mini">
              <span>Tüm zamanlar</span>
              <b>{currencyFmt.format(totalAll)}</b>
            </div>
            {filtersActive && (
              <button
                type="button"
                className="expense-hero-clear"
                onClick={clearFilters}
              >
                Filtreleri temizle
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Kategori / ödeyen: kaydırılabilir tek dokunuş çipler */}
      {!loading && expenses.length > 0 && (categories.length > 0 || people.length > 0) && (
        <div className="expense-chip-filters mt-3">
          {categories.length > 0 && (
            <div className="expense-chip-row" aria-label="Kategori filtresi">
              <button
                type="button"
                className={`expense-chip ${filterCategoryId == null ? "is-active" : ""}`}
                onClick={() => setFilterCategoryId(null)}
              >
                Tüm kategoriler
              </button>
              {categories.map((cat) => {
                const active = filterCategoryId === cat.id;
                const color = cat.color || DEFAULT_EXPENSE_COLOR;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`expense-chip expense-chip-item ${active ? "is-active" : ""}`}
                    style={
                      active
                        ? { backgroundColor: color, borderColor: color, color: "#fff" }
                        : { color, borderColor: `${color}66`, backgroundColor: `${color}14` }
                    }
                    onClick={() => setFilterCategoryId(active ? null : cat.id)}
                  >
                    <ExpenseIcon icon={cat.icon} className="h-3.5 w-3.5" />
                    {cat.name}
                  </button>
                );
              })}
              <button
                type="button"
                className={`expense-chip ${
                  filterCategoryId === UNCATEGORIZED_FILTER ? "is-active" : ""
                }`}
                onClick={() =>
                  setFilterCategoryId(
                    filterCategoryId === UNCATEGORIZED_FILTER ? null : UNCATEGORIZED_FILTER
                  )
                }
              >
                Kategorisiz
              </button>
            </div>
          )}

          {people.length > 0 && (
            <div className="expense-chip-row" aria-label="Ödeyen filtresi">
              <button
                type="button"
                className={`expense-chip ${filterPersonId == null ? "is-active" : ""}`}
                onClick={() => setFilterPersonId(null)}
              >
                Herkes
              </button>
              {people.map((person) => {
                const active = filterPersonId === person.id;
                const color = person.color || DEFAULT_EXPENSE_COLOR;
                return (
                  <button
                    key={person.id}
                    type="button"
                    className={`expense-chip expense-chip-item ${active ? "is-active" : ""}`}
                    style={
                      active
                        ? { backgroundColor: color, borderColor: color, color: "#fff" }
                        : { color, borderColor: `${color}66`, backgroundColor: `${color}14` }
                    }
                    onClick={() => setFilterPersonId(active ? null : person.id)}
                  >
                    <ExpenseIcon icon={person.icon} className="h-3.5 w-3.5" />
                    {person.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!loading && periodExpenses.length > 0 && categoryBreakdown.length > 0 && (
        <div className="admin-card expense-breakdown mt-4">
          <div className="expense-breakdown-head">
            <p className="expense-summary-label">Kategori harcamaları</p>
            <p className="expense-breakdown-period">{periodLabel}</p>
          </div>
          <div className="expense-breakdown-list">
            {categoryBreakdown.map((row) => {
              const share = periodTotal > 0 ? (row.total / periodTotal) * 100 : 0;
              const color = row.category?.color || DEFAULT_EXPENSE_COLOR;
              const rowFilterId = row.categoryId ?? UNCATEGORIZED_FILTER;
              const active = filterCategoryId === rowFilterId;
              return (
                <button
                  key={row.categoryId ?? "none"}
                  type="button"
                  className={`expense-breakdown-row ${active ? "expense-breakdown-row-active" : ""}`}
                  onClick={() =>
                    setFilterCategoryId(active ? null : rowFilterId)
                  }
                  title={
                    row.category
                      ? `${row.category.name} filtresini ${active ? "kaldır" : "uygula"}`
                      : `Kategorisiz filtresini ${active ? "kaldır" : "uygula"}`
                  }
                >
                  <div className="expense-breakdown-meta">
                    {row.category ? (
                      <ItemBadge item={row.category} size="sm" />
                    ) : (
                      <span className="expense-badge expense-badge-sm expense-breakdown-uncat">
                        Kategorisiz
                      </span>
                    )}
                    <span className="expense-breakdown-count">{row.count} kayıt</span>
                  </div>
                  <div className="expense-breakdown-amounts">
                    <span className="expense-breakdown-total">{currencyFmt.format(row.total)}</span>
                    <span className="expense-breakdown-share">{share.toFixed(0)}%</span>
                  </div>
                  <div className="expense-breakdown-bar" aria-hidden>
                    <span
                      className="expense-breakdown-bar-fill"
                      style={{
                        width: `${Math.max(share, share > 0 ? 2 : 0)}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <p className="mt-8 text-center text-sm text-zinc-500">Yükleniyor…</p>
      ) : expenses.length === 0 ? (
        <div className="admin-card mt-6 text-center">
          <p className="text-sm text-zinc-600">Henüz gider kaydı yok.</p>
          <button type="button" onClick={openCreate} className="admin-link mt-3 text-sm font-semibold">
            İlk gideri ekle
          </button>
        </div>
      ) : visibleExpenses.length === 0 ? (
        <div className="admin-card mt-6 text-center">
          <p className="text-sm text-zinc-600">Filtrelere uyan gider bulunamadı.</p>
          <button type="button" onClick={clearFilters} className="admin-link mt-3 text-sm font-semibold">
            Filtreleri temizle
          </button>
        </div>
      ) : (
        <>
          <div className="expense-list-head mt-5">
            <span className="expense-list-count">
              {visibleExpenses.length} kayıt · {currencyFmt.format(visibleTotal)}
            </span>
            <select
              className="admin-input expense-sort-select"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              aria-label="Sıralama"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-table-wrap mt-3 hidden lg:block">
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
                {visibleExpenses.map((expense) => (
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
            {visibleExpenses.map((expense) => (
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
                <ItemSelect
                  items={categories}
                  value={form.categoryId}
                  onChange={(categoryId) => setForm((f) => ({ ...f, categoryId }))}
                  placeholder="Kategori seçin (isteğe bağlı)"
                  onManage={() => openManager("category")}
                />
              </div>
              <div>
                <label className="admin-label">Ödeyen kişi</label>
                <ItemSelect
                  items={people}
                  value={form.personId}
                  onChange={(personId) => setForm((f) => ({ ...f, personId }))}
                  placeholder="Kişi seçin (isteğe bağlı)"
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
