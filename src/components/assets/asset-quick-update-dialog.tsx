"use client";

import { useMemo, useState } from "react";
import { Sliders } from "lucide-react";

import { quickUpdateAssetStateAction } from "@/app/(dashboard)/assets/actions";
import { Dialog } from "@/components/ui/dialog";
import { FieldHelper } from "@/components/ui/form-ux";
import { FormFieldError } from "@/components/ui/form-field-error";
import { FormSelect, pairsToSelectOptions } from "@/components/ui/form-select";
import {
  buildingConditionSelectPairs,
  itemConditionSelectPairs,
  vehicleConditionSelectPairs,
} from "@/lib/assets/condition-options";
import { hasHistoryValueChanged } from "@/lib/assets/histories.helpers";
import {
  inactiveAssetStatusDescription,
  isFinalDisposalAssetStatus,
  isManuallyEditableAssetStatus,
  normalizeLegacyAssetStatus,
  resolveLoanedTo,
} from "@/lib/assets/status";
import { assetStatusLabels, labelFromMap } from "@/lib/formatters";

type StatusOption = {
  code: string;
  label: string;
};

type AssetQuickUpdateDialogProps = {
  asset: {
    id: string;
    code: string;
    name: string;
    assetType: string;
    status: string;
    condition: string | null;
    loanedTo?: string | null;
  };
  formAssetStatuses: StatusOption[];
  returnPath: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const ASSET_CONDITION_HELPER = "Mencatat kondisi fisik aset. Perubahan disimpan di riwayat kondisi fisik.";
const ASSET_STATUS_HELPER =
  "Mencatat status operasional atau lifecycle aset. Penghapusan atau keluar inventori hanya melalui menu Disposal.";
const INACTIVE_STATUS_HELPER = inactiveAssetStatusDescription;

function getConditionOptions(assetType: string) {
  if (assetType === "bangunan") return buildingConditionSelectPairs;
  if (assetType === "kendaraan") return vehicleConditionSelectPairs;
  if (assetType === "benda") return itemConditionSelectPairs;
  return null;
}

export function AssetQuickUpdateDialog({
  asset,
  formAssetStatuses,
  returnPath,
  open,
  onOpenChange,
}: AssetQuickUpdateDialogProps) {
  const normalizedAssetStatus = normalizeLegacyAssetStatus(asset.status);
  const [status, setStatus] = useState(normalizedAssetStatus);
  const [condition, setCondition] = useState(asset.condition ?? "");
  const [statusNote, setStatusNote] = useState(asset.loanedTo ?? "");
  const [conditionNote, setConditionNote] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const statusEditable = isManuallyEditableAssetStatus(normalizedAssetStatus);
  const conditionOptions = useMemo(() => getConditionOptions(asset.assetType), [asset.assetType]);
  const isTanah = asset.assetType === "tanah";
  const showBorrowerNote = status === "on_loan";
  const showInactiveHelper = status === "inactive";

  function validateClient() {
    const errors: Record<string, string> = {};
    const nextLoanedTo = resolveLoanedTo({
      nextStatus: status,
      previousStatus: normalizedAssetStatus,
      statusNote,
      currentLoanedTo: asset.loanedTo,
    });

    if (status === "on_loan" && status !== normalizedAssetStatus && !statusNote.trim()) {
      errors.statusNote = "Catatan peminjam wajib diisi untuk status dipinjamkan";
    }

    const statusUnchanged = statusEditable ? !hasHistoryValueChanged(normalizedAssetStatus, status) : true;
    const conditionUnchanged = !hasHistoryValueChanged(asset.condition, condition);
    const loanUnchanged = !hasHistoryValueChanged(asset.loanedTo, nextLoanedTo);

    if (statusUnchanged && conditionUnchanged && loanUnchanged) {
      errors.status = "Ubah status operasional, kondisi fisik, atau peminjam terlebih dahulu";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Perbarui status & kondisi"
      description={`${asset.code} — ${asset.name}`}
      className="[&_>div>div]:max-w-xl"
    >
      <form
        action={quickUpdateAssetStateAction}
        className="space-y-5"
        onSubmit={(event) => {
          if (!validateClient()) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="assetId" value={asset.id} />
        <input type="hidden" name="assetType" value={asset.assetType} />
        <input type="hidden" name="currentStatus" value={asset.status} />
        <input type="hidden" name="currentLoanedTo" value={asset.loanedTo ?? ""} />
        <input type="hidden" name="currentCondition" value={asset.condition ?? ""} />
        <input type="hidden" name="returnPath" value={returnPath} />

        <div className="space-y-4">
          {statusEditable ? (
            <FormSelect
              name="status"
              label="Status operasional aset"
              options={pairsToSelectOptions(formAssetStatuses.map((item) => [item.code, item.label]))}
              value={status}
              onChange={setStatus}
              placeholder="Pilih status"
            />
          ) : (
            <>
              <input type="hidden" name="status" value={asset.status} />
              <div className="space-y-2 text-sm font-medium text-slate-700">
                <span>Status operasional aset</span>
                <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
                  {labelFromMap(asset.status, assetStatusLabels)}
                </div>
                <FieldHelper>Status ini dikelola oleh proses disposal.</FieldHelper>
              </div>
            </>
          )}
          {statusEditable ? <FieldHelper>{ASSET_STATUS_HELPER}</FieldHelper> : null}
          {showInactiveHelper ? <FieldHelper>{INACTIVE_STATUS_HELPER}</FieldHelper> : null}
          <FormFieldError message={fieldErrors.status} />

          {isTanah ? (
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Kondisi fisik tanah</span>
              <input
                name="condition"
                value={condition}
                onChange={(event) => setCondition(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-950/20"
                placeholder="misal: Tanah rata/siap bangun, berkontur bukit, rawa..."
                maxLength={64}
              />
            </label>
          ) : (
            <FormSelect
              name="condition"
              label="Kondisi fisik aset"
              options={pairsToSelectOptions(conditionOptions ?? [])}
              value={condition}
              onChange={setCondition}
              placeholder="Pilih kondisi"
              emptyOptionLabel="Kosongkan"
              includeEmptyOption
            />
          )}
          <FieldHelper>{ASSET_CONDITION_HELPER}</FieldHelper>

          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Catatan perubahan kondisi fisik (opsional)</span>
            <textarea
              name="conditionNote"
              value={conditionNote}
              onChange={(event) => setConditionNote(event.target.value)}
              className="min-h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-950/20"
              placeholder="Alasan atau keterangan perubahan kondisi fisik"
            />
          </label>

          {showBorrowerNote ? (
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>
                Dipinjamkan kepada <span className="text-rose-600">*</span>
              </span>
              <input
                name="statusNote"
                value={statusNote}
                onChange={(event) => setStatusNote(event.target.value)}
                className={`h-11 w-full rounded-xl border bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:ring-2 focus:ring-slate-950/20 ${
                  fieldErrors.statusNote ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20" : "border-slate-200 focus:border-slate-400"
                }`}
                placeholder="Nama unit, paroki, atau pihak peminjam"
                aria-invalid={Boolean(fieldErrors.statusNote)}
              />
              <FieldHelper>
                {normalizedAssetStatus === "on_loan"
                  ? "Perubahan peminjam disimpan di riwayat peminjaman."
                  : "Catatan ini disimpan di riwayat status dan peminjaman."}
              </FieldHelper>
              <FormFieldError message={fieldErrors.statusNote} />
            </label>
          ) : (
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Catatan perubahan status (opsional)</span>
              <textarea
                name="statusNote"
                value={statusNote}
                onChange={(event) => setStatusNote(event.target.value)}
                className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-950/20"
                placeholder="Alasan atau keterangan tambahan perubahan status"
              />
            </label>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-10 items-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            type="submit"
            className="inline-flex h-10 items-center rounded-lg bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800"
          >
            Simpan perubahan
          </button>
        </div>
      </form>
    </Dialog>
  );
}

type AssetQuickUpdateButtonProps = {
  asset: AssetQuickUpdateDialogProps["asset"];
  formAssetStatuses: StatusOption[];
  returnPath: string;
};

export function AssetQuickUpdateButton({ asset, formAssetStatuses, returnPath }: AssetQuickUpdateButtonProps) {
  const [open, setOpen] = useState(false);

  if (isFinalDisposalAssetStatus(asset.status)) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-md border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
        title="Ubah Status/Kondisi"
      >
        <Sliders className="h-4 w-4" />
      </button>
      <AssetQuickUpdateDialog
        asset={asset}
        formAssetStatuses={formAssetStatuses}
        returnPath={returnPath}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
