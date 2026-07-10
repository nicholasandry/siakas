import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { assetConditionHistories, assetLoanHistories, assetPlacementHistories, assetStatusHistories, users } from "@/db/schema";
import {
  hasHistoryValueChanged,
  hasPlacementHistoryValueChanged,
  hasStatusHistoryValueChanged,
  normalizeHistoryValue,
  resolveLoanHistoryEventType,
  resolveRevertStatus,
} from "@/lib/assets/histories.helpers";
import {
  ASSET_HISTORY_PREVIEW_FETCH_SIZE,
  assetHistoryFilterOptions,
  assetHistorySources,
  assetPlacementHistorySources,
  filterAssetHistoryItems,
  type AssetHistoryFilter,
  type AssetHistorySource,
  type AssetPlacementHistorySource,
  type UnifiedAssetHistoryItem,
} from "@/lib/assets/histories.shared";
import {
  groupAssetHistoryForDisplay,
  indexItemToGroupingStub,
  paginateAssetHistoryDisplayGroups,
  type AssetHistoryIndexItem,
} from "@/lib/assets/histories.display";
import type { AssetHistoryDisplayItem } from "@/lib/assets/histories.shared";
import { normalizeAssetLoanedTo, normalizeLegacyAssetStatus } from "@/lib/assets/status";

export {
  assetHistoryEntityTypes,
  assetHistorySources,
  assetHistorySourceLabels,
  assetLoanHistoryEventLabels,
  assetPlacementHistorySources,
  assetPlacementHistorySourceLabels,
  resolveAssetHistorySourceLabel,
  type AssetHistorySource,
  type AssetPlacementHistorySource,
  type UnifiedAssetHistoryItem,
} from "@/lib/assets/histories.shared";

export {
  assetLoanHistoryEventTypes,
  buildStatusHistoryNote,
  hasHistoryValueChanged,
  hasPlacementHistoryValueChanged,
  hasStatusHistoryValueChanged,
  normalizeHistoryValue,
  resolveLoanHistoryEventType,
  resolveRevertStatus,
} from "@/lib/assets/histories.helpers";

type DbExecutor = any;

type HistoryContext = {
  assetId: string;
  actorUserId: string | null;
  source: AssetHistorySource;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
};

export async function insertAssetStatusHistory(
  executor: DbExecutor,
  input: HistoryContext & {
    previousStatus: string | null;
    newStatus: string;
    notes?: string | null;
    recordedAt?: Date;
  }
) {
  const [row] = await executor
    .insert(assetStatusHistories)
    .values({
      assetId: input.assetId,
      previousStatus: input.previousStatus,
      newStatus: input.newStatus,
      recordedAt: input.recordedAt ?? new Date(),
      recordedByUserId: input.actorUserId,
      source: input.source,
      relatedEntityType: input.relatedEntityType ?? null,
      relatedEntityId: input.relatedEntityId ?? null,
      notes: input.notes ?? null,
    })
    .returning();

  return row;
}

export async function insertAssetConditionHistory(
  executor: DbExecutor,
  input: HistoryContext & {
    previousCondition: string | null;
    newCondition: string | null;
    notes?: string | null;
    recordedAt?: Date;
  }
) {
  const [row] = await executor
    .insert(assetConditionHistories)
    .values({
      assetId: input.assetId,
      previousCondition: input.previousCondition,
      newCondition: input.newCondition,
      recordedAt: input.recordedAt ?? new Date(),
      recordedByUserId: input.actorUserId,
      source: input.source,
      relatedEntityType: input.relatedEntityType ?? null,
      relatedEntityId: input.relatedEntityId ?? null,
      notes: input.notes ?? null,
    })
    .returning();

  return row;
}

