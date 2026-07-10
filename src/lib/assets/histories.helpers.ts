import { normalizeLegacyAssetStatus } from "@/lib/assets/status";

export function normalizeHistoryValue(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function hasHistoryValueChanged(before: string | null | undefined, after: string | null | undefined) {
  return normalizeHistoryValue(before) !== normalizeHistoryValue(after);
}

export function hasStatusHistoryValueChanged(before: string | null | undefined, after: string | null | undefined) {
  return normalizeLegacyAssetStatus(before ?? "active") !== normalizeLegacyAssetStatus(after ?? "active");
}

export function hasPlacementHistoryValueChanged(
  before: { unitId?: string | null; locationId?: string | null },
  after: { unitId?: string | null; locationId?: string | null }
) {
  return (
    normalizeHistoryValue(before.unitId) !== normalizeHistoryValue(after.unitId) ||
    normalizeHistoryValue(before.locationId) !== normalizeHistoryValue(after.locationId)
  );
}

export function resolveRevertStatus(previousStatus: string | null | undefined) {
  return normalizeHistoryValue(previousStatus) ?? "active";
}

export function buildStatusHistoryNote(status: string, statusNote: string | null | undefined) {
  const trimmed = statusNote?.trim();
  if (!trimmed) {
    return null;
  }

  if (status === "on_loan") {
    return `Dipinjamkan kepada: ${trimmed}`;
  }

  return trimmed;
}

export const assetLoanHistoryEventTypes = {
  LOAN_START: "loan_start",
  LOAN_UPDATE: "loan_update",
  LOAN_END: "loan_end",
} as const;

export type AssetLoanHistoryEventType = (typeof assetLoanHistoryEventTypes)[keyof typeof assetLoanHistoryEventTypes];

export function resolveLoanHistoryEventType(
  previousLoanedTo: string | null | undefined,
  nextLoanedTo: string | null | undefined
): AssetLoanHistoryEventType {
  const previous = normalizeHistoryValue(previousLoanedTo);
  const next = normalizeHistoryValue(nextLoanedTo);

  if (!previous && next) {
    return assetLoanHistoryEventTypes.LOAN_START;
  }

  if (previous && !next) {
    return assetLoanHistoryEventTypes.LOAN_END;
  }

  return assetLoanHistoryEventTypes.LOAN_UPDATE;
}
