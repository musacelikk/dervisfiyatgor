import type { ReactNode } from "react";

type AdminPageHeaderProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
};

/** Üst bar sayfa başlığını gösterir; burada yalnızca aksiyon butonları kalır. */
export default function AdminPageHeader({ actions }: AdminPageHeaderProps) {
  if (!actions) return null;

  return (
    <div className="admin-page-actions">
      <div className="admin-page-actions-bar">{actions}</div>
    </div>
  );
}
