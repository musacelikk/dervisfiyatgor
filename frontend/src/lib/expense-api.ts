import type {
  Expense,
  ExpenseCategory,
  ExpenseInput,
  ExpensePerson,
  NamedItemInput,
} from "@/types/expense";

async function jsonFetch<T>(
  url: string,
  fallbackError: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body.error === "string" ? body.error : fallbackError);
  }
  return body as T;
}

function jsonBody(body: unknown): RequestInit {
  return {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

// ——— Giderler ———

export async function fetchExpenses(): Promise<Expense[]> {
  const body = await jsonFetch<{ expenses: Expense[] }>(
    "/api/admin/expenses",
    "Giderler yüklenemedi."
  );
  return body.expenses ?? [];
}

export async function createExpense(input: ExpenseInput): Promise<Expense> {
  const body = await jsonFetch<{ expense: Expense }>(
    "/api/admin/expenses",
    "Gider eklenemedi.",
    { method: "POST", ...jsonBody(input) }
  );
  return body.expense;
}

export async function updateExpense(id: number, input: ExpenseInput): Promise<Expense> {
  const body = await jsonFetch<{ expense: Expense }>(
    `/api/admin/expenses/${id}`,
    "Gider güncellenemedi.",
    { method: "PATCH", ...jsonBody(input) }
  );
  return body.expense;
}

export async function deleteExpense(id: number): Promise<void> {
  await jsonFetch(`/api/admin/expenses/${id}`, "Gider silinemedi.", {
    method: "DELETE",
  });
}

// ——— Kategoriler ———

export async function fetchExpenseCategories(): Promise<ExpenseCategory[]> {
  const body = await jsonFetch<{ categories: ExpenseCategory[] }>(
    "/api/admin/expenses/categories",
    "Kategoriler yüklenemedi."
  );
  return body.categories ?? [];
}

export async function createExpenseCategory(
  input: NamedItemInput
): Promise<ExpenseCategory> {
  const body = await jsonFetch<{ category: ExpenseCategory }>(
    "/api/admin/expenses/categories",
    "Kategori eklenemedi.",
    { method: "POST", ...jsonBody(input) }
  );
  return body.category;
}

export async function updateExpenseCategory(
  id: number,
  input: NamedItemInput
): Promise<ExpenseCategory> {
  const body = await jsonFetch<{ category: ExpenseCategory }>(
    `/api/admin/expenses/categories/${id}`,
    "Kategori güncellenemedi.",
    { method: "PATCH", ...jsonBody(input) }
  );
  return body.category;
}

export async function deleteExpenseCategory(id: number): Promise<void> {
  await jsonFetch(`/api/admin/expenses/categories/${id}`, "Kategori silinemedi.", {
    method: "DELETE",
  });
}

// ——— Kişiler ———

export async function fetchExpensePeople(): Promise<ExpensePerson[]> {
  const body = await jsonFetch<{ people: ExpensePerson[] }>(
    "/api/admin/expenses/people",
    "Kişiler yüklenemedi."
  );
  return body.people ?? [];
}

export async function createExpensePerson(
  input: NamedItemInput
): Promise<ExpensePerson> {
  const body = await jsonFetch<{ person: ExpensePerson }>(
    "/api/admin/expenses/people",
    "Kişi eklenemedi.",
    { method: "POST", ...jsonBody(input) }
  );
  return body.person;
}

export async function updateExpensePerson(
  id: number,
  input: NamedItemInput
): Promise<ExpensePerson> {
  const body = await jsonFetch<{ person: ExpensePerson }>(
    `/api/admin/expenses/people/${id}`,
    "Kişi güncellenemedi.",
    { method: "PATCH", ...jsonBody(input) }
  );
  return body.person;
}

export async function deleteExpensePerson(id: number): Promise<void> {
  await jsonFetch(`/api/admin/expenses/people/${id}`, "Kişi silinemedi.", {
    method: "DELETE",
  });
}
