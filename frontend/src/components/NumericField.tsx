"use client";

import { sanitizeNumericInput } from "@/lib/numeric-input";

type NumericFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  allowDecimal?: boolean;
};

export default function NumericField({
  label,
  value,
  onChange,
  placeholder = "0 veya 12,50",
  required = false,
  className = "admin-input tabular-nums",
  allowDecimal = true,
}: NumericFieldProps) {
  return (
    <div>
      <label className="admin-label">{label}</label>
      <input
        type="text"
        inputMode={allowDecimal ? "decimal" : "numeric"}
        pattern={allowDecimal ? "[0-9.,]*" : "[0-9]*"}
        autoComplete="off"
        className={className}
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={(e) => {
          const next = allowDecimal
            ? sanitizeNumericInput(e.target.value)
            : e.target.value.replace(/\D/g, "");
          onChange(next);
        }}
      />
    </div>
  );
}
