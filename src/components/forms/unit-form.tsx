"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { FormFieldError } from "@/components/ui/form-field-error";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useZodForm } from "@/hooks/use-zod-form";
import {
  getLegalParentTypeLabel,
  getUnitKindLabel,
  legalParentTypeOptionsSorted,
  unitKindOptionsSorted,
  unitWorkCategoryOptionsSorted,
  type UnitKind,
} from "@/lib/master-data-options";
import {
  buildBadanHukumLegalParentOptions,
  buildGroupedParentOptions,
  buildUnitRefLegalParentOptions,
  isKindUnderKeuskupan,
  isKindWithCategory,
  KEUSKUPAN_KIND,
  type BadanHukumOption,
  type UnitParentOption,
} from "@/lib/unit-rules";
import { getBlockedParentIds } from "@/lib/unit-tree";
import { unitFormSchema } from "@/lib/validators/unit";

type KeuskupanUnit = {
  id: string;
  name: string;
  code: string;
};

type UnitFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  values?: {
    id?: string;
    code?: string;
    name?: string;
    kind?: string;
    category?: string | null;
    parentId?: string | null;
    legalParentType?: string | null;
    legalParentUnitId?: string | null;
    legalParentBadanHukumId?: string | null;
    legalParentLabel?: string | null;
    address?: string | null;
    responsiblePerson?: string | null;
    notes?: string | null;
  };
  parentOptions: UnitParentOption[];
  badanHukumOptions: BadanHukumOption[];
  keuskupanUnit: KeuskupanUnit | null;
  onCancel?: () => void;
};

const fieldClassName =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";

const textareaClassName =
  "min-h-28 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20";

const BADAN_HUKUM_LEGAL_TYPES = ["yayasan", "pt", "cv", "koperasi"] as const;

