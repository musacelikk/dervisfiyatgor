"use client";

import {
  DEFAULT_EMPLOYEE_PERMISSIONS,
  PERMISSION_GROUPS,
  type PermissionId,
} from "@/lib/permissions";

interface PermissionEditorProps {
  value: PermissionId[];
  onChange: (permissions: PermissionId[]) => void;
}

export default function PermissionEditor({ value, onChange }: PermissionEditorProps) {
  const toggle = (id: PermissionId) => {
    if (value.includes(id)) {
      const next = value.filter((p) => p !== id);
      onChange(next.length > 0 ? next : [...DEFAULT_EMPLOYEE_PERMISSIONS]);
      return;
    }
    onChange([...value, id]);
  };

  const selectAll = () => {
    const all = PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => i.id));
    onChange(all);
  };

  const selectDefault = () => {
    onChange([...DEFAULT_EMPLOYEE_PERMISSIONS]);
  };

  return (
    <div className="admin-permissions">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={selectDefault} className="admin-btn-ghost text-xs">
          Varsayılan
        </button>
        <button type="button" onClick={selectAll} className="admin-btn-ghost text-xs">
          Tümünü seç
        </button>
      </div>

      {PERMISSION_GROUPS.map((group) => (
        <fieldset key={group.label} className="admin-permissions-group">
          <legend className="admin-permissions-legend">{group.label}</legend>
          <div className="space-y-2">
            {group.items.map((item) => (
              <label key={item.id} className="admin-permission-item">
                <input
                  type="checkbox"
                  checked={value.includes(item.id)}
                  onChange={() => toggle(item.id)}
                  className="admin-checkbox"
                />
                <span>
                  <span className="block text-sm font-medium text-zinc-900">{item.label}</span>
                  {item.description && (
                    <span className="block text-xs text-zinc-500">{item.description}</span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