export async function insertAssetLoanHistory(
  executor: DbExecutor,
  input: HistoryContext & {
    previousLoanedTo: string | null;
    newLoanedTo: string | null;
    notes?: string | null;
    recordedAt?: Date;
  }
) {
  const [row] = await executor
    .insert(assetLoanHistories)
    .values({
      assetId: input.assetId,
      previousLoanedTo: input.previousLoanedTo,
      newLoanedTo: input.newLoanedTo,
      eventType: resolveLoanHistoryEventType(input.previousLoanedTo, input.newLoanedTo),
      recordedAt: input.recordedAt ?? new Date(),
      recordedByUserId: input.actorUserId,
      source: input.source,
      notes: input.notes ?? null,
    })
    .returning();

  return row;
}

export async function insertAssetPlacementHistory(
  executor: DbExecutor,
  input: Omit<HistoryContext, "source"> & {
    previousUnitId: string | null;
    newUnitId: string | null;
    previousLocationId: string | null;
    newLocationId: string | null;
    notes?: string | null;
    recordedAt?: Date;
    source: AssetPlacementHistorySource;
  }
) {
  const [row] = await executor
    .insert(assetPlacementHistories)
    .values({
      assetId: input.assetId,
      previousUnitId: input.previousUnitId,
      newUnitId: input.newUnitId,
      previousLocationId: input.previousLocationId,
      newLocationId: input.newLocationId,
      recordedAt: input.recordedAt ?? new Date(),
      recordedByUserId: input.actorUserId,
      source: input.source,
      relatedEntityType: input.relatedEntityType ?? null,
      relatedEntityId: input.relatedEntityId ?? null,
      notes: input.notes ?? null,
    })
    .returning();

  return row;
}

export async function recordAssetPlacementChanges(
  executor: DbExecutor,
  input: Omit<HistoryContext, "source"> & {
    before: { unitId: string | null; locationId: string | null } | null;
    after: { unitId: string | null; locationId: string | null };
    notes?: string | null;
    recordedAt?: Date;
    source: AssetPlacementHistorySource;
  }
) {
  if (!hasPlacementHistoryValueChanged(input.before ?? {}, input.after)) {
    return;
  }

  await insertAssetPlacementHistory(executor, {
    assetId: input.assetId,
    actorUserId: input.actorUserId,
    source: input.source,
    relatedEntityType: input.relatedEntityType,
    relatedEntityId: input.relatedEntityId,
    notes: input.notes,
    recordedAt: input.recordedAt,
    previousUnitId: normalizeHistoryValue(input.before?.unitId),
    newUnitId: normalizeHistoryValue(input.after.unitId),
    previousLocationId: normalizeHistoryValue(input.before?.locationId),
    newLocationId: normalizeHistoryValue(input.after.locationId),
  });
}

export async function recordAssetLoanChanges(
  executor: DbExecutor,
  input: HistoryContext & {
    before: { loanedTo: string | null } | null;
    after: { loanedTo: string | null };
    notes?: string | null;
    recordedAt?: Date;
  }
) {
  if (!hasHistoryValueChanged(input.before?.loanedTo, input.after.loanedTo)) {
    return;
  }

  await insertAssetLoanHistory(executor, {
    assetId: input.assetId,
    actorUserId: input.actorUserId,
    source: input.source,
    relatedEntityType: input.relatedEntityType,
    relatedEntityId: input.relatedEntityId,
    notes: input.notes,
    recordedAt: input.recordedAt,
    previousLoanedTo: normalizeHistoryValue(input.before?.loanedTo),
    newLoanedTo: normalizeHistoryValue(input.after.loanedTo),
  });
}

