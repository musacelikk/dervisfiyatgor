import type { Product } from "@/types/product";

export type CartLine = {
  product: Product;
  quantity: number;
};

const STORAGE_KEY = "dervismobil-cart";

export function readCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartLine[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (line) =>
        line?.product?.stockCode &&
        typeof line.quantity === "number" &&
        line.quantity > 0
    );
  } catch {
    return [];
  }
}

export function writeCart(lines: CartLine[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
}

export function cartItemCount(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function cartTotal(lines: CartLine[]): number | null {
  let total = 0;
  let hasPrice = false;
  for (const line of lines) {
    const price = line.product.salePrice1 ?? line.product.salePrice2;
    if (price != null) {
      hasPrice = true;
      total += price * line.quantity;
    }
  }
  return hasPrice ? total : null;
}

export function addToCart(lines: CartLine[], product: Product, quantity = 1): CartLine[] {
  const code = product.stockCode;
  const existing = lines.find((line) => line.product.stockCode === code);
  if (existing) {
    return lines.map((line) =>
      line.product.stockCode === code
        ? { ...line, quantity: line.quantity + quantity }
        : line
    );
  }
  return [...lines, { product, quantity }];
}

export function updateCartQuantity(
  lines: CartLine[],
  stockCode: string,
  quantity: number
): CartLine[] {
  if (quantity <= 0) return lines.filter((line) => line.product.stockCode !== stockCode);
  return lines.map((line) =>
    line.product.stockCode === stockCode ? { ...line, quantity } : line
  );
}

export function removeFromCart(lines: CartLine[], stockCode: string): CartLine[] {
  return lines.filter((line) => line.product.stockCode !== stockCode);
}

export function clearCartStorage(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
