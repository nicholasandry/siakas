"use client";

import { FormSelect } from "@/components/ui/form-select";

type TaxRuleFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  groupId: string;
  values?: {
    id?: string;
    taxYear?: number | string;
    method?: string;
    usefulLifeYears?: number | string;
    ratePercent?: string;
    residualValuePercent?: string | null;
    sourceRegulation?: string;
    effectiveFrom?: string;
    effectiveTo?: string | null;
    isActive?: boolean;
    notes?: string | null;
  };
  onCancel?: () => void;
};

const fieldClassName =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-950/20";

const textareaClassName =
  "min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-950/20";

const methodOptions = [
  { value: "garis_lurus", label: "Garis lurus" },
  { value: "saldo_menurun", label: "Saldo menurun" },
  { value: "tidak_disusutkan", label: "Tidak disusutkan" },
];

export function TaxRuleForm({ action, submitLabel, groupId, values, onCancel }: TaxRuleFormProps) {
  return (
    <form action={action} className="space-y-4">
      {values?.id ? <input type="hidden" name="id" value={values.id} /> : null}
      <input type="hidden" name="groupId" value={groupId} />

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>
            Tahun pajak <span className="text-rose-600">*</span>
          </span>
          <input
            name="taxYear"
            type="number"
            required
            min={2000}
            max={2100}
            defaultValue={values?.taxYear ?? new Date().getFullYear()}
            className={fieldClassName}
          />
        </label>

        <FormSelect
          name="method"
          label="Metode"
          defaultValue={values?.method ?? "garis_lurus"}
          options={methodOptions.map((item) => ({ ...item, searchText: item.value }))}
          required
          includeEmptyOption={false}
        />

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Masa manfaat (tahun)</span>
          <input name="usefulLifeYears" type="number" min={0} defaultValue={values?.usefulLifeYears ?? 0} className={fieldClassName} />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Tarif (%)</span>
          <input name="ratePercent" required defaultValue={values?.ratePercent ?? "0"} className={fieldClassName} />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Nilai residu (%)</span>
          <input name="residualValuePercent" defaultValue={values?.residualValuePercent ?? "0"} className={fieldClassName} />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>
            Dasar regulasi <span className="text-rose-600">*</span>
          </span>
          <input
            name="sourceRegulation"
            required
            defaultValue={values?.sourceRegulation ?? "PMK 81 Tahun 2024"}
            className={fieldClassName}
            placeholder="PMK 81 Tahun 2024"
          />
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
          <input type="checkbox" name="isActive" defaultChecked={values?.isActive ?? true} className="h-4 w-4 rounded border-slate-300" />
          Aktif
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
          <span>Catatan</span>
          <textarea name="notes" defaultValue={values?.notes ?? ""} className={textareaClassName} />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-medium text-white hover:bg-slate-800"
        >
          {submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 px-5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Batal
          </button>
        ) : null}
      </div>
    </form>
  );
}