export async function recordAssetHistoryChanges(
  executor: DbExecutor,
  input: {
    assetId: string;
    actorUserId: string | null;
    before: { status: string | null; condition: string | null; loanedTo?: string | null } | null;
    after: { status: string; condition: string | null; loanedTo?: string | null };
    source?: AssetHistorySource;
    relatedEntityType?: string | null;
    relatedEntityId?: string | null;
    statusNotes?: string | null;
    conditionNotes?: string | null;
    loanNotes?: string | null;
    /** @deprecated Gunakan statusNotes / conditionNotes / loanNotes */
    notes?: string | null;
  }
) {
  const source = input.source ?? assetHistorySources.MANUAL;
  const recordedAt = new Date();
  const normalizedAfter = {
    status: normalizeLegacyAssetStatus(input.after.status),
    condition: input.after.condition,
    loanedTo: normalizeAssetLoanedTo(input.after.status, input.after.loanedTo ?? null),
  };
  const context = {
    assetId: input.assetId,
    actorUserId: input.actorUserId,
    source,
    relatedEntityType: input.relatedEntityType,
    relatedEntityId: input.relatedEntityId,
    recordedAt,
  };

  if (hasStatusHistoryValueChanged(input.before?.status, input.after.status)) {
    await insertAssetStatusHistory(executor, {
      ...context,
      notes: input.statusNotes ?? input.notes ?? null,
      previousStatus: normalizeHistoryValue(input.before?.status),
      newStatus: normalizedAfter.status,
    });
  }

  if (hasHistoryValueChanged(input.before?.condition, input.after.condition)) {
    await insertAssetConditionHistory(executor, {
      ...context,
      notes: input.conditionNotes ?? null,
      previousCondition: normalizeHistoryValue(input.before?.condition),
      newCondition: normalizeHistoryValue(normalizedAfter.condition),
    });
  }

  await recordAssetLoanChanges(executor, {
    ...context,
    before: input.before ? { loanedTo: input.before.loanedTo ?? null } : null,
    after: { loanedTo: normalizedAfter.loanedTo },
    notes: input.loanNotes ?? null,
  });
}

export async function getDisposalStartPreviousStatus(executor: DbExecutor, assetId: string, disposalId: string) {
  const [row] = await executor
    .select({ previousStatus: assetStatusHistories.previousStatus })
    .from(assetStatusHistories)
    .where(
      and(
        eq(assetStatusHistories.assetId, assetId),
        eq(assetStatusHistories.relatedEntityId, disposalId),
        eq(assetStatusHistories.source, assetHistorySources.DISPOSAL_START)
      )
    )
    .orderBy(desc(assetStatusHistories.recordedAt))
    .limit(1);

  return resolveRevertStatus(row?.previousStatus);
}

export async function getLatestAssetConditionFromHistory(assetId: string, executor: DbExecutor = db) {
  const [row] = await executor
    .select({ newCondition: assetConditionHistories.newCondition })
    .from(assetConditionHistories)
    .where(eq(assetConditionHistories.assetId, assetId))
    .orderBy(desc(assetConditionHistories.recordedAt))
    .limit(1);

  return normalizeHistoryValue(row?.newCondition);
}

type UnifiedHistoryRow = {
  kind: string;
  id: string;
  recorded_at: Date;
  source: string;
  notes: string | null;
  recorded_by_name: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  previous_status: string | null;
  new_status: string | null;
  previous_condition: string | null;
  new_condition: string | null;
  previous_loaned_to: string | null;
  new_loaned_to: string | null;
  event_type: string | null;
  previous_unit_id: string | null;
  new_unit_id: string | null;
  previous_location_id: string | null;
  new_location_id: string | null;
  previous_unit_name: string | null;
  new_unit_name: string | null;
  previous_location_name: string | null;
  new_location_name: string | null;
};

type UnifiedHistoryIndexRow = Pick<
  UnifiedHistoryRow,
  "kind" | "id" | "recorded_at" | "source" | "recorded_by_name"
>;

function readExecuteRows<T>(result: T[] | { rows: T[] }) {
  return Array.isArray(result) ? result : (result.rows ?? []);
}

