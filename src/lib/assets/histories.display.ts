import {
  assetHistorySourceLabels,
  assetLoanHistoryEventLabels,
  isDisposalHistorySource,
  resolveAssetHistorySourceLabel,
  type AssetHistoryFilter,
  type AssetHistoryDisplayItem,
  type UnifiedAssetHistoryItem,
} from "@/lib/assets/histories.shared";
import { labelAssetCondition } from "@/lib/assets/condition-options";
import { assetStatusLabels, labelFromMap } from "@/lib/formatters";

export type AssetHistoryIndexItem = {
  kind: UnifiedAssetHistoryItem["kind"];
  id: string;
  recordedAt: Date;
  source: string;
  recordedByName: string | null;
};

export function indexItemToGroupingStub(item: AssetHistoryIndexItem): UnifiedAssetHistoryItem {
  if (item.kind === "status") {
    return {
      kind: "status",
      id: item.id,
      recordedAt: item.recordedAt,
      source: item.source,
      recordedByName: item.recordedByName,
      notes: null,
      relatedEntityType: null,
      relatedEntityId: null,
      previousStatus: null,
      newStatus: "",
    };
  }
  if (item.kind === "condition") {
    return {
      kind: "condition",
      id: item.id,
      recordedAt: item.recordedAt,
      source: item.source,
      recordedByName: item.recordedByName,
      notes: null,
      relatedEntityType: null,
      relatedEntityId: null,
      previousCondition: null,
      newCondition: null,
    };
  }
  if (item.kind === "placement") {
    return {
      kind: "placement",
      id: item.id,
      recordedAt: item.recordedAt,
      source: item.source,
      recordedByName: item.recordedByName,
      notes: null,
      relatedEntityType: null,
      relatedEntityId: null,
      previousUnitId: null,
      newUnitId: null,
      previousLocationId: null,
      newLocationId: null,
      previousUnitName: null,
      newUnitName: null,
      previousLocationName: null,
      newLocationName: null,
    };
  }
  return {
    kind: "loan",
    id: item.id,
    recordedAt: item.recordedAt,
    source: item.source,
    recordedByName: item.recordedByName,
    notes: null,
    eventType: "loan_update",
    previousLoanedTo: null,
    newLoanedTo: null,
  };
}

export function groupAssetHistoryIndex(items: AssetHistoryIndexItem[]) {
  return groupAssetHistoryForDisplay(items.map(indexItemToGroupingStub));
}

function formatStatusChange(previous: string | null, next: string) {
  const previousLabel = previous ? labelFromMap(previous, assetStatusLabels) : "—";
  const nextLabel = labelFromMap(next, assetStatusLabels);
  return `${previousLabel} → ${nextLabel}`;
}

function formatConditionChange(previous: string | null, next: string | null) {
  const previousLabel = previous ? labelAssetCondition(previous) : "—";
  const nextLabel = next ? labelAssetCondition(next) : "—";
  return `${previousLabel} → ${nextLabel}`;
}

function formatLoanChange(previous: string | null, next: string | null, eventType: string) {
  const eventLabel = assetLoanHistoryEventLabels[eventType] ?? "Peminjaman";
  if (!previous && next) {
    return `${eventLabel}: ${next}`;
  }
  if (previous && !next) {
    return `${eventLabel}: ${previous} → dikembalikan`;
  }
  return `${eventLabel}: ${previous ?? "—"} → ${next ?? "—"}`;
}

function formatPlacementChange(item: Extract<UnifiedAssetHistoryItem, { kind: "placement" }>) {
  const parts: string[] = [];

  if (item.previousUnitId !== item.newUnitId || item.previousUnitName !== item.newUnitName) {
    parts.push(`Unit: ${item.previousUnitName ?? "—"} → ${item.newUnitName ?? "—"}`);
  }

  if (item.previousLocationId !== item.newLocationId || item.previousLocationName !== item.newLocationName) {
    parts.push(`Lokasi: ${item.previousLocationName ?? "—"} → ${item.newLocationName ?? "—"}`);
  }

  return parts.length > 0 ? parts.join(" · ") : "Perubahan penempatan";
}

export function historyKindLabel(kind: UnifiedAssetHistoryItem["kind"] | "disposal") {
  if (kind === "status" || kind === "disposal") return "Status";
  if (kind === "condition") return "Kondisi fisik";
  if (kind === "placement") return "Penempatan";
  return "Peminjaman";
}

export function historyKindBadgeClass(kind: UnifiedAssetHistoryItem["kind"] | "disposal") {
  if (kind === "disposal") return "bg-rose-50 text-rose-700";
  if (kind === "status") return "bg-sky-50 text-sky-700";
  if (kind === "condition") return "bg-amber-50 text-amber-700";
  if (kind === "placement") return "bg-emerald-50 text-emerald-700";
  return "bg-violet-50 text-violet-700";
}

