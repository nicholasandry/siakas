"use client";

import type { FormEvent } from "react";

import {
  badanHukumFieldOptions,
  badanHukumStatusOptions,
  badanHukumTypeOptions,
} from "@/lib/master-data-options";
import { FormSelect } from "@/components/ui/form-select";
import { FormFieldError } from "@/components/ui/form-field-error";
import { useZodForm } from "@/hooks/use-zod-form";
import { badanHukumFormSchema } from "@/lib/validators/badan-hukum";

type BadanHukumFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  values?: {
    id?: string;
    name?: string;
    type?: string;
    field?: string;
    legalBasis?: string | null;
    kemenkumhamNumber?: string | null;
    establishedAt?: string | null;
    representative?: string | null;
    status?: string | null;
    notes?: string | null;
  };
  onCancel?: () => void;
};

const fieldClassName =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20";

const textareaClassName =
  "min-h-28 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20";

export function BadanHukumForm({ action, submitLabel, values, onCancel }: BadanHukumFormProps) {
  const { fieldErrors, validate, clearFieldError } = useZodForm(badanHukumFormSchema);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const record = Object.fromEntries(formData.entries());

    if (!validate({ ...record, status: record.status || "aktif" })) {
      event.preventDefault();
    }
  }

  return (
    <form action={action} onSubmit={handleSubmit} className="space-y-6">
      {values?.id ? <input type="hidden" name="id" value={values.id} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
          <span>
            Nama badan hukum <span className="text-rose-600">*</span>
          </span>
          <input
            name="name"
            required
            defaultValue={values?.name}
            onChange={() => clearFieldError("name")}
            className={`${fieldClassName} ${fieldErrors.name ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20" : ""}`}
            placeholder="Yayasan Pendidikan Keuskupan Surabaya"
            maxLength={160}
            aria-invalid={Boolean(fieldErrors.name)}
          />
          <FormFieldError message={fieldErrors.name} />
        </label>

        <FormSelect
          name="type"
          label={
            <>
              Jenis <span className="text-rose-600">*</span>
            </>
          }
          defaultValue={values?.type ?? "yayasan"}
          options={badanHukumTypeOptions.map((item) => ({ value: item.value, label: item.label, searchText: item.value }))}
          placeholder="Pilih jenis"
          required
          includeEmptyOption={false}
        />

        <FormSelect
          name="field"
          label={
            <>
              Bidang <span className="text-rose-600">*</span>
            </>
          }
          defaultValue={values?.field ?? "sosial"}
          options={badanHukumFieldOptions.map((item) => ({ value: item.value, label: item.label, searchText: item.value }))}
          placeholder="Pilih bidang"
          required
          includeEmptyOption={false}
        />

        <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
          <span>Dasar hukum pendirian</span>
          <textarea
            name="legalBasis"
            defaultValue={values?.legalBasis ?? ""}
            className={textareaClassName}
            placeholder="Akta pendirian, SK, atau dasar hukum lainnya"
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Nomor SK Kemenkumham</span>
          <input
            name="kemenkumhamNumber"
            defaultValue={values?.kemenkumhamNumber ?? ""}
            className={fieldClassName}
            placeholder="AHU-0000000.AH.01.01.TAHUN 2025"
            maxLength={100}
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Tanggal pendirian</span>
          <input
            name="establishedAt"
            type="date"
            defaultValue={values?.establishedAt ?? ""}
            className={fieldClassName}
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
          <span>Pembina / pengurus mewakili keuskupan</span>
          <input
            name="representative"
            defaultValue={values?.representative ?? ""}
            className={fieldClassName}
            placeholder="Uskup / Ketua yayasan / Pengurus"
            maxLength={160}
          />
        </label>

        <FormSelect
          name="status"
          label="Status terkini"
          defaultValue={values?.status ?? "aktif"}
          options={badanHukumStatusOptions.map((item) => ({ value: item.value, label: item.label, searchText: item.value }))}
          placeholder="Pilih status"
          includeEmptyOption={false}
        />

        <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
          <span>Catatan</span>
          <textarea
            name="notes"
            defaultValue={values?.notes ?? ""}
            className={textareaClassName}
            placeholder="Catatan tambahan internal"
          />
        </label>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          >
            Batal
          </button>
        ) : null}
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-medium text-white transition-colors hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