function historyFilterClause(filter: AssetHistoryFilter) {
  if (filter === "status") {
    return sql`kind = 'status' AND source NOT LIKE 'disposal_%'`;
  }
  if (filter === "disposal") {
    return sql`kind = 'status' AND source LIKE 'disposal_%'`;
  }
  if (filter === "condition") {
    return sql`kind = 'condition'`;
  }
  if (filter === "loan") {
    return sql`kind = 'loan'`;
  }
  if (filter === "placement") {
    return sql`kind = 'placement'`;
  }
  return sql`TRUE`;
}

function mapUnifiedHistoryRow(row: UnifiedHistoryRow): UnifiedAssetHistoryItem {
  if (row.kind === "status") {
    return {
      kind: "status",
      id: row.id,
      recordedAt: row.recorded_at,
      source: row.source,
      notes: row.notes,
      recordedByName: row.recorded_by_name,
      relatedEntityType: row.related_entity_type,
      relatedEntityId: row.related_entity_id,
      previousStatus: row.previous_status,
      newStatus: row.new_status ?? "",
    };
  }

  if (row.kind === "condition") {
    return {
      kind: "condition",
      id: row.id,
      recordedAt: row.recorded_at,
      source: row.source,
      notes: row.notes,
      recordedByName: row.recorded_by_name,
      relatedEntityType: row.related_entity_type,
      relatedEntityId: row.related_entity_id,
      previousCondition: row.previous_condition,
      newCondition: row.new_condition,
    };
  }

  if (row.kind === "placement") {
    return {
      kind: "placement",
      id: row.id,
      recordedAt: row.recorded_at,
      source: row.source,
      notes: row.notes,
      recordedByName: row.recorded_by_name,
      relatedEntityType: row.related_entity_type,
      relatedEntityId: row.related_entity_id,
      previousUnitId: row.previous_unit_id,
      newUnitId: row.new_unit_id,
      previousLocationId: row.previous_location_id,
      newLocationId: row.new_location_id,
      previousUnitName: row.previous_unit_name,
      newUnitName: row.new_unit_name,
      previousLocationName: row.previous_location_name,
      newLocationName: row.new_location_name,
    };
  }

  return {
    kind: "loan",
    id: row.id,
    recordedAt: row.recorded_at,
    source: row.source,
    notes: row.notes,
    recordedByName: row.recorded_by_name,
    eventType: row.event_type ?? "loan_update",
    previousLoanedTo: row.previous_loaned_to,
    newLoanedTo: row.new_loaned_to,
  };
}

function mapUnifiedHistoryIndexRow(row: UnifiedHistoryIndexRow): AssetHistoryIndexItem {
  return {
    kind: row.kind as AssetHistoryIndexItem["kind"],
    id: row.id,
    recordedAt: row.recorded_at,
    source: row.source,
    recordedByName: row.recorded_by_name,
  };
}

function historyItemKey(item: Pick<AssetHistoryIndexItem, "kind" | "id">) {
  return `${item.kind}:${item.id}`;
}

async function listUnifiedHistoryIndex(assetId: string, filter: AssetHistoryFilter) {
  const result = await db.execute<UnifiedHistoryIndexRow>(sql`
    ${unifiedHistoryCte(assetId)}
    SELECT kind, id, recorded_at, source, recorded_by_name
    FROM unified
    WHERE ${historyFilterClause(filter)}
    ORDER BY recorded_at DESC
  `);

  return readExecuteRows(result).map(mapUnifiedHistoryIndexRow);
}

async function fetchUnifiedHistoryItemsByKeys(assetId: string, keys: AssetHistoryIndexItem[]) {
  if (keys.length === 0) {
    return new Map<string, UnifiedAssetHistoryItem>();
  }

  const keyConditions = keys.map((key) => sql`(kind = ${key.kind} AND id = ${key.id})`);
  const result = await db.execute<UnifiedHistoryRow>(sql`
    ${unifiedHistoryCte(assetId)}
    SELECT *
    FROM unified
    WHERE ${sql.join(keyConditions, sql` OR `)}
  `);

  const itemMap = new Map<string, UnifiedAssetHistoryItem>();
  for (const row of readExecuteRows(result)) {
    const item = mapUnifiedHistoryRow(row);
    itemMap.set(historyItemKey(item), item);
  }

  return itemMap;
}

