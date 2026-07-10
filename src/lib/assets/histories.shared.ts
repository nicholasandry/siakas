export const assetHistorySources = {
  MANUAL: "manual",
  DISPOSAL_START: "disposal_start",
  DISPOSAL_COMPLETE: "disposal_complete",
  DISPOSAL_CANCEL: "disposal_cancel",
  DISPOSAL_REJECT: "disposal_reject",
  SYSTEM: "system",
} as const;

export type AssetHistorySource = (typeof assetHistorySources)[keyof typeof assetHistorySources];

export const assetHistoryEntityTypes = {
  ASSET_DISPOSAL: "asset_disposal",
} as const;

export const assetHistorySourceLabels: Record<AssetHistorySource, string> = {
  manual: "Perubahan manual",
  disposal_start: "Mulai proses disposal",
  disposal_complete: "Disposal selesai",
  disposal_cancel: "Disposal dibatalkan",
  disposal_reject: "Disposal ditolak",
  system: "Sistem",
};

export const assetLoanHistoryEventLabels: Record<string, string> = {
  loan_start: "Mulai dipinjamkan",
  loan_update: "Perubahan peminjam",
  loan_end: "Pengembalian / selesai dipinjamkan",
};

export const assetPlacementHistorySources = {
  MANUAL: "manual",
  DONATION_INTERNAL: "donation_internal",
  SYSTEM: "system",
} as const;

export type AssetPlacementHistorySource = (typeof assetPlacementHistorySources)[keyof typeof assetPlacementHistorySources];

export const assetPlacementHistorySourceLabels: Record<AssetPlacementHistorySource, string> = {
  manual: "Perubahan manual",
  donation_internal: "Hibah internal antar unit",
  system: "Sistem",
};

export function resolveAssetHistorySourceLabel(source: string) {
  if (source in assetHistorySourceLabels) {
    return assetHistorySourceLabels[source as AssetHistorySource];
  }
  if (source in assetPlacementHistorySourceLabels) {
    return assetPlacementHistorySourceLabels[source as AssetPlacementHistorySource];
  }
  return source;
}

export const ASSET_HISTORY_PREVIEW_LIMIT = 5;
export const ASSET_HISTORY_PREVIEW_FETCH_SIZE = 12;
export const ASSET_HISTORY_PAGE_SIZE = 20;

export type AssetHistoryFilter = "all" | "status" | "condition" | "loan" | "placement" | "disposal";

export const assetHistoryFilterOptions: Array<{ value: AssetHistoryFilter; label: string }> = [
  { value: "all", label: "Semua" },
  { value: "status", label: "Status" },
  { value: "condition", label: "Kondisi fisik" },
  { value: "loan", label: "Peminjaman" },
  { value: "placement", label: "Penempatan" },
  { value: "disposal", label: "Audit status disposal" },
];

export function isDisposalHistorySource(source: string) {
  return source.startsWith("disposal_");
}

export function isOperationalStatusHistoryItem(item: UnifiedAssetHistoryItem) {
  return item.kind === "status" && !isDisposalHistorySource(item.source);
}

export function isDisposalHistoryItem(item: UnifiedAssetHistoryItem) {
  return item.kind === "status" && isDisposalHistorySource(item.source);
}

export function parseAssetHistoryFilter(value: string | undefined): AssetHistoryFilter {
  if (
    value === "status" ||
    value === "condition" ||
    value === "loan" ||
    value === "placement" ||
    value === "disposal"
  ) {
    return value;
  }
  return "all";
}

export function countAssetHistoryByFilter(items: UnifiedAssetHistoryItem[]): Record<AssetHistoryFilter, number> {
  return {
    all: items.length,
    status: items.filter(isOperationalStatusHistoryItem).length,
    condition: items.filter((item) => item.kind === "condition").length,
    loan: items.filter((item) => item.kind === "loan").length,
    placement: items.filter((item) => item.kind === "placement").length,
    disposal: items.filter(isDisposalHistoryItem).length,
  };
}

export function filterAssetHistoryItems(items: UnifiedAssetHistoryItem[], filter: AssetHistoryFilter) {
  if (filter === "all") {
    return items;
  }
  if (filter === "status") {
    return items.filter(isOperationalStatusHistoryItem);
  }
  if (filter === "disposal") {
    return items.filter(isDisposalHistoryItem);
  }
  return items.filter((item) => item.kind === filter);
}

export type AssetHistoryDisplayItem =
  | { type: "single"; item: UnifiedAssetHistoryItem }
  | {
      type: "merged";
      items: UnifiedAssetHistoryItem[];
      recordedAt: Date;
      source: string;
      recordedByName: string | null;
      relatedEntityType: string | null;
      relatedEntityId: string | null;
    };

export type UnifiedAssetHistoryItem =
  | {
      kind: "status";
      id: string;
      recordedAt: Date;
      source: string;
      notes: string | null;
      recordedByName: string | null;
      relatedEntityType: string | null;
      relatedEntityId: string | null;
      previousStatus: string | null;
      newStatus: string;
    }
  | {
      kind: "condition";
      id: string;
      recordedAt: Date;
      source: string;
      notes: string | null;
      recordedByName: string | null;
      relatedEntityType: string | null;
      relatedEntityId: string | null;
      previousCondition: string | null;
      newCondition: string | null;
    }
  | {
      kind: "loan";
      id: string;
      recordedAt: Date;
      source: string;
      notes: string | null;
      recordedByName: string | null;
      eventType: string;
      previousLoanedTo: string | null;
      newLoanedTo: string | null;
    }
  | {
      kind: "placement";
      id: string;
      recordedAt: Date;
      source: string;
      notes: string | null;
      recordedByName: string | null;
      relatedEntityType: string | null;
      relatedEntityId: string | null;
      previousUnitId: string | null;
      newUnitId: string | null;
      previousLocationId: string | null;
      newLocationId: string | null;
      previousUnitName: string | null;
      newUnitName: string | null;
      previousLocationName: string | null;
      newLocationName: string | null;
    };
