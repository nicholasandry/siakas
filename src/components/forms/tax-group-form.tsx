"use client";

import { FormSelect } from "@/components/ui/form-select";

type TaxGroupFormValues = {
  id?: string;
  code?: string;
  name?: string;
  assetCategory?: string;
  methodDefault?: string;
  usefulLifeYears?: number | string;
  ratePercent?: string;
  isDepreciable?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  isActive?: boolean;
  notes?: string | null;
};

type TaxGroupFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  values?: TaxGroupFormValues;
  onCancel?: () => void;
};

const fieldClassName =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-950/20";

const textareaClassName =
  "min-h-28 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-950/20";

const assetCategoryOptions = [
  { value: "tanah", label: "Tanah" },
  { value: "bangunan", label: "Bangunan" },
  { value: "kendaraan", label: "Kendaraan" },
  { value: "benda", label: "Benda" },
];

const methodOptions = [
  { value: "garis_lurus", label: "Garis lurus" },
  { value: "saldo_menurun", label: "Saldo menurun" },
  { value: "tidak_disusutkan", label: "Tidak disusutkan" },
];

export function TaxGroupForm({ action, submitLabel, values, onCancel }: TaxGroupFormProps) {
  const isEdit = Boolean(values?.id);

  return (
    <form action={action} className="space-y-6">
      {values?.id ? <input type="hidden" name="id" value={values.id} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>
            Kode <span className="text-rose-600">*</span>
          </span>
          <input
            name="code"
            required
            readOnly={isEdit}
            defaultValue={values?.code}
            className={`${fieldClassName} ${isEdit ? "bg-slate-50 text-slate-600" : ""}`}
            placeholder="building-permanent"
            maxLength={64}
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>
            Nama kelompok <span className="text-rose-600">*</span>
          </span>
          <input name="name" required defaultValue={values?.name} className={fieldClassName} placeholder="Bangunan Permanen" maxLength={160} />
        </label>

        <FormSelect
          name="assetCategory"
          label={
            <>
              Kategori aset <span className="text-rose-600">*</span>
            </>
          }
          defaultValue={values?.assetCategory ?? "bangunan"}
          options={assetCategoryOptions.map((item) => ({ ...item, searchText: item.value }))}
          required
          includeEmptyOption={false}
        />

        <FormSelect
          name="methodDefault"
          label="Metode default"
          defaultValue={values?.methodDefault ?? "garis_lurus"}
          options={methodOptions.map((item) => ({ ...item, searchText: item.value }))}
          required
          includeEmptyOption={false}
        />

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Masa manfaat (tahun)</span>
          <input
            name="usefulLifeYears"
            type="number"
            min={0}
            defaultValue={values?.usefulLifeYears ?? 0}
            className={fieldClassName}
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Tarif (%)</span>
          <input name="ratePercent" defaultValue={values?.ratePercent ?? "0"} className={fieldClassName} placeholder="5.00" />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Berlaku dari</span>
          <input name="effectiveFrom" type="date" required defaultValue={values?.effectiveFrom ?? "2025-01-01"} className={fieldClassName} />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Berlaku sampai</span>
          <input name="effectiveTo" type="date" defaultValue={values?.effectiveTo ?? ""} className={fieldClassName} />
        </label>

        <label className="flex items-center gap-3 text-sm font-medium text-slate-700 md:col-span-2">
          <input type="checkbox" name="isDepreciable" defaultChecked={values?.isDepreciable ?? true} className="h-4 w-4 rounded border-slate-300" />
          Dapat disusutkan
        </label>

        <label className="flex items-center gap-3 text-sm font-medium text-slate-700 md:col-span-2">
          <input type="checkbox" name="isActive" defaultChecked={values?.isActive ?? true} className="h-4 w-4 rounded border-slate-300" />
          Aktif
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
          <span>Catatan</span>
          <textarea name="notes" defaultValue={values?.notes ?? ""} className={textareaClassName} placeholder="Keterangan kelompok fiskal" />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-medium text-white transition-colors hover:bg-slate-800"
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