function dedupeIndexKeys(keys: AssetHistoryIndexItem[]) {
  const seen = new Set<string>();
  const result: AssetHistoryIndexItem[] = [];

  for (const key of keys) {
    const itemKey = historyItemKey(key);
    if (seen.has(itemKey)) {
      continue;
    }
    seen.add(itemKey);
    result.push(key);
  }

  return result;
}

export function flattenDisplayEntriesToHistoryItems(entries: AssetHistoryDisplayItem[]): UnifiedAssetHistoryItem[] {
  const items: UnifiedAssetHistoryItem[] = [];

  for (const entry of entries) {
    if (entry.type === "single") {
      items.push(entry.item);
      continue;
    }
    items.push(...entry.items);
  }

  return items;
}

function countDisplayGroupsByIndex(items: AssetHistoryIndexItem[]) {
  const stubs = items.map(indexItemToGroupingStub);
  return {
    all: groupAssetHistoryForDisplay(stubs).length,
    status: groupAssetHistoryForDisplay(filterAssetHistoryItems(stubs, "status")).length,
    condition: groupAssetHistoryForDisplay(filterAssetHistoryItems(stubs, "condition")).length,
    loan: groupAssetHistoryForDisplay(filterAssetHistoryItems(stubs, "loan")).length,
    placement: groupAssetHistoryForDisplay(filterAssetHistoryItems(stubs, "placement")).length,
    disposal: groupAssetHistoryForDisplay(filterAssetHistoryItems(stubs, "disposal")).length,
  };
}

function filterIndexItems(items: AssetHistoryIndexItem[], filter: AssetHistoryFilter) {
  const stubs = items.map(indexItemToGroupingStub);
  const filtered = filterAssetHistoryItems(stubs, filter);
  return filtered.map((item) => ({
    kind: item.kind,
    id: item.id,
    recordedAt: item.recordedAt,
    source: item.source,
    recordedByName: item.recordedByName,
  }));
}

function collectIndexKeysFromDisplayGroups(
  groups: ReturnType<typeof paginateAssetHistoryDisplayGroups>["groups"]
): AssetHistoryIndexItem[] {
  const keys: AssetHistoryIndexItem[] = [];
  for (const entry of groups) {
    if (entry.type === "single") {
      keys.push({
        kind: entry.item.kind,
        id: entry.item.id,
        recordedAt: entry.item.recordedAt,
        source: entry.item.source,
        recordedByName: entry.item.recordedByName,
      });
      continue;
    }
    for (const item of entry.items) {
      keys.push({
        kind: item.kind,
        id: item.id,
        recordedAt: item.recordedAt,
        source: item.source,
        recordedByName: item.recordedByName,
      });
    }
  }
  return keys;
}

