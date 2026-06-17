"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

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
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(onClear, 2200);
    return () => window.clearTimeout(t);
  }, [message, onClear]);

  if (!message || !portalReady) return null;

  return createPortal(
    <div
      className={`store-toast${aboveFloatingCart ? "" : " store-toast-low"}${className ? ` ${className}` : ""}`}
      role="status"
    >
      {message}
    </div>,
    document.body
  );
}
