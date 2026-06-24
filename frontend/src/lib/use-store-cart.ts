"use client";

import { useState } from "react";
import {
  addToCart,
  cartItemCount,
  readCart,
  readPriceTier,
  writeCart,
  writePriceTier,
  type CartLine,
  type CartScope,
  type PriceTier,
} from "@/lib/cart";
import type { Product } from "@/types/product";

export function useStoreCart(scope: CartScope = "store") {
  const [lines, setLines] = useState<CartLine[]>(() =>
    typeof window === "undefined" ? [] : readCart(scope)
  );
  const [priceTier, setPriceTierState] = useState<PriceTier>(() =>
    typeof window === "undefined" ? 1 : readPriceTier(scope)
  );

  const persist = (next: CartLine[]) => {
    setLines(next);
    writeCart(next, scope);
  };

  const setPriceTier = (tier: PriceTier) => {
    setPriceTierState(tier);
    writePriceTier(tier, scope);
  };

  const addProduct = (product: Product, quantity = 1) => {
    persist(addToCart(lines, product, quantity));
  };

  return {
    lines,
    setLines: persist,
    addProduct,
    itemCount: cartItemCount(lines),
    priceTier,
    setPriceTier,
  };
}