export function formatHistoryTitle(item: UnifiedAssetHistoryItem) {
  if (item.kind === "status") {
    return formatStatusChange(item.previousStatus, item.newStatus);
  }
  if (item.kind === "condition") {
    return formatConditionChange(item.previousCondition, item.newCondition);
  }
  if (item.kind === "placement") {
    return formatPlacementChange(item);
  }
  return formatLoanChange(item.previousLoanedTo, item.newLoanedTo, item.eventType);
}

export function resolveHistoryKind(item: UnifiedAssetHistoryItem): UnifiedAssetHistoryItem["kind"] | "disposal" {
  if (item.kind === "status" && isDisposalHistorySource(item.source)) {
    return "disposal";
  }
  return item.kind;
}

export function formatHistoryItemForExport(item: UnifiedAssetHistoryItem) {
  const kind = resolveHistoryKind(item);
  const kindLabel = kind === "disposal" ? "Disposal" : historyKindLabel(kind);
  const sourceLabel = resolveAssetHistorySourceLabel(item.source);

  return {
    jenis: kindLabel,
    perubahan: formatHistoryTitle(item),
    waktu: new Date(item.recordedAt).toISOString(),
    sumber: sourceLabel,
    dicatatOleh: item.recordedByName ?? "",
    catatan: item.notes ?? "",
  };
}

export function buildAssetHistoryCsv(items: UnifiedAssetHistoryItem[]) {
  const header = ["Jenis", "Perubahan", "Waktu", "Sumber", "Dicatat Oleh", "Catatan"];
  const rows = items.map((item) => {
    const formatted = formatHistoryItemForExport(item);
    return [formatted.jenis, formatted.perubahan, formatted.waktu, formatted.sumber, formatted.dicatatOleh, formatted.catatan];
  });

  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  return [header, ...rows].map((row) => row.map(escape).join(",")).join("\n");
}

const kindDisplayOrder: Record<UnifiedAssetHistoryItem["kind"], number> = {
  status: 0,
  placement: 1,
  loan: 2,
  condition: 3,
};

function isSameHistoryGroup(left: UnifiedAssetHistoryItem, right: UnifiedAssetHistoryItem) {
  const leftTime = new Date(left.recordedAt).getTime();
  const rightTime = new Date(right.recordedAt).getTime();
  if (Math.abs(leftTime - rightTime) > 2000) {
    return false;
  }

  return left.recordedByName === right.recordedByName && left.source === right.source;
}

export function groupAssetHistoryForDisplay(items: UnifiedAssetHistoryItem[]): AssetHistoryDisplayItem[] {
  const sorted = [...items].sort((left, right) => new Date(right.recordedAt).getTime() - new Date(left.recordedAt).getTime());
  const used = new Set<string>();
  const result: AssetHistoryDisplayItem[] = [];

  for (let index = 0; index < sorted.length; index += 1) {
    const item = sorted[index];
    const itemKey = `${item.kind}-${item.id}`;
    if (used.has(itemKey)) {
      continue;
    }

    const group = [item];
    used.add(itemKey);

    for (let otherIndex = index + 1; otherIndex < sorted.length; otherIndex += 1) {
      const other = sorted[otherIndex];
      const otherKey = `${other.kind}-${other.id}`;
      if (used.has(otherKey)) {
        continue;
      }
      if (isSameHistoryGroup(item, other)) {
        group.push(other);
        used.add(otherKey);
      }
    }

    if (group.length > 1) {
      group.sort((left, right) => kindDisplayOrder[left.kind] - kindDisplayOrder[right.kind]);
      const primary = group[0];
      result.push({
        type: "merged",
        items: group,
        recordedAt: primary.recordedAt,
        source: primary.source,
        recordedByName: primary.recordedByName,
        relatedEntityType:
          primary.kind === "status" || primary.kind === "placement" ? primary.relatedEntityType : null,
        relatedEntityId:
          primary.kind === "status" || primary.kind === "placement" ? primary.relatedEntityId : null,
      });
      continue;
    }

    result.push({ type: "single", item });
  }

  return result;
}

export function countAssetHistoryDisplayGroups(items: UnifiedAssetHistoryItem[]) {
  return groupAssetHistoryForDisplay(items).length;
}

export function paginateAssetHistoryDisplayGroups(
  items: UnifiedAssetHistoryItem[],
  page: number,
  pageSize: number
) {
  const groups = groupAssetHistoryForDisplay(items);
  const total = groups.length;
  const totalPages = total === 0 ? 1 : Math.ceil(total / pageSize);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const offset = (safePage - 1) * pageSize;

  return {
    groups: groups.slice(offset, offset + pageSize),
    page: safePage,
    pageSize,
    total,
    totalPages,
    start: total === 0 ? 0 : offset + 1,
    end: Math.min(offset + pageSize, total),
  };
}

export function filterLabel(filter: AssetHistoryFilter) {
  if (filter === "disposal") return "Disposal";
  if (filter === "status") return "Status";
  if (filter === "condition") return "Kondisi fisik";
  if (filter === "loan") return "Peminjaman";
  if (filter === "placement") return "Penempatan";
  return "Semua";
}
