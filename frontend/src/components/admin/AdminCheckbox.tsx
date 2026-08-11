"use client";

import { useEffect, useRef } from "react";

type AdminCheckboxProps = {
  checked: boolean;
  onChange: () => void;
  /** "Hepsini seç" kutusunda kısmi seçim hali. */
  indeterminate?: boolean;
  disabled?: boolean;
  label: string;
  /** Satıra tıklamanın detayı açmasını engellemek için. */
  stopPropagation?: boolean;
};

export default function AdminCheckbox({
  checked,
  onChange,
  indeterminate = false,
  disabled = false,
  label,
  stopPropagation = false,
}: AdminCheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);

  // indeterminate yalnızca DOM özelliği olarak set edilebilir
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate && !checked;
  }, [indeterminate, checked]);

  return (
    <input
      ref={ref}
      type="checkbox"
      className="admin-checkbox"
      checked={checked}
      disabled={disabled}
      aria-label={label}
      onChange={onChange}
      onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
    />
  );
}
