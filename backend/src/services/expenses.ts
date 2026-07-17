import { getPool, isPostgres } from "../lib/database";
import { db as getSqliteDb } from "./db-sqlite";
import type {
  Expense,
  ExpenseCategory,
  ExpenseInput,
  ExpensePerson,
  NamedItemInput,
} from "../types/expense";

type Row = Record<string, unknown>;

function str(v: unknown): string | null {
  return v == null ? null : String(v);
}

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function mapNamed(row: Row): ExpenseCategory {
  return {
    id: Number(row.id),
    name: String(row.name),
    color: str(row.color),
    icon: str(row.icon),
    createdAt: String(row.created_at ?? ""),
  };
}

function mapExpense(row: Row): Expense {
  return {
    id: Number(row.id),
    description: str(row.description),
    amount: num(row.amount),
    categoryId: num(row.category_id),
    personId: num(row.person_id),
    paidAt: str(row.paid_at),
    createdAt: String(row.created_at ?? ""),
  };
}

function cleanNamedInput(input: NamedItemInput): {
  name: string;
  color: string | null;
  icon: string | null;
} {
  const name = input.name?.trim() ?? "";
  if (!name) throw new Error("İsim gerekli.");
  return {
    name,
    color: input.color?.trim() || null,
    icon: input.icon?.trim() || null,
  };
}

function cleanExpenseInput(input: ExpenseInput): {
  description: string | null;
  amount: number | null;
  category_id: number | null;
  person_id: number | null;
  paid_at: string | null;
} {
  const amount =
    input.amount == null || input.amount === ("" as unknown)
      ? null
      : Number(input.amount);
  return {
    description:
      typeof input.description === "string" ? input.description.trim() || null : null,
    amount: amount != null && Number.isFinite(amount) ? amount : null,
    category_id: input.categoryId != null ? Number(input.categoryId) : null,
    person_id: input.personId != null ? Number(input.personId) : null,
    paid_at: typeof input.paidAt === "string" ? input.paidAt.trim() || null : null,
  };
}

// ——— Kategoriler ———

export async function listExpenseCategories(): Promise<ExpenseCategory[]> {
  if (isPostgres()) {
    const { rows } = await getPool().query(
      `SELECT * FROM expense_categories ORDER BY name ASC`
    );
    return rows.map(mapNamed);
  }
  const rows = getSqliteDb()
    .prepare(`SELECT * FROM expense_categories ORDER BY name COLLATE NOCASE ASC`)
    .all() as Row[];
  return rows.map(mapNamed);
}

export async function createExpenseCategory(
  input: NamedItemInput
): Promise<ExpenseCategory> {
  const data = cleanNamedInput(input);
  if (isPostgres()) {
    const { rows } = await getPool().query(
      `INSERT INTO expense_categories (name, color, icon) VALUES ($1, $2, $3) RETURNING *`,
      [data.name, data.color, data.icon]
    );
    return mapNamed(rows[0]);
  }
  const result = getSqliteDb()
    .prepare(`INSERT INTO expense_categories (name, color, icon) VALUES (?, ?, ?)`)
    .run(data.name, data.color, data.icon);
  const row = getSqliteDb()
    .prepare(`SELECT * FROM expense_categories WHERE id = ?`)
    .get(result.lastInsertRowid) as Row;
  return mapNamed(row);
}

export async function updateExpenseCategory(
  id: number,
  input: NamedItemInput
): Promise<ExpenseCategory> {
  const data = cleanNamedInput(input);
  if (isPostgres()) {
    const { rows } = await getPool().query(
      `UPDATE expense_categories SET name = $1, color = $2, icon = $3 WHERE id = $4 RETURNING *`,
      [data.name, data.color, data.icon, id]
    );
    if (!rows[0]) throw new Error("Kategori bulunamadı.");
    return mapNamed(rows[0]);
  }
  const result = getSqliteDb()
    .prepare(`UPDATE expense_categories SET name = ?, color = ?, icon = ? WHERE id = ?`)
    .run(data.name, data.color, data.icon, id);
  if (result.changes === 0) throw new Error("Kategori bulunamadı.");
  const row = getSqliteDb()
    .prepare(`SELECT * FROM expense_categories WHERE id = ?`)
    .get(id) as Row;
  return mapNamed(row);
}

export async function deleteExpenseCategory(id: number): Promise<void> {
  if (isPostgres()) {
    await getPool().query(`DELETE FROM expense_categories WHERE id = $1`, [id]);
    return;
  }
  getSqliteDb().prepare(`DELETE FROM expense_categories WHERE id = ?`).run(id);
}

// ——— Kişiler ———

export async function listExpensePeople(): Promise<ExpensePerson[]> {
  if (isPostgres()) {
    const { rows } = await getPool().query(
      `SELECT * FROM expense_people ORDER BY name ASC`
    );
    return rows.map(mapNamed);
  }
  const rows = getSqliteDb()
    .prepare(`SELECT * FROM expense_people ORDER BY name COLLATE NOCASE ASC`)
    .all() as Row[];
  return rows.map(mapNamed);
}

