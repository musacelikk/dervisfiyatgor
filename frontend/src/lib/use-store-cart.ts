"use client";

import { useState } from "react";
import { addToCart, cartItemCount, readCart, writeCart, type CartLine } from "@/lib/cart";
import type { Product } from "@/types/product";

export function useStoreCart() {
  const [lines, setLines] = useState<CartLine[]>(() =>
    typeof window === "undefined" ? [] : readCart()
  );

  const persist = (next: CartLine[]) => {
    setLines(next);
    writeCart(next);
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