function hydrateDisplayEntries(
  groups: ReturnType<typeof paginateAssetHistoryDisplayGroups>["groups"],
  itemMap: Map<string, UnifiedAssetHistoryItem>
) {
  return groups
    .map((entry) => {
      if (entry.type === "single") {
        const item = itemMap.get(historyItemKey(entry.item));
        return item ? ({ type: "single", item } as const) : null;
      }

      const items = entry.items
        .map((item) => itemMap.get(historyItemKey(item)))
        .filter((item): item is UnifiedAssetHistoryItem => Boolean(item));

      if (items.length === 0) {
        return null;
      }

      if (items.length === 1) {
        return { type: "single", item: items[0] } as const;
      }

      const primary = items[0];
      return {
        type: "merged",
        items,
        recordedAt: primary.recordedAt,
        source: primary.source,
        recordedByName: primary.recordedByName,
        relatedEntityType:
          primary.kind === "status" || primary.kind === "placement" ? primary.relatedEntityType : null,
        relatedEntityId:
          primary.kind === "status" || primary.kind === "placement" ? primary.relatedEntityId : null,
      } as const;
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
}

function unifiedHistoryCte(assetId: string) {
  return sql`
    WITH unified AS (
      SELECT
        'status'::text AS kind,
        h.id,
        h.recorded_at,
        h.source,
        h.notes,
        u.name AS recorded_by_name,
        h.related_entity_type,
        h.related_entity_id,
        h.previous_status,
        h.new_status,
        NULL::varchar AS previous_condition,
        NULL::varchar AS new_condition,
        NULL::varchar AS previous_loaned_to,
        NULL::varchar AS new_loaned_to,
        NULL::varchar AS event_type,
        NULL::uuid AS previous_unit_id,
        NULL::uuid AS new_unit_id,
        NULL::uuid AS previous_location_id,
        NULL::uuid AS new_location_id,
        NULL::varchar AS previous_unit_name,
        NULL::varchar AS new_unit_name,
        NULL::varchar AS previous_location_name,
        NULL::varchar AS new_location_name
      FROM "asset_status_histories" h
      LEFT JOIN "users" u ON h.recorded_by_user_id = u.id
      WHERE h.asset_id = ${assetId}
      UNION ALL
      SELECT
        'condition'::text,
        h.id,
        h.recorded_at,
        h.source,
        h.notes,
        u.name,
        h.related_entity_type,
        h.related_entity_id,
        NULL,
        NULL,
        h.previous_condition,
        h.new_condition,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL
      FROM "asset_condition_histories" h
      LEFT JOIN "users" u ON h.recorded_by_user_id = u.id
      WHERE h.asset_id = ${assetId}
      UNION ALL
      SELECT
        'loan'::text,
        h.id,
        h.recorded_at,
        h.source,
        h.notes,
        u.name,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        h.previous_loaned_to,
        h.new_loaned_to,
        h.event_type,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL
      FROM "asset_loan_histories" h
      LEFT JOIN "users" u ON h.recorded_by_user_id = u.id
      WHERE h.asset_id = ${assetId}
      UNION ALL
      SELECT
        'placement'::text,
        h.id,
        h.recorded_at,
        h.source,
        h.notes,
        u.name,
        h.related_entity_type,
        h.related_entity_id,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        h.previous_unit_id,
        h.new_unit_id,
        h.previous_location_id,
        h.new_location_id,
        pu.name,
        nu.name,
        pl.name,
        nl.name
      FROM "asset_placement_histories" h
      LEFT JOIN "users" u ON h.recorded_by_user_id = u.id
      LEFT JOIN "units" pu ON h.previous_unit_id = pu.id
      LEFT JOIN "units" nu ON h.new_unit_id = nu.id
      LEFT JOIN "asset_locations" pl ON h.previous_location_id = pl.id
      LEFT JOIN "asset_locations" nl ON h.new_location_id = nl.id
      WHERE h.asset_id = ${assetId}
    )
  `;
}

export async function countUnifiedAssetHistoryFilters(assetId: string) {
  const allIndex = await listUnifiedHistoryIndex(assetId, "all");
  return countDisplayGroupsByIndex(allIndex);
}

export async function getAssetHistoryDetailBundle(
  assetId: string,
  options?: {
    previewFetchSize?: number;
    excludeFilters?: AssetHistoryFilter[];
  }
) {
  const previewFetchSize = options?.previewFetchSize ?? ASSET_HISTORY_PREVIEW_FETCH_SIZE;
  const excludeFilters = options?.excludeFilters ?? [];
  const allIndex = await listUnifiedHistoryIndex(assetId, "all");
  const filterCounts = countDisplayGroupsByIndex(allIndex);
  const filterOptions = assetHistoryFilterOptions.filter((option) => !excludeFilters.includes(option.value));
  const previewGroupsByFilter = new Map<
    AssetHistoryFilter,
    ReturnType<typeof paginateAssetHistoryDisplayGroups>["groups"]
  >();
  const keys: AssetHistoryIndexItem[] = [];

  for (const option of filterOptions) {
    const filtered = option.value === "all" ? allIndex : filterIndexItems(allIndex, option.value);
    const paginated = paginateAssetHistoryDisplayGroups(
      filtered.map(indexItemToGroupingStub),
      1,
      previewFetchSize
    );
    previewGroupsByFilter.set(option.value, paginated.groups);
    keys.push(...collectIndexKeysFromDisplayGroups(paginated.groups));
  }

  const itemMap =
    keys.length > 0 ? await fetchUnifiedHistoryItemsByKeys(assetId, dedupeIndexKeys(keys)) : new Map();

  const historyItemsByFilter = Object.fromEntries(
    filterOptions.map((option) => [
      option.value,
      flattenDisplayEntriesToHistoryItems(
        hydrateDisplayEntries(previewGroupsByFilter.get(option.value) ?? [], itemMap)
      ),
    ])
  ) as Partial<Record<AssetHistoryFilter, UnifiedAssetHistoryItem[]>>;

  return { filterCounts, historyItemsByFilter };
}

export async function listPaginatedUnifiedAssetHistories(
  assetId: string,
  filter: AssetHistoryFilter,
  page: number,
  pageSize: number
) {
  const offset = Math.max(0, (page - 1) * pageSize);
  const result = await db.execute<UnifiedHistoryRow>(sql`
    ${unifiedHistoryCte(assetId)}
    SELECT *
    FROM unified
    WHERE ${historyFilterClause(filter)}
    ORDER BY recorded_at DESC
    LIMIT ${pageSize}
    OFFSET ${offset}
  `);

  return readExecuteRows(result).map(mapUnifiedHistoryRow);
}

export async function listAllUnifiedAssetHistories(assetId: string, filter: AssetHistoryFilter) {
  const result = await db.execute<UnifiedHistoryRow>(sql`
    ${unifiedHistoryCte(assetId)}
    SELECT *
    FROM unified
    WHERE ${historyFilterClause(filter)}
    ORDER BY recorded_at DESC
  `);

  return readExecuteRows(result).map(mapUnifiedHistoryRow);
}

export async function listAssetHistoryPreviewByFilter(
  assetId: string,
  fetchSize = ASSET_HISTORY_PREVIEW_FETCH_SIZE,
  excludeFilters: AssetHistoryFilter[] = []
): Promise<Partial<Record<AssetHistoryFilter, UnifiedAssetHistoryItem[]>>> {
  const { historyItemsByFilter } = await getAssetHistoryDetailBundle(assetId, {
    previewFetchSize: fetchSize,
    excludeFilters,
  });
  return historyItemsByFilter;
}

export async function getAssetHistoryDisplayPage(
  assetId: string,
  filter: AssetHistoryFilter,
  page: number,
  pageSize: number
) {
  const allIndex = await listUnifiedHistoryIndex(assetId, "all");
  const filterCounts = countDisplayGroupsByIndex(allIndex);
  const filteredIndex = filter === "all" ? allIndex : filterIndexItems(allIndex, filter);
  const paginated = paginateAssetHistoryDisplayGroups(
    filteredIndex.map(indexItemToGroupingStub),
    page,
    pageSize
  );
  const keys = collectIndexKeysFromDisplayGroups(paginated.groups);
  const itemMap = await fetchUnifiedHistoryItemsByKeys(assetId, keys);

  return {
    filterCounts,
    displayEntries: hydrateDisplayEntries(paginated.groups, itemMap),
    pagination: {
      page: paginated.page,
      pageSize: paginated.pageSize,
      total: paginated.total,
      totalPages: paginated.totalPages,
      start: paginated.start,
      end: paginated.end,
    },
  };
}