export function UnitForm({
  action,
  submitLabel,
  values,
  parentOptions,
  badanHukumOptions,
  keuskupanUnit,
  onCancel,
}: UnitFormProps) {
  const isEditingKeuskupan = values?.kind === KEUSKUPAN_KIND;
  const initialKind = values?.kind ?? (keuskupanUnit ? "paroki" : KEUSKUPAN_KIND);

  const [kind, setKind] = useState(initialKind);
  const [parentId, setParentId] = useState(values?.parentId ?? "");
  const [category, setCategory] = useState(values?.category ?? "");
  const [legalParentType, setLegalParentType] = useState(values?.legalParentType ?? "langsung_keuskupan");
  const [legalParentUnitId, setLegalParentUnitId] = useState(values?.legalParentUnitId ?? "");
  const [legalParentBadanHukumId, setLegalParentBadanHukumId] = useState(values?.legalParentBadanHukumId ?? "");
  const [legalParentLabel, setLegalParentLabel] = useState(values?.legalParentLabel ?? "");
  const { fieldErrors, validate, clearFieldError } = useZodForm(unitFormSchema);

  const isKeuskupan = kind === KEUSKUPAN_KIND;
  const showAutoKeuskupanParent = isKindUnderKeuskupan(kind);
  const showCategory = isKindWithCategory(kind);
  const showGroupedParent = showCategory;

  const showLegalParentKevikepan = !isKeuskupan && legalParentType === "langsung_kevikepan";
  const showLegalParentParoki = !isKeuskupan && legalParentType === "langsung_paroki";
  const showLegalParentBadanHukum = !isKeuskupan && BADAN_HUKUM_LEGAL_TYPES.includes(legalParentType as (typeof BADAN_HUKUM_LEGAL_TYPES)[number]);
  const showLegalParentLabel = !isKeuskupan && (legalParentType === "belum_jelas" || legalParentType === "lainnya");

  const kindOptions = useMemo(() => {
    const options = unitKindOptionsSorted.map((item) => ({
      value: item.value,
      label: item.label,
      searchText: item.value,
    }));

    if (keuskupanUnit && !isEditingKeuskupan) {
      return options.filter((item) => item.value !== KEUSKUPAN_KIND);
    }

    return options;
  }, [isEditingKeuskupan, keuskupanUnit]);

  const blockedParentIds = useMemo(() => {
    if (!values?.id) {
      return new Set<string>();
    }

    return getBlockedParentIds(parentOptions, values.id);
  }, [parentOptions, values?.id]);

  const groupedParentOptions = useMemo(() => {
    const grouped = buildGroupedParentOptions(parentOptions);

    if (blockedParentIds.size === 0) {
      return grouped;
    }

    return grouped
      .map((group) => ({
        ...group,
        options: group.options.filter((option) => !blockedParentIds.has(option.value)),
      }))
      .filter((group) => group.options.length > 0);
  }, [parentOptions, blockedParentIds]);

  const categoryOptions = useMemo(
    () =>
      unitWorkCategoryOptionsSorted.map((item) => ({
        value: item.value,
        label: item.label,
        searchText: item.value,
      })),
    []
  );

  const legalParentTypeSelectOptions = useMemo(
    () =>
      legalParentTypeOptionsSorted.map((item) => ({
        value: item.value,
        label: item.label,
        searchText: item.value,
      })),
    []
  );

  const kevikepanLegalOptions = useMemo(
    () => buildUnitRefLegalParentOptions(parentOptions, "kevikepan"),
    [parentOptions]
  );

  const parokiLegalOptions = useMemo(
    () => buildUnitRefLegalParentOptions(parentOptions, "paroki"),
    [parentOptions]
  );

  const badanHukumLegalOptions = useMemo(
    () => buildBadanHukumLegalParentOptions(badanHukumOptions, legalParentType),
    [badanHukumOptions, legalParentType]
  );

  useEffect(() => {
    if (showAutoKeuskupanParent && keuskupanUnit) {
      setParentId(keuskupanUnit.id);
      setCategory("");
      return;
    }

    if (isKeuskupan) {
      setParentId("");
      setCategory("");
      return;
    }

    if (!showCategory) {
      setCategory("");
    }
  }, [isKeuskupan, keuskupanUnit, showAutoKeuskupanParent, showCategory]);

  const prevLegalParentType = useRef(legalParentType);

  useEffect(() => {
    if (isKeuskupan) {
      return;
    }

    if (prevLegalParentType.current === legalParentType) {
      return;
    }

    prevLegalParentType.current = legalParentType;
    setLegalParentUnitId("");
    setLegalParentBadanHukumId("");
    setLegalParentLabel("");
  }, [isKeuskupan, legalParentType]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const record = Object.fromEntries(formData.entries());

    if (!validate(record)) {
      event.preventDefault();
    }
  }

  return (
    <form action={action} onSubmit={handleSubmit} className="space-y-6">
      {values?.id ? <input type="hidden" name="id" value={values.id} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>
            Kode unit <span className="text-rose-600">*</span>
          </span>
          <input
            name="code"
            required
            defaultValue={values?.code}
            onChange={() => clearFieldError("code")}
            className={`${fieldClassName} ${fieldErrors.code ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20" : ""}`}
            placeholder="PAROKI-KATEDRAL"
            maxLength={64}
            autoComplete="off"
            aria-invalid={Boolean(fieldErrors.code)}
          />
          <FormFieldError message={fieldErrors.code} />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>
            Nama unit <span className="text-rose-600">*</span>
          </span>
          <input
            name="name"
            required
            defaultValue={values?.name}
            onChange={() => clearFieldError("name")}
            className={`${fieldClassName} ${fieldErrors.name ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20" : ""}`}
            placeholder="Paroki Katedral"
            maxLength={160}
            aria-invalid={Boolean(fieldErrors.name)}
          />
          <FormFieldError message={fieldErrors.name} />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
          <span>
            Jenis unit <span className="text-rose-600">*</span>
          </span>
          {isEditingKeuskupan ? (
            <>
              <input type="hidden" name="kind" value={KEUSKUPAN_KIND} />
              <div className={fieldClassName}>{getUnitKindLabel(KEUSKUPAN_KIND)}</div>
              <p className="text-xs font-normal text-slate-500">Unit keuskupan tidak boleh diubah jenisnya.</p>
            </>
          ) : (
            <SearchableSelect
              name="kind"
              value={kind}
              onChange={(nextKind) => setKind(nextKind as UnitKind)}
              options={kindOptions}
              placeholder="Pilih jenis unit"
              searchPlaceholder="Cari jenis unit..."
              required
            />
          )}
        </label>

        {showCategory ? (
          <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
            <span>
              Kategori unit <span className="text-rose-600">*</span>
            </span>
            <SearchableSelect
              name="category"
              value={category}
              onChange={setCategory}
              options={categoryOptions}
              placeholder="Pilih kategori unit"
              searchPlaceholder="Cari kategori..."
              required
            />
          </label>
        ) : null}

        <div className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
          <span>Unit induk</span>

          {isKeuskupan ? (
            <>
              <input type="hidden" name="parentId" value="" />
              <div className={fieldClassName}>Keuskupan adalah root (tanpa induk)</div>
              <p className="text-xs font-normal text-slate-500">Hanya boleh ada satu unit keuskupan dalam sistem.</p>
            </>
          ) : showAutoKeuskupanParent ? (
            <>
              <input type="hidden" name="parentId" value={keuskupanUnit?.id ?? ""} />
              <div className={fieldClassName}>
                {keuskupanUnit ? `${keuskupanUnit.name} (${keuskupanUnit.code})` : "Unit keuskupan belum tersedia"}
              </div>
              <p className="text-xs font-normal text-slate-500">
                {getUnitKindLabel(kind)} otomatis berada di bawah keuskupan.
              </p>
            </>
          ) : showGroupedParent ? (
            <>
              <SearchableSelect
                name="parentId"
                value={parentId}
                onChange={setParentId}
                groups={groupedParentOptions}
                placeholder="Pilih unit induk"
                searchPlaceholder="Cari unit induk..."
                required
              />
              <p className="text-xs font-normal text-slate-500">
                Unit dikelompokkan berdasarkan jenis. Pilih parent langsung tanpa membuat looping hierarki.
              </p>
            </>
          ) : (
            <SearchableSelect
              name="parentId"
              value={parentId}
              onChange={setParentId}
              groups={groupedParentOptions}
              placeholder="Pilih unit induk"
              searchPlaceholder="Cari unit induk..."
            />
          )}
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 md:col-span-2">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-800">Induk hukum</p>
            <p className="text-xs font-normal text-slate-500">
              Menentukan di bawah ijin hukum mana unit ini berada (bisa berbeda dari unit induk organisasi).
            </p>
          </div>

          {isKeuskupan ? (
            <>
              <input type="hidden" name="legalParentType" value="langsung_keuskupan" />
              <input type="hidden" name="legalParentUnitId" value="" />
              <input type="hidden" name="legalParentBadanHukumId" value="" />
              <input type="hidden" name="legalParentLabel" value="" />
              <div className={fieldClassName}>{getLegalParentTypeLabel("langsung_keuskupan")}</div>
            </>
          ) : (
            <>
              <label className="block space-y-2 text-sm font-medium text-slate-700">
                <span>
                  Jenis induk hukum <span className="text-rose-600">*</span>
                </span>
                <SearchableSelect
                  name="legalParentType"
                  value={legalParentType}
                  onChange={setLegalParentType}
                  options={legalParentTypeSelectOptions}
                  placeholder="Pilih induk hukum"
                  searchPlaceholder="Cari jenis induk hukum..."
                  required
                />
              </label>

              {showLegalParentKevikepan ? (
                <label className="block space-y-2 text-sm font-medium text-slate-700">
                  <span>
                    Nama kevikepan <span className="text-rose-600">*</span>
                  </span>
                  <SearchableSelect
                    name="legalParentUnitId"
                    value={legalParentUnitId}
                    onChange={setLegalParentUnitId}
                    options={kevikepanLegalOptions}
                    placeholder="Pilih kevikepan"
                    searchPlaceholder="Cari kevikepan..."
                    emptyMessage="Belum ada unit kevikepan"
                    required
                  />
                  <input type="hidden" name="legalParentBadanHukumId" value="" />
                  <input type="hidden" name="legalParentLabel" value="" />
                </label>
              ) : null}

              {showLegalParentParoki ? (
                <label className="block space-y-2 text-sm font-medium text-slate-700">
                  <span>
                    Nama paroki <span className="text-rose-600">*</span>
                  </span>
                  <SearchableSelect
                    name="legalParentUnitId"
                    value={legalParentUnitId}
                    onChange={setLegalParentUnitId}
                    options={parokiLegalOptions}
                    placeholder="Pilih paroki"
                    searchPlaceholder="Cari paroki..."
                    emptyMessage="Belum ada unit paroki"
                    required
                  />
                  <input type="hidden" name="legalParentBadanHukumId" value="" />
                  <input type="hidden" name="legalParentLabel" value="" />
                </label>
              ) : null}

              {showLegalParentBadanHukum ? (
                <label className="block space-y-2 text-sm font-medium text-slate-700">
                  <span>
                    Nama badan hukum <span className="text-rose-600">*</span>
                  </span>
                  <SearchableSelect
                    name="legalParentBadanHukumId"
                    value={legalParentBadanHukumId}
                    onChange={setLegalParentBadanHukumId}
                    options={badanHukumLegalOptions}
                    placeholder={`Pilih ${getLegalParentTypeLabel(legalParentType).toLowerCase()}`}
                    searchPlaceholder="Cari badan hukum..."
                    emptyMessage="Belum ada badan hukum dengan jenis ini"
                    required
                  />
                  <input type="hidden" name="legalParentUnitId" value="" />
                  <input type="hidden" name="legalParentLabel" value="" />
                </label>
              ) : null}

              {showLegalParentLabel ? (
                <label className="block space-y-2 text-sm font-medium text-slate-700">
                  <span>Nama induk hukum</span>
                  <input
                    name="legalParentLabel"
                    value={legalParentLabel}
                    onChange={(event) => setLegalParentLabel(event.target.value)}
                    className={fieldClassName}
                    placeholder="Opsional — isi jika sudah diketahui"
                    maxLength={191}
                  />
                  <input type="hidden" name="legalParentUnitId" value="" />
                  <input type="hidden" name="legalParentBadanHukumId" value="" />
                </label>
              ) : null}

              {legalParentType === "langsung_keuskupan" ? (
                <>
                  <input type="hidden" name="legalParentUnitId" value="" />
                  <input type="hidden" name="legalParentBadanHukumId" value="" />
                  <input type="hidden" name="legalParentLabel" value="" />
                  <p className="text-xs font-normal text-slate-500">
                    Unit berada langsung di bawah ijin hukum keuskupan.
                  </p>
                </>
              ) : null}
            </>
          )}
        </div>

        <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
          <span>Alamat</span>
          <textarea
            name="address"
            defaultValue={values?.address ?? ""}
            className={textareaClassName}
            placeholder="Alamat lengkap unit"
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Penanggung jawab</span>
          <input
            name="responsiblePerson"
            defaultValue={values?.responsiblePerson ?? ""}
            className={fieldClassName}
            placeholder="Romo / Ketua / Pengurus"
            maxLength={160}
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
          <span>Catatan</span>
          <textarea
            name="notes"
            defaultValue={values?.notes ?? ""}
            className={textareaClassName}
            placeholder="Catatan internal"
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
