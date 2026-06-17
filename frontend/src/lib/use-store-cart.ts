"use client";

import { useState } from "react";
import { addToCart, cartItemCount, readCart, writeCart, type CartLine, type CartScope } from "@/lib/cart";
import type { Product } from "@/types/product";

export function useStoreCart(scope: CartScope = "store") {
  const [lines, setLines] = useState<CartLine[]>(() =>
    typeof window === "undefined" ? [] : readCart(scope)
  );

  const persist = (next: CartLine[]) => {
    setLines(next);
    writeCart(next, scope);
  };

  const addProduct = (product: Product, quantity = 1) => {
    persist(addToCart(lines, product, quantity));
  };

  return {
    lines,
    setLines: persist,
    addProduct,
    itemCount: cartItemCount(lines),
  };
}
