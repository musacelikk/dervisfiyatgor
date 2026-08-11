"use client";

import type { ReactNode } from "react";

type BulkActionBarProps = {
  count: number;
  onClear: () => void;
  busy?: boolean;
  /** Sayfaya özel işlem düğmeleri — çubuk hangi işlemler olduğunu bilmez. */
  children: ReactNode;
};

/** Liste altına yapışan toplu işlem çubuğu. Seçim yokken render edilmez. */
export default function BulkActionBar({
  count,
  onClear,
  busy = false,
  children,
}: BulkActionBarProps) {
  if (count === 0) return null;

  return (
    <div className="bulk-action-bar" role="region" aria-label="Toplu işlemler">
      <div className="bulk-action-bar-inner">
        <span className="bulk-action-count">
          <b>{count}</b> kayıt seçildi
        </span>
        <div className="bulk-action-buttons">{children}</div>
        <button
          type="button"
          className="bulk-action-clear"
          onClick={onClear}
          disabled={busy}
        >
          Seçimi temizle
        </button>
      </div>
    </div>
  );
}
