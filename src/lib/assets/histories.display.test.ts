import assert from "node:assert/strict";
import test from "node:test";

import { groupAssetHistoryForDisplay, paginateAssetHistoryDisplayGroups, resolveHistoryKind } from "./histories.display";
import {
  countAssetHistoryByFilter,
  filterAssetHistoryItems,
  isDisposalHistoryItem,
  isOperationalStatusHistoryItem,
  type UnifiedAssetHistoryItem,
} from "./histories.shared";

const baseTime = new Date("2026-07-09T10:00:00.000Z");

function statusItem(source: string, overrides: Partial<Extract<UnifiedAssetHistoryItem, { kind: "status" }>> = {}) {
  return {
    kind: "status" as const,
    id: overrides.id ?? "status-1",
    recordedAt: overrides.recordedAt ?? baseTime,
    source,
    notes: overrides.notes ?? null,
    recordedByName: overrides.recordedByName ?? "Admin",
    relatedEntityType: overrides.relatedEntityType ?? null,
    relatedEntityId: overrides.relatedEntityId ?? null,
    previousStatus: overrides.previousStatus ?? "active",
    newStatus: overrides.newStatus ?? "on_loan",
  };
}

function conditionItem(overrides: Partial<Extract<UnifiedAssetHistoryItem, { kind: "condition" }>> = {}) {
  return {
    kind: "condition" as const,
    id: overrides.id ?? "condition-1",
    recordedAt: overrides.recordedAt ?? baseTime,
    source: overrides.source ?? "manual",
    notes: overrides.notes ?? null,
    recordedByName: overrides.recordedByName ?? "Admin",
    relatedEntityType: overrides.relatedEntityType ?? null,
    relatedEntityId: overrides.relatedEntityId ?? null,
    previousCondition: overrides.previousCondition ?? "baik",
    newCondition: overrides.newCondition ?? "rusak",
  };
}

test("disposal status rows are separated from operational status filter", () => {
  const items = [
    statusItem("manual"),
    statusItem("disposal_start", { id: "status-2", newStatus: "under_disposal" }),
  ];

  assert.equal(isOperationalStatusHistoryItem(items[0]), true);
  assert.equal(isOperationalStatusHistoryItem(items[1]), false);
  assert.equal(isDisposalHistoryItem(items[1]), true);
  assert.equal(filterAssetHistoryItems(items, "status").length, 1);
  assert.equal(filterAssetHistoryItems(items, "disposal").length, 1);
  assert.equal(countAssetHistoryByFilter(items).disposal, 1);
});

test("resolveHistoryKind marks disposal sources as disposal", () => {
  assert.equal(resolveHistoryKind(statusItem("manual")), "status");
  assert.equal(resolveHistoryKind(statusItem("disposal_complete", { newStatus: "sold" })), "disposal");
});

test("groupAssetHistoryForDisplay merges same actor/source within 2 seconds", () => {
  const items = [
    statusItem("manual", { id: "status-1", recordedAt: baseTime }),
    conditionItem({ id: "condition-1", recordedAt: new Date(baseTime.getTime() + 500) }),
    statusItem("manual", {
      id: "status-2",
      recordedAt: new Date(baseTime.getTime() + 10_000),
      newStatus: "active",
      previousStatus: "on_loan",
    }),
  ];

  const grouped = groupAssetHistoryForDisplay(items);
  assert.equal(grouped.length, 2);
  assert.equal(grouped[1].type, "merged");
  if (grouped[1].type === "merged") {
    assert.equal(grouped[1].items.length, 2);
  }
});

test("paginateAssetHistoryDisplayGroups keeps merged entries on one page", () => {
  const items = [
    statusItem("manual", { id: "status-1", recordedAt: baseTime }),
    conditionItem({ id: "condition-1", recordedAt: new Date(baseTime.getTime() + 500) }),
    statusItem("manual", {
      id: "status-2",
      recordedAt: new Date(baseTime.getTime() + 10_000),
      newStatus: "active",
      previousStatus: "on_loan",
    }),
  ];

  const pageOne = paginateAssetHistoryDisplayGroups(items, 1, 1);
  assert.equal(pageOne.total, 2);
  assert.equal(pageOne.groups.length, 1);
  assert.equal(pageOne.groups[0].type, "single");

  const pageTwo = paginateAssetHistoryDisplayGroups(items, 2, 1);
  assert.equal(pageTwo.page, 2);
  assert.equal(pageTwo.groups.length, 1);
  assert.equal(pageTwo.groups[0].type, "merged");
});

test("paginateAssetHistoryDisplayGroups clamps invalid page numbers", () => {
  const items = [statusItem("manual")];
  const paginated = paginateAssetHistoryDisplayGroups(items, 99, 20);

  assert.equal(paginated.page, 1);
  assert.equal(paginated.totalPages, 1);
  assert.equal(paginated.groups.length, 1);
});
