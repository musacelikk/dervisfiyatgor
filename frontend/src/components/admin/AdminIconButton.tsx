type AdminIconButtonProps = {
  label: string;
  onClick: () => void;
  variant?: "edit" | "danger";
  children: React.ReactNode;
};

export default function AdminIconButton({
  label,
  onClick,
  variant = "edit",
  children,
}: AdminIconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`admin-btn-icon admin-btn-icon-${variant}`}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}
