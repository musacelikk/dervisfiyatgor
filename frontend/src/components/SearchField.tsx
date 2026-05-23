interface SearchFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "search";
  autoComplete?: string;
}

export default function SearchField({
  label,
  value,
  onChange,
  placeholder,
  inputMode = "text",
  autoComplete = "off",
}: SearchFieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-zinc-600">{label}</span>
      <input
        type="text"
        inputMode={inputMode}
        autoComplete={autoComplete}
        autoCorrect="off"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 ring-1 ring-zinc-200 outline-none transition placeholder:text-zinc-400 focus:bg-white focus:ring-2 focus:ring-accent/30"
      />
    </label>
  );
}
