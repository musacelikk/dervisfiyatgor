import type { Product } from "@/types/product";
import { productUnitPrice } from "@/lib/store-format";

export type CartLine = {
  product: Product;
  quantity: number;
};

export type PriceTier = 1 | 2;

const STORAGE_KEYS = {
  store: "dervismobil-cart",
  personnel: "dervismobil-cart-personnel",
} as const;

const PRICE_TIER_KEYS = {
  store: "dervismobil-price-tier",
  personnel: "dervismobil-price-tier-personnel",
} as const;

export type CartScope = keyof typeof STORAGE_KEYS;

function storageKey(scope: CartScope = "store"): string {
  return STORAGE_KEYS[scope];
}

export function readCart(scope: CartScope = "store"): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(scope));
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

export function writeCart(lines: CartLine[], scope: CartScope = "store"): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(scope), JSON.stringify(lines));
}

export function readPriceTier(scope: CartScope = "store"): PriceTier {
  if (typeof window === "undefined") return 1;
  try {
    const raw = localStorage.getItem(PRICE_TIER_KEYS[scope]);
    return raw === "2" ? 2 : 1;
  } catch {
    return 1;
  }
}

export function writePriceTier(tier: PriceTier, scope: CartScope = "store"): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PRICE_TIER_KEYS[scope], String(tier));
}

export function cartItemCount(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function cartTotal(lines: CartLine[], tier: PriceTier = 1): number | null {
  let total = 0;
  let hasPrice = false;
  for (const line of lines) {
    const price = productUnitPrice(line.product, tier);
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

export function clearCartStorage(scope: CartScope = "store"): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(storageKey(scope));
}
