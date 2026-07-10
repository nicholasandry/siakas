"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { CheckCircle2, FileText, Plus, ShieldCheck, Trash2, UploadCloud } from "lucide-react";

import { FormFieldError } from "@/components/ui/form-field-error";
import { FieldHelper, FormErrorSummary, RequiredFieldsNote, RequiredMark, SubmitButton, useDirtyFlag } from "@/components/ui/form-ux";
import {
  disposalMethodLabels,
  disposalReasonLabels,
  donationRecipientKindLabels,
  physicalConditionLabels,
} from "@/lib/asset-disposals/constants";
import type { DisposalLookupOption } from "@/lib/asset-disposals/lookups";
import { buildDonationUnitSelectGroups } from "@/lib/asset-disposals/donation-recipient";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  describeDisposalPhysicalConditionSource,
  mapAssetConditionToDisposalPhysicalCondition,
} from "@/lib/assets/disposal-condition";
import { calculateDisposalGainLoss, calculateSaleNetAmount, getGainLossType, toIntegerRupiah } from "@/lib/asset-disposals/calculations";
import { assetStatusLabels, assetTypeLabels, formatRupiahRp, labelFromMap } from "@/lib/formatters";
import { assetDisposalSchema } from "@/lib/validators/asset-disposal";
import { formatZodFieldErrors } from "@/lib/validators/zod-utils";

type AssetDisposalFormProps = {
  action: (formData: FormData) => void;
  asset: {
    id: string;
    code: string;
    name: string;
    assetType: string;
    status: string;
    unitId?: string | null;
    ownershipLevel?: string;
    condition?: string | null;
    acquisitionDate: string | null;
    acquisitionValue: string | null;
    locationName?: string | null;
    unitName?: string | null;
    badanHukumName?: string | null;
  };
  snapshot: {
    acquisitionValue: number;
    accumulatedDepreciationValue: number;
    bookValueAtDisposal: number;
  };
  /** Kondisi fisik terakhir dari riwayat aset; fallback ke asset.condition di form. */
  latestConditionFromHistory?: string | null;
  lookups: {
    disposalReasonTypes: DisposalLookupOption[];
    disposalMethods: DisposalLookupOption[];
    physicalConditions: DisposalLookupOption[];
    buyerTypes: DisposalLookupOption[];
    governmentPolicyTypes: DisposalLookupOption[];
    forcedEventTypes: DisposalLookupOption[];
    disposalDocumentTypes: DisposalLookupOption[];
  };
  units: Array<{ id: string; name: string; kind: string; code: string }>;
  defaultValues?: Record<string, string | number | boolean | null | undefined>;
  serverError?: string;
  submitLabel?: string;
};

const fieldClass = "h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-400";
const areaClass = "min-h-24 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400";
const fileClass =
  "block w-full text-sm text-slate-700 file:mr-3 file:rounded-full file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-800";

const disposalSteps = [
  ["step-asset", "1. Informasi Aset"],
  ["step-method", "2. Alasan & Cara"],
  ["step-detail", "3. Detail Disposal"],
  ["step-documents", "4. Dokumen"],
  ["step-review", "5. Review"],
] as const;

const documentFields = [
  ["physicalInspectionFileId", "Dokumen pemeriksaan fisik"],
  ["deletionMinutesFileId", "Berita acara penghapusan"],
  ["parishPriestMemoFileId", "Memo / otorisasi Rama Paroki"],
  ["bishopApprovalFileId", "Izin Uskup"],
  ["saleProofFileId", "Bukti pembayaran"],
  ["saleReceiptFileId", "Kuitansi / bukti jual"],
  ["handoverDocumentFileId", "Berita acara serah terima"],
  ["exchangeAgreementFileId", "Perjanjian tukar"],
  ["legalDocumentFileId", "Dokumen legal tanah/bangunan"],
  ["lossReportFileId", "Dokumen kehilangan"],
  ["policeReportFileId", "Laporan polisi"],
  ["governmentDocumentFileId", "Dokumen pemerintah"],
  ["inspectionReportFileId", "Berita acara pemeriksaan"],
] as const;

type DisposalDocumentRow = {
  key: string;
  documentField: (typeof documentFields)[number][0];
  notes: string;
};

function optionLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function lookupLabel(option: DisposalLookupOption, fallbackLabels?: Record<string, string>) {
  return option.label || fallbackLabels?.[option.code] || optionLabel(option.code);
}

