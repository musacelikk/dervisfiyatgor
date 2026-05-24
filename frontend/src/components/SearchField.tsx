import type { ReactNode } from "react";

interface SearchFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "search";
  autoComplete?: string;
  icon?: ReactNode;
}

export default function SearchField({
  label,
  value,
  onChange,
  placeholder,
  inputMode = "text",
  autoComplete = "off",
  icon,
}: SearchFieldProps) {
  return (
    <label className="store-field block">
      <span className="store-field-label">{label}</span>
      <div className="store-field-input-wrap">
        {icon && <span className="store-field-icon">{icon}</span>}
        <input
          type="text"
          inputMode={inputMode}
          autoComplete={autoComplete}
          autoCorrect="off"
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`store-field-input ${icon ? "store-field-input-with-icon" : ""}`}
        />
      </div>
    </label>
  );
}
