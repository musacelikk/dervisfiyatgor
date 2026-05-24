"use client";

import { useEffect } from "react";

type StoreToastProps = {
  message: string | null;
  onClear: () => void;
  aboveFloatingCart?: boolean;
};

export default function StoreToast({
  message,
  onClear,
  aboveFloatingCart = false,
}: StoreToastProps) {
  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(onClear, 2200);
    return () => window.clearTimeout(t);
  }, [message, onClear]);

  if (!message) return null;

  return (
    <div
      className={`store-toast${aboveFloatingCart ? "" : " store-toast-low"}`}
      role="status"
    >
      {message}
    </div>
  );
}
