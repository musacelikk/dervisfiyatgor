type AdminPlaceholderProps = {
  title: string;
  description: string;
  items?: string[];
};

export default function AdminPlaceholder({ title, description, items = [] }: AdminPlaceholderProps) {
  return (
    <div className="admin-page">
      <div className="admin-card">
        <div className="admin-placeholder-badge">Yakında</div>
        <h2 className="admin-card-title mt-4">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">{description}</p>
        {items.length > 0 && (
          <ul className="admin-placeholder-list">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
