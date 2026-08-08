"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createEmployee,
  deleteEmployee,
  fetchEmployees,
  fetchNewShiftCode,
  updateEmployee,
} from "@/lib/admin-api";
import {
  DEFAULT_EMPLOYEE_PERMISSIONS,
  permissionSummary,
  type PermissionId,
} from "@/lib/permissions";
import type { Employee } from "@/types/employee";
import { SHIFT_LABELS, type EmployeeShift } from "@/types/shift";
import AdminPageHeader from "./AdminPageHeader";
import PermissionEditor from "./PermissionEditor";
import AdminModal from "./AdminModal";
import AdminIconButton from "./AdminIconButton";
import { IconEdit, IconTrash } from "./AdminIcons";

type FormMode = { type: "create" } | { type: "edit"; employee: Employee };

const emptyForm = {
  name: "",
  username: "",
  password: "",
  permissions: [...DEFAULT_EMPLOYEE_PERMISSIONS] as PermissionId[],
  shiftCode: "",
  honorific: "" as "" | "Bey" | "Hanım",
  shift: "1" as EmployeeShift,
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setEmployees(await fetchEmployees());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Liste yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setForm(emptyForm);
    setFormMode({ type: "create" });
  };

  const openEdit = (employee: Employee) => {
    setForm({
      name: employee.name,
      username: employee.username,
      password: "",
      permissions: employee.permissions,
      shiftCode: employee.shiftCode ?? "",
      honorific: employee.honorific ?? "",
      shift: employee.shift ?? "1",
    });
    setFormMode({ type: "edit", employee });
  };

  const closeForm = () => {
    setFormMode(null);
    setForm(emptyForm);
  };

  const generateShiftCode = async () => {
    try {
      const code = await fetchNewShiftCode();
      setForm((f) => ({ ...f, shiftCode: code }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kod üretilemedi.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMode) return;
    setSaving(true);
    setError(null);

    try {
      if (formMode.type === "create") {
        await createEmployee({
          name: form.name,
          username: form.username,
          password: form.password,
          permissions: form.permissions,
          shiftCode: form.shiftCode || null,
          honorific: form.honorific || null,
          shift: form.shift,
        });
      } else {
        const payload: Parameters<typeof updateEmployee>[1] = {
          name: form.name,
          username: form.username,
          permissions: form.permissions,
          shiftCode: form.shiftCode || null,
          honorific: form.honorific || null,
          shift: form.shift,
        };
        if (form.password) payload.password = form.password;
        await updateEmployee(formMode.employee.id, payload);
      }
      closeForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (employee: Employee) => {
    try {
      await updateEmployee(employee.id, { active: !employee.active });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Durum güncellenemedi.");
    }
  };

  const handleDelete = async (employee: Employee) => {
    if (!confirm(`${employee.name} silinsin mi? Bu işlem geri alınamaz.`)) return;
    try {
      await deleteEmployee(employee.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Silinemedi.");
    }
  };

  const createButton = (
    <button type="button" onClick={openCreate} className="admin-btn-primary">
      + Yeni çalışan
    </button>
  );

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Çalışanlar"
        description="Mağaza personeli için giriş hesapları ve yetkileri yönetin."
        actions={createButton}
      />

      {error && !formMode && (
        <div className="admin-alert admin-alert-error mt-4">{error}</div>
      )}

      {loading ? (
        <p className="mt-8 text-center text-sm text-zinc-500">Yükleniyor…</p>
      ) : employees.length === 0 ? (
        <div className="admin-card mt-6 text-center">
          <p className="text-sm text-zinc-600">Henüz çalışan hesabı yok.</p>
          <button type="button" onClick={openCreate} className="admin-link mt-3 text-sm font-semibold">
            İlk hesabı oluştur
          </button>
        </div>
      ) : (
        <>
          <div className="admin-table-wrap mt-0 hidden lg:block">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Ad soyad</th>
                  <th>Kullanıcı adı</th>
                  <th>Mesai ID</th>
                  <th>Vardiya</th>
                  <th>Yetkiler</th>
                  <th>Durum</th>
                  <th className="text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id}>
                    <td className="font-medium text-zinc-900">{emp.name}</td>
                    <td className="font-mono text-xs">{emp.username}</td>
                    <td className="font-mono text-xs tracking-widest text-zinc-700">
                      {emp.shiftCode ?? "—"}
                    </td>
                    <td className="whitespace-nowrap text-xs text-zinc-600">
                      {SHIFT_LABELS[emp.shift ?? "1"]}
                    </td>
                    <td className="max-w-[14rem] text-xs text-zinc-600">
                      {permissionSummary(emp.permissions)}
                    </td>
                    <td>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          emp.active
                            ? "bg-emerald-50 text-emerald-800"
                            : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {emp.active ? "Aktif" : "Pasif"}
                      </span>
                    </td>
                    <td>
                      <div className="admin-action-icons">
                        <AdminIconButton label="Düzenle" onClick={() => openEdit(emp)}>
                          <IconEdit />
                        </AdminIconButton>
                        <button
                          type="button"
                          onClick={() => void toggleActive(emp)}
                          className="admin-btn-ghost text-xs"
                        >
                          {emp.active ? "Pasifle" : "Aktifle"}
                        </button>
                        <AdminIconButton
                          label="Sil"
                          variant="danger"
                          onClick={() => void handleDelete(emp)}
                        >
                          <IconTrash />
                        </AdminIconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 space-y-3 lg:hidden">
            {employees.map((emp) => (
              <div key={emp.id} className="admin-card">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-zinc-900">{emp.name}</p>
                    <p className="mt-0.5 font-mono text-xs text-zinc-500">
                      @{emp.username}
                      {emp.shiftCode && (
                        <span className="ml-2 tracking-widest text-zinc-700">
                          ID {emp.shiftCode}
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {SHIFT_LABELS[emp.shift ?? "1"]} · {permissionSummary(emp.permissions)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      emp.active ? "bg-emerald-50 text-emerald-800" : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {emp.active ? "Aktif" : "Pasif"}
                  </span>
                </div>
                <div className="admin-action-icons mt-4">
                  <AdminIconButton label="Düzenle" onClick={() => openEdit(emp)}>
                    <IconEdit />
                  </AdminIconButton>
                  <button
                    type="button"
                    onClick={() => void toggleActive(emp)}
                    className="admin-btn-ghost flex-1 text-xs"
                  >
                    {emp.active ? "Pasifle" : "Aktifle"}
                  </button>
                  <AdminIconButton
                    label="Sil"
                    variant="danger"
                    onClick={() => void handleDelete(emp)}
                  >
                    <IconTrash />
                  </AdminIconButton>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {formMode && (
        <AdminModal
          open
          onClose={closeForm}
          size="lg"
          title={formMode.type === "create" ? "Yeni çalışan" : "Çalışanı düzenle"}
          description={
            formMode.type === "create"
              ? "Personel giriş hesabı ve yetkilerini tanımlayın."
              : "Hesap bilgilerini ve erişim yetkilerini güncelleyin."
          }
        >
          <form onSubmit={handleSubmit} className="admin-modal-form">
            <div className="admin-modal-body space-y-4">
              <div>
                <label className="admin-label">Ad soyad</label>
                <input
                  className="admin-input"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="admin-label">Kullanıcı adı</label>
                <input
                  className="admin-input font-mono text-sm"
                  value={form.username}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, username: e.target.value.toLowerCase() }))
                  }
                  required
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="admin-label">
                  {formMode.type === "create" ? "Şifre" : "Yeni şifre (boş bırakılabilir)"}
                </label>
                <input
                  type="password"
                  className="admin-input"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required={formMode.type === "create"}
                  minLength={formMode.type === "create" ? 4 : undefined}
                />
              </div>

              <div>
                <label className="admin-label" htmlFor="employee-shift">
                  Vardiya
                </label>
                <select
                  id="employee-shift"
                  className="admin-input"
                  value={form.shift}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, shift: e.target.value as EmployeeShift }))
                  }
                >
                  <option value="1">1. Vardiya</option>
                  <option value="2">2. Vardiya</option>
                </select>
                <p className="mt-1 text-xs text-zinc-500">
                  Geç giriş kontrolü, Ayarlar&apos;da bu vardiya için belirlenen mesai
                  başlangıç saatine göre yapılır.
                </p>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3">
                <p className="text-xs font-semibold text-zinc-700">
                  Mesai girişi (giris.dervisplastik.com)
                </p>
                <div className="admin-form-grid mt-3">
                  <div>
                    <label className="admin-label">4 haneli mesai ID</label>
                    <div className="flex gap-2">
                      <input
                        className="admin-input font-mono tracking-[0.3em]"
                        value={form.shiftCode}
                        inputMode="numeric"
                        maxLength={4}
                        placeholder="0000"
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            shiftCode: e.target.value.replace(/\D/g, "").slice(0, 4),
                          }))
                        }
                      />
                      <button
                        type="button"
                        className="admin-btn-secondary shrink-0 px-3 text-xs"
                        onClick={() => void generateShiftCode()}
                      >
                        Üret
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="admin-label">Hitap</label>
                    <select
                      className="admin-input"
                      value={form.honorific}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          honorific: e.target.value as "" | "Bey" | "Hanım",
                        }))
                      }
                    >
                      <option value="">—</option>
                      <option value="Bey">Bey</option>
                      <option value="Hanım">Hanım</option>
                    </select>
                  </div>
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  Personel bu ID ile mesaiye başlar. Boş bırakılırsa yalnızca kullanıcı
                  adı ve şifresiyle giriş yapabilir.
                </p>
              </div>

              <div>
                <label className="admin-label">Yetkiler</label>
                <div className="mt-2">
                  <PermissionEditor
                    value={form.permissions}
                    onChange={(permissions) => setForm((f) => ({ ...f, permissions }))}
                  />
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            <div className="admin-modal-footer">
              <button type="button" onClick={closeForm} className="admin-btn-secondary">
                İptal
              </button>
              <button type="submit" disabled={saving} className="admin-btn-primary">
                {saving ? "Kaydediliyor…" : "Kaydet"}
              </button>
            </div>
          </form>
        </AdminModal>
      )}
    </div>
  );
}
