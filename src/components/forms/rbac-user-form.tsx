"use client";

import { FormSelect } from "@/components/ui/form-select";

const fieldClassName =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";

type RoleOption = { id: string; code: string; name: string };
type UnitOption = { id: string; code: string; name: string };
type BadanHukumOption = { id: string; name: string };

type RbacUserFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  mode?: "create" | "edit";
  values?: {
    id: string;
    name: string;
    email: string;
    roleId: string;
    unitId: string | null;
    badanHukumId: string | null;
    isActive: boolean;
  };
  roleOptions: RoleOption[];
  unitOptions: UnitOption[];
  badanHukumOptions: BadanHukumOption[];
  onCancel?: () => void;
};

export function RbacUserForm({
  action,
  submitLabel,
  mode = "edit",
  values,
  roleOptions,
  unitOptions,
  badanHukumOptions,
  onCancel,
}: RbacUserFormProps) {
  const isCreate = mode === "create";

  return (
    <form action={action} className="space-y-6">
      {values?.id ? <input type="hidden" name="id" value={values.id} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>
            Nama <span className="text-rose-600">*</span>
          </span>
          <input name="name" required defaultValue={values?.name} className={fieldClassName} maxLength={160} />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>
            Email {isCreate ? <span className="text-rose-600">*</span> : null}
          </span>
          {isCreate ? (
            <input
              name="email"
              type="email"
              required
              autoComplete="off"
              className={fieldClassName}
              placeholder="nama@siakas.local"
            />
          ) : (
            <input value={values?.email} disabled className={fieldClassName} />
          )}
        </label>

        {isCreate ? (
          <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
            <span>
              Password awal <span className="text-rose-600">*</span>
            </span>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className={fieldClassName}
              placeholder="Minimal 8 karakter"
            />
          </label>
        ) : null}

        <FormSelect
          name="roleId"
          label={
            <>
              Role <span className="text-rose-600">*</span>
            </>
          }
          defaultValue={values?.roleId}
          options={roleOptions.map((role) => ({
            value: role.id,
            label: `${role.name} (${role.code})`,
            searchText: `${role.name} ${role.code}`,
          }))}
          placeholder="Pilih role"
          required
          includeEmptyOption={false}
        />

        <FormSelect
          name="unitId"
          label="Unit (scope)"
          defaultValue={values?.unitId}
          options={unitOptions.map((unit) => ({
            value: unit.id,
            label: `${unit.name} (${unit.code})`,
            searchText: `${unit.name} ${unit.code}`,
          }))}
          placeholder="— Tidak ada —"
          emptyOptionLabel="— Tidak ada —"
        />

        <FormSelect
          name="badanHukumId"
          label="Badan hukum (scope)"
          labelClassName="space-y-2 text-sm font-medium text-slate-700 md:col-span-2"
          defaultValue={values?.badanHukumId}
          options={badanHukumOptions.map((item) => ({
            value: item.id,
            label: item.name,
            searchText: item.name,
          }))}
          placeholder="— Tidak ada —"
          emptyOptionLabel="— Tidak ada —"
        />
      </div>

      <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={values?.isActive ?? true}
          className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
        />
        Akun aktif
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-medium text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 px-6 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Batal
          </button>
        ) : null}
      </div>
    </form>
  );
}