export async function createExpensePerson(
  input: NamedItemInput
): Promise<ExpensePerson> {
  const data = cleanNamedInput(input);
  if (isPostgres()) {
    const { rows } = await getPool().query(
      `INSERT INTO expense_people (name, color, icon) VALUES ($1, $2, $3) RETURNING *`,
      [data.name, data.color, data.icon]
    );
    return mapNamed(rows[0]);
  }
  const result = getSqliteDb()
    .prepare(`INSERT INTO expense_people (name, color, icon) VALUES (?, ?, ?)`)
    .run(data.name, data.color, data.icon);
  const row = getSqliteDb()
    .prepare(`SELECT * FROM expense_people WHERE id = ?`)
    .get(result.lastInsertRowid) as Row;
  return mapNamed(row);
}

export async function updateExpensePerson(
  id: number,
  input: NamedItemInput
): Promise<ExpensePerson> {
  const data = cleanNamedInput(input);
  if (isPostgres()) {
    const { rows } = await getPool().query(
      `UPDATE expense_people SET name = $1, color = $2, icon = $3 WHERE id = $4 RETURNING *`,
      [data.name, data.color, data.icon, id]
    );
    if (!rows[0]) throw new Error("Kişi bulunamadı.");
    return mapNamed(rows[0]);
  }
  const result = getSqliteDb()
    .prepare(`UPDATE expense_people SET name = ?, color = ?, icon = ? WHERE id = ?`)
    .run(data.name, data.color, data.icon, id);
  if (result.changes === 0) throw new Error("Kişi bulunamadı.");
  const row = getSqliteDb()
    .prepare(`SELECT * FROM expense_people WHERE id = ?`)
    .get(id) as Row;
  return mapNamed(row);
}

export async function deleteExpensePerson(id: number): Promise<void> {
  if (isPostgres()) {
    await getPool().query(`DELETE FROM expense_people WHERE id = $1`, [id]);
    return;
  }
  getSqliteDb().prepare(`DELETE FROM expense_people WHERE id = ?`).run(id);
}

// ——— Giderler ———

export async function listExpenses(): Promise<Expense[]> {
  if (isPostgres()) {
    const { rows } = await getPool().query(
      `SELECT * FROM expenses ORDER BY COALESCE(paid_at, TO_CHAR(created_at, 'YYYY-MM-DD')) DESC, id DESC`
    );
    return rows.map(mapExpense);
  }
  const rows = getSqliteDb()
    .prepare(
      `SELECT * FROM expenses ORDER BY COALESCE(paid_at, substr(created_at, 1, 10)) DESC, id DESC`
    )
    .all() as Row[];
  return rows.map(mapExpense);
}

export async function createExpense(input: ExpenseInput): Promise<Expense> {
  const data = cleanExpenseInput(input);
  if (isPostgres()) {
    const { rows } = await getPool().query(
      `INSERT INTO expenses (description, amount, category_id, person_id, paid_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.description, data.amount, data.category_id, data.person_id, data.paid_at]
    );
    return mapExpense(rows[0]);
  }
  const result = getSqliteDb()
    .prepare(
      `INSERT INTO expenses (description, amount, category_id, person_id, paid_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(data.description, data.amount, data.category_id, data.person_id, data.paid_at);
  const row = getSqliteDb()
    .prepare(`SELECT * FROM expenses WHERE id = ?`)
    .get(result.lastInsertRowid) as Row;
  return mapExpense(row);
}

export async function updateExpense(id: number, input: ExpenseInput): Promise<Expense> {
  const data = cleanExpenseInput(input);
  if (isPostgres()) {
    const { rows } = await getPool().query(
      `UPDATE expenses
       SET description = $1, amount = $2, category_id = $3, person_id = $4, paid_at = $5
       WHERE id = $6 RETURNING *`,
      [data.description, data.amount, data.category_id, data.person_id, data.paid_at, id]
    );
    if (!rows[0]) throw new Error("Gider bulunamadı.");
    return mapExpense(rows[0]);
  }
  const result = getSqliteDb()
    .prepare(
      `UPDATE expenses
       SET description = ?, amount = ?, category_id = ?, person_id = ?, paid_at = ?
       WHERE id = ?`
    )
    .run(data.description, data.amount, data.category_id, data.person_id, data.paid_at, id);
  if (result.changes === 0) throw new Error("Gider bulunamadı.");
  const row = getSqliteDb().prepare(`SELECT * FROM expenses WHERE id = ?`).get(id) as Row;
  return mapExpense(row);
}

export async function deleteExpense(id: number): Promise<void> {
  if (isPostgres()) {
    await getPool().query(`DELETE FROM expenses WHERE id = $1`, [id]);
    return;
  }
  getSqliteDb().prepare(`DELETE FROM expenses WHERE id = ?`).run(id);
}
