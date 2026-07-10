"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PaginationControls } from "@/components/ui/pagination-controls";
import {
  formatHistoryTitle,
  groupAssetHistoryForDisplay,
  historyKindBadgeClass,
  historyKindLabel,
  resolveHistoryKind,
} from "@/lib/assets/histories.display";
import {
  ASSET_HISTORY_PAGE_SIZE,
  ASSET_HISTORY_PREVIEW_LIMIT,
  assetHistoryEntityTypes,
  assetHistoryFilterOptions,
  countAssetHistoryByFilter,
  filterAssetHistoryItems,
  isDisposalHistoryItem,
  resolveAssetHistorySourceLabel,
  type AssetHistoryDisplayItem,
  type AssetHistoryFilter,
  type UnifiedAssetHistoryItem,
} from "@/lib/assets/histories.shared";
import { buildListUrl } from "@/lib/list-view";

type AssetHistoryTimelineProps = {
  historyItems?: UnifiedAssetHistoryItem[];
  historyItemsByFilter?: Partial<Record<AssetHistoryFilter, UnifiedAssetHistoryItem[]>>;
  displayEntries?: AssetHistoryDisplayItem[];
  assetId: string;
  mode?: "preview" | "full";
  previewLimit?: number;
  filter?: AssetHistoryFilter;
  filterCounts?: Record<AssetHistoryFilter, number>;
  excludeFilters?: AssetHistoryFilter[];
  description?: string;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    start: number;
    end: number;
  };
};

