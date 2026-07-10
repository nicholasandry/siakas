import { normalizeHistoryValue } from "@/lib/assets/histories.helpers";

export const finalDisposalAssetStatuses = ["sold", "donated", "exchanged", "lost", "written_off", "disposed"] as const;
export const activeOperationalAssetStatuses = ["active", "on_loan", "in_maintenance", "expired_still_used", "under_disposal"] as const;
export const manuallyEditableAssetStatuses = ["active", "on_loan", "in_maintenance", "inactive"] as const;
export const legacyInactiveAssetStatuses = ["archived"] as const;
export const disposalOnlyAssetStatuses = ["under_disposal", "expired_still_used", ...finalDisposalAssetStatuses] as const;

export type ManuallyEditableAssetStatus = (typeof manuallyEditableAssetStatuses)[number];

export const inactiveAssetStatusDescription =
  "Aset masih dimiliki dan tercatat, tetapi tidak aktif dipakai. Ini berbeda dari Disposal.";

export function normalizeLegacyAssetStatus(status: string | null | undefined) {
  if (status === "archived") {
    return "inactive";
  }

  return status ?? "active";
}

export function isInactiveAssetStatus(status: string | null | undefined) {
  return normalizeLegacyAssetStatus(status) === "inactive";
}

export function isFinalDisposalAssetStatus(status: string | null | undefined) {
  return finalDisposalAssetStatuses.includes(status as (typeof finalDisposalAssetStatuses)[number]);
}

export function isAssetVisibleInActiveList(status: string | null | undefined) {
  return !isFinalDisposalAssetStatus(status);
}

export function isActiveOperationalAssetStatus(status: string | null | undefined) {
  return activeOperationalAssetStatuses.includes(status as (typeof activeOperationalAssetStatuses)[number]);
}

export function isManuallyEditableAssetStatus(status: string | null | undefined) {
  return manuallyEditableAssetStatuses.includes(status as ManuallyEditableAssetStatus);
}

export function isStatusManagedByDisposal(status: string | null | undefined) {
  return status === "under_disposal" || isFinalDisposalAssetStatus(status);
}

export const disposalBlockedAssetStatuses = ["on_loan"] as const;

export type AssetDisposalBlockReason = "active_disposal" | "final_status" | "on_loan";

export function getAssetDisposalBlockReason(
  status: string | null | undefined,
  hasActiveDisposal: boolean
): AssetDisposalBlockReason | null {
  if (hasActiveDisposal) {
    return "active_disposal";
  }

  if (isFinalDisposalAssetStatus(status)) {
    return "final_status";
  }

  const normalizedStatus = normalizeLegacyAssetStatus(status);
  if (disposalBlockedAssetStatuses.includes(normalizedStatus as (typeof disposalBlockedAssetStatuses)[number])) {
    return "on_loan";
  }

  return null;
}

export function canStartAssetDisposalFromAssetStatus(status: string | null | undefined, hasActiveDisposal: boolean) {
  return getAssetDisposalBlockReason(status, hasActiveDisposal) === null;
}

export function assertCanStartAssetDisposal(status: string | null | undefined, hasActiveDisposal: boolean) {
  const reason = getAssetDisposalBlockReason(status, hasActiveDisposal);
  if (reason === "on_loan") {
    throw new Error("Aset yang sedang dipinjamkan tidak dapat diajukan disposal. Kembalikan aset terlebih dahulu.");
  }
  if (reason === "active_disposal") {
    throw new Error("Aset sudah memiliki disposal aktif");
  }
  if (reason === "final_status") {
    throw new Error("Aset dengan status keluar inventori tidak dapat diajukan disposal lagi");
  }
}

export function normalizeAssetLoanedTo(status: string | null | undefined, loanedTo: string | null | undefined) {
  const normalizedStatus = normalizeLegacyAssetStatus(status);
  if (normalizedStatus !== "on_loan") {
    return null;
  }

  return normalizeHistoryValue(loanedTo);
}

export function assertLoanedToInvariant(status: string | null | undefined, loanedTo: string | null | undefined) {
  const normalizedStatus = normalizeLegacyAssetStatus(status);
  const normalizedLoanedTo = normalizeHistoryValue(loanedTo);

  if (normalizedStatus === "on_loan" && !normalizedLoanedTo) {
    throw new Error("Peminjam wajib diisi saat status dipinjamkan");
  }
}

export function assertManuallyEditableAssetStatus(code: string) {
  if (!isManuallyEditableAssetStatus(code)) {
    throw new Error(
      "Status ini tidak dapat diubah manual. Gunakan menu Disposal untuk penghapusan, penjualan, hibah, atau status keluar inventori lainnya."
    );
  }
}

export function assertOnLoanStatusNote(input: {
  nextStatus: string;
  currentStatus?: string | null;
  statusNote?: string | null;
}) {
  const nextStatus = normalizeLegacyAssetStatus(input.nextStatus);
  const currentStatus = normalizeLegacyAssetStatus(input.currentStatus || "active");

  if (nextStatus === "on_loan" && nextStatus !== currentStatus && !input.statusNote?.trim()) {
    throw new Error("Catatan peminjam wajib diisi untuk status dipinjamkan");
  }
}

export function resolveLoanedTo(input: {
  nextStatus: string;
  previousStatus?: string | null;
  statusNote?: string | null;
  currentLoanedTo?: string | null;
}) {
  const nextStatus = normalizeLegacyAssetStatus(input.nextStatus);
  if (nextStatus !== "on_loan") {
    return normalizeAssetLoanedTo(nextStatus, null);
  }

  const note = input.statusNote?.trim();
  if (note) {
    return normalizeAssetLoanedTo(nextStatus, note);
  }

  if (normalizeLegacyAssetStatus(input.previousStatus) === "on_loan") {
    return normalizeAssetLoanedTo(nextStatus, input.currentLoanedTo);
  }

  return normalizeAssetLoanedTo(nextStatus, null);
}

export function getStartAssetDisposalHref(assetId: string) {
  return `/assets/${assetId}/disposal/new`;
}
