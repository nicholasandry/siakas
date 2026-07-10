"use client";

import { assetLocationKindSelectOptions } from "@/lib/assets/location-kind";
import { FormSelect, lookupToSelectOptions, pairsToSelectOptions } from "@/components/ui/form-select";

type UnitOption = {
  id: string;
  name: string;
  code?: string | null;
};

type AssetLocationFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  units: UnitOption[];
  values?: {
    id?: string;
    unitId?: string | null;
    name?: string | null;
    code?: string | null;
    locationKind?: string | null;
    description?: string | null;
    isActive?: boolean | null;
  };
  onCancel?: () => void;
};

const fieldClassName =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20";

const textareaClassName =
  "min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20";

export function AssetLocationForm({ action, submitLabel, units, values, onCancel }: AssetLocationFormProps) {
  return (
    <form action={action} className="space-y-4">
      {values?.id ? <input type="hidden" name="id" value={values.id} /> : null}

      <FormSelect
        name="unitId"
        label="Unit"
        options={lookupToSelectOptions(units)}
        defaultValue={values?.unitId}
        placeholder="Pilih unit"
        emptyOptionLabel="Pilih unit"
        required
      />

      <FormSelect
        name="locationKind"
        label="Kategori penempatan"
        options={pairsToSelectOptions(assetLocationKindSelectOptions)}
        defaultValue={values?.locationKind ?? "ruang"}
        placeholder="Pilih kategori"
        emptyOptionLabel="Pilih kategori"
        required
        helperText="Ruang untuk benda; garasi/area parkir untuk kendaraan."
      />

      <label className="space-y-2 text-sm font-medium text-slate-700">
        <span>Nama lokasi</span>
        <input name="name" required maxLength={160} defaultValue={values?.name ?? ""} className={fieldClassName} placeholder="Ruang sekretariat" />
      </label>

      <label className="space-y-2 text-sm font-medium text-slate-700">
        <span>Kode</span>
        <input name="code" maxLength={64} defaultValue={values?.code ?? ""} className={fieldClassName} placeholder="R-001" />
      </label>

      <label className="space-y-2 text-sm font-medium text-slate-700">
        <span>Keterangan</span>
        <textarea name="description" defaultValue={values?.description ?? ""} className={textareaClassName} placeholder="Catatan lokasi" />
      </label>

      <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          name="isActive"
          value="1"
          defaultChecked={values?.isActive ?? true}
          className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
        />
        Aktif
      </label>

      <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
        {onCancel ? (
          <button type="button" onClick={onCancel} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Batal
          </button>
        ) : null}
        <button type="submit" className="h-10 rounded-lg bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