function formatDateTime(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function RelatedEntityLink({
  relatedEntityType,
  relatedEntityId,
}: {
  relatedEntityType: string | null;
  relatedEntityId: string | null;
}) {
  if (!relatedEntityId || relatedEntityType !== assetHistoryEntityTypes.ASSET_DISPOSAL) {
    return null;
  }

  return (
    <Link href={`/assets/disposals/${relatedEntityId}`} className="text-xs font-medium text-slate-700 underline-offset-2 hover:underline">
      Lihat disposal
    </Link>
  );
}

function HistoryMeta({
  recordedAt,
  source,
  recordedByName,
  relatedEntityType,
  relatedEntityId,
}: {
  recordedAt: Date | string;
  source: string;
  recordedByName: string | null;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
      <span>{formatDateTime(recordedAt)}</span>
      <span>{resolveAssetHistorySourceLabel(source)}</span>
      {recordedByName ? <span>Oleh {recordedByName}</span> : null}
      <RelatedEntityLink relatedEntityType={relatedEntityType ?? null} relatedEntityId={relatedEntityId ?? null} />
    </div>
  );
}

function HistoryItemBody({ item }: { item: UnifiedAssetHistoryItem }) {
  const kind = resolveHistoryKind(item);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${historyKindBadgeClass(kind)}`}>
          {kind === "disposal" ? "Disposal" : historyKindLabel(kind)}
        </span>
        <p className="text-sm font-medium text-slate-900">{formatHistoryTitle(item)}</p>
      </div>
      {item.notes ? <p className="text-sm text-slate-600">{item.notes}</p> : null}
    </div>
  );
}

function HistoryEntryList({ entries, emptyMessage }: { entries: AssetHistoryDisplayItem[]; emptyMessage: string }) {
  if (entries.length === 0) {
    return <p className="text-sm text-slate-500">{emptyMessage}</p>;
  }

  return (
    <>
      {entries.map((entry) => {
        if (entry.type === "single") {
          const item = entry.item;
          return (
            <div key={`${item.kind}-${item.id}`} className="rounded-lg border border-slate-200 p-4">
              <HistoryItemBody item={item} />
              <HistoryMeta
                recordedAt={item.recordedAt}
                source={item.source}
                recordedByName={item.recordedByName}
                relatedEntityType={
                  item.kind === "status" || item.kind === "placement" ? item.relatedEntityType : null
                }
                relatedEntityId={item.kind === "status" || item.kind === "placement" ? item.relatedEntityId : null}
              />
            </div>
          );
        }

        const entryKey = entry.items.map((item) => `${item.kind}-${item.id}`).join("|");
        return (
          <div key={entryKey} className="rounded-lg border border-slate-200 p-4">
            <div className="space-y-4">
              {entry.items.map((item) => (
                <HistoryItemBody key={`${item.kind}-${item.id}`} item={item} />
              ))}
            </div>
            <HistoryMeta
              recordedAt={entry.recordedAt}
              source={entry.source}
              recordedByName={entry.recordedByName}
              relatedEntityType={entry.relatedEntityType}
              relatedEntityId={entry.relatedEntityId}
            />
          </div>
        );
      })}
    </>
  );
}

function HistoryFilterTabs({
  assetId,
  activeFilter,
  counts,
  mode,
  excludeFilters = [],
  onFilterChange,
}: {
  assetId: string;
  activeFilter: AssetHistoryFilter;
  counts: Record<AssetHistoryFilter, number>;
  mode: "preview" | "full";
  excludeFilters?: AssetHistoryFilter[];
  onFilterChange?: (filter: AssetHistoryFilter) => void;
}) {
  const historyPath = `/assets/${assetId}/history`;
  const visibleOptions = assetHistoryFilterOptions.filter((option) => !excludeFilters.includes(option.value));

  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter riwayat aset">
      {visibleOptions.map((option) => {
        const isActive = activeFilter === option.value;
        const className = `rounded-full px-3 py-1.5 text-xs font-medium transition ${
          isActive ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
        }`;

        if (mode === "full") {
          return (
            <Link
              key={option.value}
              href={buildListUrl(
                historyPath,
                {
                  filter: activeFilter === "all" ? undefined : activeFilter,
                  pageSize: ASSET_HISTORY_PAGE_SIZE,
                },
                { filter: option.value === "all" ? undefined : option.value, page: 1 }
              )}
              role="tab"
              aria-selected={isActive}
              className={className}
            >
              {option.label} ({counts[option.value]})
            </Link>
          );
        }

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onFilterChange?.(option.value)}
            className={className}
          >
            {option.label} ({counts[option.value]})
          </button>
        );
      })}
    </div>
  );
}

export function AssetHistoryTimeline({
  historyItems,
  historyItemsByFilter,
  displayEntries: serverDisplayEntries,
  assetId,
  mode = "preview",
  previewLimit = ASSET_HISTORY_PREVIEW_LIMIT,
  filter: controlledFilter,
  filterCounts,
  excludeFilters = [],
  description,
  pagination,
}: AssetHistoryTimelineProps) {
  const visibleFilterOptions = useMemo(
    () => assetHistoryFilterOptions.filter((option) => !excludeFilters.includes(option.value)),
    [excludeFilters]
  );
  const defaultPreviewFilter = visibleFilterOptions[0]?.value ?? "all";
  const [previewFilter, setPreviewFilter] = useState<AssetHistoryFilter>(defaultPreviewFilter);
  const activeFilter = mode === "full" ? (controlledFilter ?? "all") : previewFilter;

  const counts = useMemo(() => {
    if (filterCounts) {
      return filterCounts;
    }
    const fallbackItems = historyItems ?? historyItemsByFilter?.all ?? [];
    return countAssetHistoryByFilter(fallbackItems);
  }, [filterCounts, historyItems, historyItemsByFilter]);

  const displayEntries = useMemo(() => {
    if (mode === "full" && serverDisplayEntries) {
      return serverDisplayEntries;
    }

    const sourceItems =
      mode === "full"
        ? (historyItems ?? [])
        : (historyItemsByFilter?.[activeFilter] ?? filterAssetHistoryItems(historyItems ?? [], activeFilter));

    const previewItems =
      mode !== "full" && excludeFilters.includes("disposal") && activeFilter === "all"
        ? sourceItems.filter((item) => !isDisposalHistoryItem(item))
        : sourceItems;

    const grouped = groupAssetHistoryForDisplay(previewItems);
    if (mode === "full") {
      return grouped;
    }
    return grouped.slice(0, previewLimit);
  }, [activeFilter, excludeFilters, historyItems, historyItemsByFilter, mode, previewLimit, serverDisplayEntries]);

  const filteredTotal =
    mode === "full"
      ? (pagination?.total ?? historyItems?.length ?? 0)
      : activeFilter === "all"
        ? counts.all
        : counts[activeFilter];
  const hasMore = mode === "preview" && filteredTotal > previewLimit;

  const historyHref =
    activeFilter === "all" ? `/assets/${assetId}/history` : `/assets/${assetId}/history?filter=${activeFilter}`;

  const title = mode === "full" ? "Riwayat perubahan operasional" : "Riwayat perubahan operasional";
  const defaultDescription =
    mode === "full"
      ? "Audit perubahan status, kondisi fisik, peminjaman, penempatan unit/lokasi, dan dampak disposal terhadap status aset."
      : undefined;

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="space-y-4 p-5">
        <div className="space-y-1">
          <CardTitle className="text-lg">{title}</CardTitle>
          {description || defaultDescription ? (
            <CardDescription className="text-slate-600">{description ?? defaultDescription}</CardDescription>
          ) : null}
        </div>
        <HistoryFilterTabs
          assetId={assetId}
          activeFilter={activeFilter}
          counts={counts}
          mode={mode}
          excludeFilters={excludeFilters}
          onFilterChange={setPreviewFilter}
        />
      </CardHeader>
      <CardContent className="space-y-4 p-5 pt-0">
        <HistoryEntryList
          entries={displayEntries}
          emptyMessage={
            counts.all === 0
              ? "Belum ada riwayat perubahan status, kondisi fisik, peminjaman, atau penempatan."
              : "Tidak ada riwayat untuk filter ini."
          }
        />

        {hasMore ? (
          <div className="border-t border-slate-200 pt-4">
            <Link
              href={historyHref}
              className="inline-flex h-10 items-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Lihat semua riwayat ({filteredTotal})
            </Link>
          </div>
        ) : null}

        {mode === "full" && pagination && pagination.total > 0 ? (
          <PaginationControls
            pathname={`/assets/${assetId}/history`}
            q=""
            sort="recordedAt"
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={pagination.total}
            totalPages={pagination.totalPages}
            start={pagination.start}
            end={pagination.end}
            extraParams={activeFilter === "all" ? {} : { filter: activeFilter }}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
