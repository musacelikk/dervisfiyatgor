"use client";

import { useEffect } from "react";

type StoreToastProps = {
  message: string | null;
  onClear: () => void;
  aboveFloatingCart?: boolean;
  className?: string;
};

export default function StoreToast({
  message,
  onClear,
  aboveFloatingCart = false,
  className,
}: StoreToastProps) {
  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(onClear, 2200);
    return () => window.clearTimeout(t);
  }, [message, onClear]);

  if (!message) return null;

  return (
    <div
      className={`store-toast${aboveFloatingCart ? "" : " store-toast-low"}${className ? ` ${className}` : ""}`}
      role="status"
    >
      {message}
    </div>
  );
}