function getAllowedDisposalMethods(option?: DisposalLookupOption) {
  const value = option?.metadata?.allowedDisposalMethods;
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.length > 0) : [];
}

function Field({
  label,
  children,
  required = false,
  error,
  helper,
}: {
  label: string;
  children: ReactNode;
  required?: boolean;
  error?: string;
  helper?: ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700">
      <span>{label} {required ? <RequiredMark /> : null}</span>
      {children}
      <FieldHelper>{helper}</FieldHelper>
      <FormFieldError message={error} />
    </label>
  );
}

const documentFieldLabels = Object.fromEntries(documentFields) as Record<string, string>;

function DisposalDocumentsField({
  defaultValues,
  documentTypes,
}: {
  defaultValues: AssetDisposalFormProps["defaultValues"];
  documentTypes: DisposalLookupOption[];
}) {
  const documentTypeOptions = documentTypes.filter((item) => item.code in documentFieldLabels);
  const selectableDocumentTypes = documentTypeOptions.length > 0
    ? documentTypeOptions
    : documentFields.map(([code, label], index) => ({
        category: "disposal_document_type" as const,
        code,
        label,
        sortOrder: index + 1,
        isActive: true,
      }));
  const existingDocuments = documentFields
    .map(([name, label]) => ({ name, label: documentTypeOptions.find((item) => item.code === name)?.label ?? label, path: typeof defaultValues?.[name] === "string" ? String(defaultValues[name]) : "" }))
    .filter((item) => item.path);
  const [newRows, setNewRows] = useState<DisposalDocumentRow[]>([
    { key: "disposal-document-0", documentField: "physicalInspectionFileId", notes: "" },
  ]);

  function addRow() {
    setNewRows((rows) => [...rows, { key: `disposal-document-${Date.now()}`, documentField: "physicalInspectionFileId", notes: "" }]);
  }

  function removeRow(key: string) {
    setNewRows((rows) => (rows.length === 1 ? rows : rows.filter((row) => row.key !== key)));
  }

  return (
    <div className="space-y-5">
      {existingDocuments.length > 0 ? (
        <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-700 shadow-sm">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-950">Dokumen tersimpan</p>
              <p className="mt-1 text-xs text-slate-600">{existingDocuments.length} dokumen sudah tercatat untuk pengajuan ini.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {existingDocuments.map((item) => (
              <div key={item.name} className="min-w-0 rounded-lg border border-emerald-100 bg-white p-3 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">{item.label}</p>
                    <p className="mt-1 break-all text-xs leading-5 text-slate-500">{item.path}</p>
                  </div>
                </div>
                <input type="hidden" name={item.name} value={item.path} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/70 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-950">Belum ada dokumen tersimpan</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">Unggah dokumen pendukung agar proses review disposal lebih mudah diverifikasi.</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-950">Tambah lampiran baru</p>
            <p className="mt-1 text-xs text-slate-500">Pilih jenis dokumen, unggah file, dan beri catatan bila perlu.</p>
          </div>
          <button
            type="button"
            onClick={addRow}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Tambah
          </button>
        </div>

        {newRows.map((row, index) => (
          <div key={row.key} className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <UploadCloud className="h-4 w-4" />
                </div>
                <p className="truncate text-sm font-semibold text-slate-950">Lampiran {index + 1}</p>
              </div>
              {newRows.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeRow(row.key)}
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-rose-200 px-2.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
                  title="Hapus baris lampiran"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Hapus
                </button>
              ) : null}
            </div>
            <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                <span>Jenis lampiran</span>
                <select name="newDisposalDocumentField" defaultValue={row.documentField} className={fieldClass}>
                  {selectableDocumentTypes.map((item) => (
                    <option key={item.code} value={item.code}>
                      {lookupLabel(item, documentFieldLabels)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                <span>File</span>
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3">
                  <input
                    type="file"
                    name="newDisposalDocumentFile"
                    accept=".pdf,image/jpeg,image/png,image/webp,image/gif"
                    className={fileClass}
                  />
                </div>
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700 lg:col-span-2">
                <span>Catatan</span>
                <textarea
                  name="newDisposalDocumentNotes"
                  defaultValue={row.notes}
                  className={areaClass}
                  placeholder={`Catatan lampiran ${index + 1}`}
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
        <UploadCloud className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
        <p>Format: PDF, JPG, PNG, WebP, GIF. Maksimal 10 MB per file.</p>
      </div>
    </div>
  );
}

export function AssetDisposalForm({ action, asset, snapshot, latestConditionFromHistory, lookups, units, defaultValues = {}, serverError, submitLabel = "Simpan draft disposal" }: AssetDisposalFormProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [reason, setReason] = useState(String(defaultValues.disposalReasonType ?? "EXPIRED_USEFUL_LIFE"));
  const [method, setMethod] = useState(String(defaultValues.disposalMethod ?? "KEEP_IN_USE"));
  const [donationRecipientKind, setDonationRecipientKind] = useState(
    String(
      defaultValues.donationRecipientKind ??
        (asset.ownershipLevel === "badan_hukum" ? "EXTERNAL_PARTY" : "INTERNAL_UNIT")
    )
  );
  const [recipientUnitId, setRecipientUnitId] = useState(String(defaultValues.recipientUnitId ?? ""));
  const [saleGross, setSaleGross] = useState(String(defaultValues.saleGrossAmount ?? ""));
  const [saleCost, setSaleCost] = useState(String(defaultValues.saleCostAmount ?? "0"));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showErrorSummary, setShowErrorSummary] = useState(Boolean(serverError));
  const [errorSummaryMessage, setErrorSummaryMessage] = useState(serverError ?? "Beberapa field wajib belum diisi. Periksa kembali field yang ditandai.");
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const { markDirty, resetDirty } = useDirtyFlag();

  const isStillUsed = method === "KEEP_IN_USE";
  const saleNet = useMemo(() => calculateSaleNetAmount(saleGross, saleCost), [saleGross, saleCost]);
  const gainLoss = useMemo(() => calculateDisposalGainLoss(saleNet, snapshot.bookValueAtDisposal), [saleNet, snapshot.bookValueAtDisposal]);
  const selectedReasonOption = useMemo(
    () => lookups.disposalReasonTypes.find((item) => item.code === reason),
    [lookups.disposalReasonTypes, reason]
  );
  const filteredDisposalMethods = useMemo(() => {
    const allowedMethods = getAllowedDisposalMethods(selectedReasonOption);
    if (allowedMethods.length === 0) return lookups.disposalMethods;

    return lookups.disposalMethods.filter((item) => allowedMethods.includes(item.code));
  }, [lookups.disposalMethods, selectedReasonOption]);

  const physicalConditionSource = latestConditionFromHistory ?? asset.condition ?? null;
  const disposalPhysicalCondition = useMemo(
    () => mapAssetConditionToDisposalPhysicalCondition(physicalConditionSource),
    [physicalConditionSource]
  );
  const donationUnitGroups = useMemo(
    () => buildDonationUnitSelectGroups(units, { excludeUnitId: asset.unitId }),
    [asset.unitId, units]
  );
  const canDonateToInternalUnit = asset.ownershipLevel !== "badan_hukum";

  function firstAvailableMethod(nextReason: string) {
    const option = lookups.disposalReasonTypes.find((item) => item.code === nextReason);
    const allowedMethods = getAllowedDisposalMethods(option);
    const candidates = allowedMethods.length > 0 ? lookups.disposalMethods.filter((item) => allowedMethods.includes(item.code)) : lookups.disposalMethods;
    return candidates[0]?.code ?? "WRITE_OFF";
  }

  useEffect(() => {
    if (reason === "LOST" || filteredDisposalMethods.some((item) => item.code === method)) return;
    setMethod(filteredDisposalMethods[0]?.code ?? "WRITE_OFF");
  }, [filteredDisposalMethods, method, reason]);

  function handleReasonChange(value: string) {
    setReason(value);
    if (value === "LOST") {
      setMethod("LOST_WRITE_OFF");
      return;
    }

    const allowedMethods = getAllowedDisposalMethods(lookups.disposalReasonTypes.find((item) => item.code === value));
    if (allowedMethods.length > 0 && !allowedMethods.includes(method)) {
      const nextMethod = firstAvailableMethod(value);
      setMethod(nextMethod);
    }
  }

  function clearFieldError(name: string) {
    setFieldErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const formData = new FormData(form);
    const record: Record<string, string> = {};

    for (const [key, value] of formData.entries()) {
      if (typeof value === "string") {
        record[key] = value;
      }
    }

    const result = assetDisposalSchema.safeParse(record);
    if (!result.success) {
      event.preventDefault();
      const nextFieldErrors = formatZodFieldErrors(result.error);
      const firstIssue = result.error.issues[0];
      const firstFieldName = typeof firstIssue?.path[0] === "string" ? firstIssue.path[0] : "";

      setFieldErrors(nextFieldErrors);
      setErrorSummaryMessage(firstIssue?.message ?? "Beberapa field wajib belum diisi. Periksa kembali field yang ditandai.");
      setShowErrorSummary(true);
      window.setTimeout(() => {
        const firstInvalidField = firstFieldName
          ? form.querySelector<HTMLElement>(`[name="${firstFieldName}"]`)
          : null;
        const target = firstInvalidField ?? errorSummaryRef.current;
        target?.focus();
        target?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 0);
      return;
    }

    setShowErrorSummary(false);
    setFieldErrors({});
    resetDirty();
  }

  return (
    <form action={action} onSubmit={handleSubmit} onChange={markDirty} className="space-y-5">
      {defaultValues.id ? <input type="hidden" name="id" value={String(defaultValues.id)} /> : null}
      <input type="hidden" name="assetId" value={asset.id} />
      <input type="hidden" name="isStillUsed" value={isStillUsed ? "true" : "false"} />

      <nav className="sticky top-0 z-20 rounded-lg border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
        <div className="flex flex-wrap gap-2">
          {disposalSteps.map(([href, label]) => (
            <a
              key={href}
              href={`#${href}`}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              {label}
            </a>
          ))}
        </div>
      </nav>
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <RequiredFieldsNote />
      </div>
      <div ref={errorSummaryRef} tabIndex={-1}>
        <FormErrorSummary show={showErrorSummary} message={errorSummaryMessage} />
      </div>

      <section id="step-asset" className="scroll-mt-24 rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold text-slate-950">Step 1 Informasi Aset</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Kode aset", asset.code],
            ["Nama aset", asset.name],
            ["Kategori aset", labelFromMap(asset.assetType, assetTypeLabels)],
            ["Organisasi pemilik", asset.unitName ?? asset.badanHukumName ?? "-"],
            ["Lokasi terakhir", asset.locationName ?? "-"],
            ["Tanggal perolehan", asset.acquisitionDate ?? "-"],
            ["Nilai perolehan", formatRupiahRp(snapshot.acquisitionValue)],
            ["Akumulasi penyusutan", formatRupiahRp(snapshot.accumulatedDepreciationValue)],
            ["Nilai buku saat ini", formatRupiahRp(snapshot.bookValueAtDisposal)],
            ["Status aset saat ini", labelFromMap(asset.status, assetStatusLabels)],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt>
              <dd className="mt-1 text-sm text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section id="step-method" className="scroll-mt-24 rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold text-slate-950">Step 2 Alasan dan Cara Disposal</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Tanggal pengajuan" required error={fieldErrors.requestedAt}>
            <input className={`${fieldClass} ${fieldErrors.requestedAt ? "border-rose-300 focus:border-rose-500" : ""}`} type="date" name="requestedAt" defaultValue={String(defaultValues.requestedAt ?? today)} required aria-invalid={Boolean(fieldErrors.requestedAt)} onChange={() => clearFieldError("requestedAt")} />
          </Field>
          <Field label="Tanggal efektif disposal" required error={fieldErrors.effectiveDisposalDate} helper="Tanggal mulai dampak disposal dicatat.">
            <input className={`${fieldClass} ${fieldErrors.effectiveDisposalDate ? "border-rose-300 focus:border-rose-500" : ""}`} type="date" name="effectiveDisposalDate" defaultValue={String(defaultValues.effectiveDisposalDate ?? today)} required aria-invalid={Boolean(fieldErrors.effectiveDisposalDate)} onChange={() => clearFieldError("effectiveDisposalDate")} />
          </Field>
          <Field label="Alasan disposal" required error={fieldErrors.disposalReasonType}>
            <select className={`${fieldClass} ${fieldErrors.disposalReasonType ? "border-rose-300 focus:border-rose-500" : ""}`} name="disposalReasonType" value={reason} aria-invalid={Boolean(fieldErrors.disposalReasonType)} onChange={(event) => { handleReasonChange(event.target.value); clearFieldError("disposalReasonType"); }}>
              {lookups.disposalReasonTypes.map((item) => (
                <option key={item.code} value={item.code}>{lookupLabel(item, disposalReasonLabels)}</option>
              ))}
            </select>
          </Field>
          <Field label="Cara penyelesaian" required error={fieldErrors.disposalMethod}>
            <select className={`${fieldClass} ${fieldErrors.disposalMethod ? "border-rose-300 focus:border-rose-500" : ""}`} name="disposalMethod" value={method} aria-invalid={Boolean(fieldErrors.disposalMethod)} onChange={(event) => { setMethod(event.target.value); clearFieldError("disposalMethod"); }} disabled={reason === "LOST"}>
              {filteredDisposalMethods.map((item) => (
                <option key={item.code} value={item.code}>{lookupLabel(item, disposalMethodLabels)}</option>
              ))}
            </select>
            {reason === "LOST" ? <input type="hidden" name="disposalMethod" value={method} /> : null}
          </Field>
          <div className="space-y-2 text-sm font-medium text-slate-700">
            <span>Kondisi fisik terakhir</span>
            <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
              {labelFromMap(disposalPhysicalCondition, physicalConditionLabels)}
            </div>
            <FieldHelper>{describeDisposalPhysicalConditionSource(physicalConditionSource)}</FieldHelper>
          </div>
          <div className="md:col-span-2">
            <Field label={isStillUsed ? "Catatan evaluasi / alasan tetap digunakan" : "Catatan disposal"} required error={fieldErrors.disposalNote} helper="Catatan wajib diisi minimal 10 karakter.">
              <textarea className={`${areaClass} ${fieldErrors.disposalNote ? "border-rose-300 focus:border-rose-500" : ""}`} name="disposalNote" defaultValue={String(defaultValues.disposalNote ?? "")} required minLength={10} aria-invalid={Boolean(fieldErrors.disposalNote)} onChange={() => clearFieldError("disposalNote")} />
            </Field>
          </div>
        </div>
      </section>

      <section id="step-detail" className="scroll-mt-24 rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold text-slate-950">Step 3 Detail Disposal</h2>
        {isStillUsed ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Tanggal review berikutnya">
              <input className={fieldClass} type="date" name="nextReviewDate" defaultValue={String(defaultValues.nextReviewDate ?? "")} />
            </Field>
            <Field label="Catatan evaluasi">
              <textarea className={areaClass} name="evaluationNote" defaultValue={String(defaultValues.evaluationNote ?? "")} />
            </Field>
          </div>
        ) : null}

        {method === "SALE" ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Tanggal penjualan"><input className={fieldClass} type="date" name="saleDate" defaultValue={String(defaultValues.saleDate ?? "")} /></Field>
            <Field label="Nama pembeli" required error={fieldErrors.buyerName}><input className={`${fieldClass} ${fieldErrors.buyerName ? "border-rose-300 focus:border-rose-500" : ""}`} name="buyerName" defaultValue={String(defaultValues.buyerName ?? "")} aria-invalid={Boolean(fieldErrors.buyerName)} onChange={() => clearFieldError("buyerName")} /></Field>
            <Field label="Jenis pembeli">
              <select className={fieldClass} name="buyerType" defaultValue={String(defaultValues.buyerType ?? "")}>
                <option value="">Pilih jenis pembeli</option>
                {lookups.buyerTypes.map((item) => <option key={item.code} value={item.code}>{lookupLabel(item)}</option>)}
              </select>
            </Field>
            <Field label="Harga jual bruto" required error={fieldErrors.saleGrossAmount} helper="Isi nilai jual kotor dalam rupiah."><input className={`${fieldClass} ${fieldErrors.saleGrossAmount ? "border-rose-300 focus:border-rose-500" : ""}`} name="saleGrossAmount" inputMode="numeric" value={saleGross} aria-invalid={Boolean(fieldErrors.saleGrossAmount)} onChange={(event) => { setSaleGross(event.target.value); clearFieldError("saleGrossAmount"); }} /></Field>
            <Field label="Biaya penjualan"><input className={fieldClass} name="saleCostAmount" inputMode="numeric" value={saleCost} onChange={(event) => setSaleCost(event.target.value)} /></Field>
            <Field label="Metode pembayaran"><input className={fieldClass} name="salePaymentMethod" defaultValue={String(defaultValues.salePaymentMethod ?? "")} /></Field>
            <Field label="Rekening penerimaan"><input className={fieldClass} name="saleReceivingAccountId" defaultValue={String(defaultValues.saleReceivingAccountId ?? "")} /></Field>
            <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
              Harga jual neto: <strong>{formatRupiahRp(saleNet)}</strong><br />
              Selisih disposal: <strong>{formatRupiahRp(gainLoss)}</strong> ({getGainLossType(gainLoss)})
            </div>
          </div>
        ) : null}

        {method === "DONATION" ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Jenis penerima hibah" required error={fieldErrors.donationRecipientKind}>
              <select
                className={`${fieldClass} ${fieldErrors.donationRecipientKind ? "border-rose-300 focus:border-rose-500" : ""}`}
                name="donationRecipientKind"
                value={donationRecipientKind}
                onChange={(event) => {
                  setDonationRecipientKind(event.target.value);
                  clearFieldError("donationRecipientKind");
                  if (event.target.value === "EXTERNAL_PARTY") {
                    setRecipientUnitId("");
                  }
                }}
              >
                {canDonateToInternalUnit ? <option value="INTERNAL_UNIT">{donationRecipientKindLabels.INTERNAL_UNIT}</option> : null}
                <option value="EXTERNAL_PARTY">{donationRecipientKindLabels.EXTERNAL_PARTY}</option>
              </select>
            </Field>

            {donationRecipientKind === "INTERNAL_UNIT" && canDonateToInternalUnit ? (
              <Field label="Unit penerima" required error={fieldErrors.recipientUnitId}>
                <SearchableSelect
                  name="recipientUnitId"
                  value={recipientUnitId}
                  onChange={(value) => {
                    setRecipientUnitId(value);
                    clearFieldError("recipientUnitId");
                  }}
                  groups={donationUnitGroups}
                  placeholder="Pilih unit penerima"
                  searchPlaceholder="Cari nama atau kode unit..."
                  emptyMessage="Unit tidak ditemukan"
                  required
                />
                <FieldHelper>Unit pengelola aset saat ini tidak ditampilkan dalam daftar.</FieldHelper>
              </Field>
            ) : (
              <>
                <input type="hidden" name="recipientUnitId" value="" />
                <Field label="Nama penerima hibah" required error={fieldErrors.recipientName}>
                  <input
                    className={`${fieldClass} ${fieldErrors.recipientName ? "border-rose-300 focus:border-rose-500" : ""}`}
                    name="recipientName"
                    defaultValue={String(defaultValues.recipientName ?? "")}
                    aria-invalid={Boolean(fieldErrors.recipientName)}
                    onChange={() => clearFieldError("recipientName")}
                  />
                </Field>
              </>
            )}

            <Field label="Tanggal hibah" required error={fieldErrors.donationDate}>
              <input
                className={`${fieldClass} ${fieldErrors.donationDate ? "border-rose-300 focus:border-rose-500" : ""}`}
                type="date"
                name="donationDate"
                defaultValue={String(defaultValues.donationDate ?? "")}
                aria-invalid={Boolean(fieldErrors.donationDate)}
                onChange={() => clearFieldError("donationDate")}
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="Tujuan hibah">
                <textarea className={areaClass} name="donationPurpose" defaultValue={String(defaultValues.donationPurpose ?? "")} />
              </Field>
            </div>
          </div>
        ) : null}

        {method === "EXCHANGE" ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Pihak lawan tukar"><input className={fieldClass} name="exchangePartnerName" defaultValue={String(defaultValues.exchangePartnerName ?? "")} /></Field>
            <Field label="Tanggal pertukaran"><input className={fieldClass} type="date" name="exchangeDate" defaultValue={String(defaultValues.exchangeDate ?? "")} /></Field>
            <Field label="Nilai kesepakatan aset lama"><input className={fieldClass} name="oldAssetAgreedValue" inputMode="numeric" defaultValue={String(defaultValues.oldAssetAgreedValue ?? "")} /></Field>
            <Field label="Nilai kesepakatan aset baru"><input className={fieldClass} name="newAssetAgreedValue" inputMode="numeric" defaultValue={String(defaultValues.newAssetAgreedValue ?? "")} /></Field>
            <Field label="Tambahan kas dibayar"><input className={fieldClass} name="cashPaidAmount" inputMode="numeric" defaultValue={String(defaultValues.cashPaidAmount ?? "0")} /></Field>
            <Field label="Tambahan kas diterima"><input className={fieldClass} name="cashReceivedAmount" inputMode="numeric" defaultValue={String(defaultValues.cashReceivedAmount ?? "0")} /></Field>
            <Field label="ID aset pengganti"><input className={fieldClass} name="replacementAssetId" defaultValue={String(defaultValues.replacementAssetId ?? "")} /></Field>
          </div>
        ) : null}

        {reason === "LOST" ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Tanggal diketahui hilang" required error={fieldErrors.lostDate}><input className={`${fieldClass} ${fieldErrors.lostDate ? "border-rose-300 focus:border-rose-500" : ""}`} type="date" name="lostDate" defaultValue={String(defaultValues.lostDate ?? "")} aria-invalid={Boolean(fieldErrors.lostDate)} onChange={() => clearFieldError("lostDate")} /></Field>
            <Field label="Lokasi terakhir" required error={fieldErrors.lastKnownLocation}><input className={`${fieldClass} ${fieldErrors.lastKnownLocation ? "border-rose-300 focus:border-rose-500" : ""}`} name="lastKnownLocation" defaultValue={String(defaultValues.lastKnownLocation ?? "")} aria-invalid={Boolean(fieldErrors.lastKnownLocation)} onChange={() => clearFieldError("lastKnownLocation")} /></Field>
            <Field label="Penanggung jawab terakhir"><input className={fieldClass} name="lastResponsiblePerson" defaultValue={String(defaultValues.lastResponsiblePerson ?? "")} /></Field>
            <Field label="Nomor berita acara kehilangan"><input className={fieldClass} name="lossReportNumber" defaultValue={String(defaultValues.lossReportNumber ?? "")} /></Field>
            <div className="md:col-span-2"><Field label="Kronologi kehilangan" required error={fieldErrors.lossChronology}><textarea className={`${areaClass} ${fieldErrors.lossChronology ? "border-rose-300 focus:border-rose-500" : ""}`} name="lossChronology" defaultValue={String(defaultValues.lossChronology ?? "")} aria-invalid={Boolean(fieldErrors.lossChronology)} onChange={() => clearFieldError("lossChronology")} /></Field></div>
            <label className="flex items-center gap-3 text-sm font-medium text-slate-700"><input type="checkbox" name="hasInsuranceOrCompensation" defaultChecked={Boolean(defaultValues.hasInsuranceOrCompensation)} /> Ada klaim asuransi / ganti rugi</label>
            <Field label="Nilai klaim / ganti rugi"><input className={fieldClass} name="compensationAmount" inputMode="numeric" defaultValue={String(defaultValues.compensationAmount ?? "")} /></Field>
            <Field label="Pihak pembayar"><input className={fieldClass} name="compensationPayerName" defaultValue={String(defaultValues.compensationPayerName ?? "")} /></Field>
            <Field label="Tanggal penerimaan kompensasi"><input className={fieldClass} type="date" name="compensationReceivedDate" defaultValue={String(defaultValues.compensationReceivedDate ?? "")} /></Field>
          </div>
        ) : null}

        {reason === "GOVERNMENT_POLICY" ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Jenis kebijakan"><select className={fieldClass} name="governmentPolicyType">{lookups.governmentPolicyTypes.map((item) => <option key={item.code} value={item.code}>{lookupLabel(item)}</option>)}</select></Field>
            <Field label="Instansi pemerintah"><input className={fieldClass} name="governmentInstitutionName" defaultValue={String(defaultValues.governmentInstitutionName ?? "")} /></Field>
            <Field label="Nomor surat / keputusan"><input className={fieldClass} name="governmentLetterNumber" defaultValue={String(defaultValues.governmentLetterNumber ?? "")} /></Field>
            <Field label="Tanggal surat / keputusan"><input className={fieldClass} type="date" name="governmentLetterDate" defaultValue={String(defaultValues.governmentLetterDate ?? "")} /></Field>
            <Field label="Aset terdampak"><select className={fieldClass} name="affectedAssetPortion" defaultValue={String(defaultValues.affectedAssetPortion ?? "FULL")}><option value="FULL">Seluruhnya</option><option value="PARTIAL">Sebagian</option></select></Field>
            <Field label="Luas / bagian terdampak"><input className={fieldClass} name="affectedAreaOrQuantity" defaultValue={String(defaultValues.affectedAreaOrQuantity ?? "")} /></Field>
            <Field label="Nilai bagian terdampak"><input className={fieldClass} name="affectedValue" inputMode="numeric" defaultValue={String(defaultValues.affectedValue ?? "")} /></Field>
            <label className="flex items-center gap-3 text-sm font-medium text-slate-700"><input type="checkbox" name="hasGovernmentCompensation" defaultChecked={Boolean(defaultValues.hasGovernmentCompensation)} /> Ada kompensasi pemerintah</label>
            <Field label="Nilai kompensasi"><input className={fieldClass} name="governmentCompensationAmount" inputMode="numeric" defaultValue={String(defaultValues.governmentCompensationAmount ?? "")} /></Field>
            <Field label="Tanggal penerimaan kompensasi"><input className={fieldClass} type="date" name="governmentCompensationReceivedDate" defaultValue={String(defaultValues.governmentCompensationReceivedDate ?? "")} /></Field>
          </div>
        ) : null}

        {reason === "FORCED_EVENT" ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Jenis kejadian"><select className={fieldClass} name="forcedEventType">{lookups.forcedEventTypes.map((item) => <option key={item.code} value={item.code}>{lookupLabel(item)}</option>)}</select></Field>
            <Field label="Tanggal kejadian"><input className={fieldClass} type="date" name="forcedEventDate" defaultValue={String(defaultValues.forcedEventDate ?? "")} /></Field>
            <Field label="Tingkat kerusakan"><input className={fieldClass} name="damageLevel" defaultValue={String(defaultValues.damageLevel ?? "")} /></Field>
            <div className="md:col-span-2"><Field label="Kronologi kejadian"><textarea className={areaClass} name="forcedEventChronology" defaultValue={String(defaultValues.forcedEventChronology ?? "")} /></Field></div>
          </div>
        ) : null}
      </section>

      <section id="step-documents" className="scroll-mt-24 rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step 4</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">Dokumen Pendukung</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Lengkapi bukti pemeriksaan, otorisasi, dan dokumen transaksi sesuai jenis disposal.</p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700">
            <FileText className="h-4 w-4 text-slate-500" />
            Audit-ready
          </div>
        </div>
        <div className="mt-4 space-y-4">
          <DisposalDocumentsField defaultValues={defaultValues} documentTypes={lookups.disposalDocumentTypes} />
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-700 shadow-sm">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-950">Informasi izin Uskup</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">Isi nomor dan tanggal izin bila disposal membutuhkan persetujuan Uskup.</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nomor izin Uskup"><input className={fieldClass} name="bishopApprovalNumber" defaultValue={String(defaultValues.bishopApprovalNumber ?? "")} /></Field>
              <Field label="Tanggal izin Uskup"><input className={fieldClass} type="date" name="bishopApprovalDate" defaultValue={String(defaultValues.bishopApprovalDate ?? "")} /></Field>
            </div>
          </div>
        </div>
      </section>

      <section id="step-review" className="scroll-mt-24 rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold text-slate-950">Step 5 Review dan Submit</h2>
        <div className="mt-4 grid gap-2 text-sm text-slate-700 md:grid-cols-3">
          <p>Nilai perolehan: <strong>{formatRupiahRp(snapshot.acquisitionValue)}</strong></p>
          <p>Akumulasi penyusutan: <strong>{formatRupiahRp(snapshot.accumulatedDepreciationValue)}</strong></p>
          <p>Nilai buku: <strong>{formatRupiahRp(snapshot.bookValueAtDisposal)}</strong></p>
          {method === "SALE" ? <p>Harga neto: <strong>{formatRupiahRp(calculateSaleNetAmount(saleGross, saleCost))}</strong></p> : null}
          {method === "SALE" ? <p>Untung/rugi: <strong>{formatRupiahRp(calculateDisposalGainLoss(toIntegerRupiah(saleGross) - toIntegerRupiah(saleCost), snapshot.bookValueAtDisposal))}</strong></p> : null}
        </div>
        <SubmitButton pendingText="Menyimpan draft..." className="mt-5 h-10 rounded-lg bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400">
          {submitLabel}
        </SubmitButton>
      </section>
    </form>
  );
}
