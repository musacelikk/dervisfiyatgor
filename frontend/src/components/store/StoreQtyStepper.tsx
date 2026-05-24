type StoreQtyStepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "md";
};

export default function StoreQtyStepper({
  value,
  onChange,
  min = 1,
  max = 999,
  size = "md",
}: StoreQtyStepperProps) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));

  return (
    <div
      className={`store-qty-stepper store-qty-stepper-${size}`}
      role="group"
      aria-label="Adet"
    >
      <button type="button" onClick={dec} disabled={value <= min} aria-label="Azalt">
        −
      </button>
      <span className="store-qty-value">{value}</span>
      <button type="button" onClick={inc} disabled={value >= max} aria-label="Artır">
        +
      </button>
    </div>
  );
}
