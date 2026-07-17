export type ExpenseCategory = {
  id: number;
  name: string;
  color: string | null;
  icon: string | null;
  createdAt: string;
};

export type ExpensePerson = {
  id: number;
  name: string;
  color: string | null;
  icon: string | null;
  createdAt: string;
};

export type Expense = {
  id: number;
  description: string | null;
  amount: number | null;
  categoryId: number | null;
  personId: number | null;
  /** Ödenme tarihi (YYYY-MM-DD) */
  paidAt: string | null;
  createdAt: string;
};

export type ExpenseInput = {
  description?: string | null;
  amount?: number | null;
  categoryId?: number | null;
  personId?: number | null;
  paidAt?: string | null;
};

export type NamedItemInput = {
  name: string;
  color?: string | null;
  icon?: string | null;
};
