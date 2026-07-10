import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateDataHealthScore,
  filterAssetsByOrganizationScope,
  getAssetIssues,
  resolveOrganizationIdsForScope,
} from "./asset-dashboard.helpers";
import type { AssetDashboardAsset } from "./asset-dashboard.types";

function makeAsset(overrides: Partial<AssetDashboardAsset> = {}): AssetDashboardAsset {
  return {
    id: overrides.id ?? "asset-1",
    code: overrides.code ?? "AST-001",
    name: overrides.name ?? "Aset Uji",
    assetType: overrides.assetType ?? "tanah",
    status: overrides.status ?? "active",
    condition: overrides.condition ?? "baik",
    locationId: overrides.locationId ?? "loc-1",
    acquisitionDate: overrides.acquisitionDate ?? "2026-01-01",
    acquisitionValue: overrides.acquisitionValue ?? "1000000",
    ownedByOrganizationId: overrides.ownedByOrganizationId ?? "org-a",
    financedByOrganizationId: overrides.financedByOrganizationId ?? "org-b",
    usedByOrganizationId: overrides.usedByOrganizationId ?? "org-c",
    inputterOrganizationId: overrides.inputterOrganizationId ?? "org-d",
    documentCount: overrides.documentCount ?? 1,
    landLatitude: overrides.landLatitude ?? "-7.25",
    landLongitude: overrides.landLongitude ?? "112.75",
    landBoundaryNorth: overrides.landBoundaryNorth ?? "Utara",
    landBoundarySouth: overrides.landBoundarySouth ?? "Selatan",
    landBoundaryEast: overrides.landBoundaryEast ?? "Timur",
    landBoundaryWest: overrides.landBoundaryWest ?? "Barat",
    landBoundaryPatokCoordinates: overrides.landBoundaryPatokCoordinates ?? [{ label: "A", lat: -7.25, lng: 112.75 }],
    ...overrides,
  };
}

test("direct scope filters one organization id", () => {
  const organizationIds = resolveOrganizationIdsForScope(["org-a", "org-child"], "org-a", "direct");
  const rows = filterAssetsByOrganizationScope(
    [makeAsset({ id: "match", ownedByOrganizationId: "org-a" }), makeAsset({ id: "skip", ownedByOrganizationId: "org-child" })],
    organizationIds,
    "ownedBy"
  );

  assert.deepEqual(rows.map((row) => row.id), ["match"]);
});

test("descendant scope filters descendant organization ids", () => {
  const organizationIds = resolveOrganizationIdsForScope(["org-a", "org-child"], "org-a", "descendant");
  const rows = filterAssetsByOrganizationScope(
    [makeAsset({ id: "parent", ownedByOrganizationId: "org-a" }), makeAsset({ id: "child", ownedByOrganizationId: "org-child" })],
    organizationIds,
    "ownedBy"
  );

  assert.deepEqual(rows.map((row) => row.id), ["parent", "child"]);
});

test("all dimensions does not double count matching asset", () => {
  const rows = filterAssetsByOrganizationScope(
    [
      makeAsset({
        id: "asset-a",
        ownedByOrganizationId: "org-a",
        financedByOrganizationId: "org-a",
        usedByOrganizationId: "org-a",
      }),
    ],
    new Set(["org-a"]),
    "all"
  );

  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.id, "asset-a");
});

test("issue detection returns required missing data issues", () => {
  const issues = getAssetIssues(
    makeAsset({
      code: "",
      acquisitionValue: null,
      documentCount: 0,
      ownedByOrganizationId: null,
      condition: "rusak berat",
    })
  );

  assert.ok(issues.some((issue) => issue.code === "MISSING_ASSET_CODE"));
  assert.ok(issues.some((issue) => issue.code === "MISSING_ACQUISITION_VALUE"));
  assert.ok(issues.some((issue) => issue.code === "MISSING_DOCUMENT"));
  assert.ok(issues.some((issue) => issue.code === "MISSING_OWNED_BY_ORGANIZATION"));
  assert.ok(issues.some((issue) => issue.code === "DAMAGED"));
});

test("data health score counts assets without critical issues", () => {
  const score = calculateDataHealthScore([
    makeAsset({ id: "healthy" }),
    makeAsset({ id: "unhealthy", documentCount: 0 }),
  ]);

  assert.equal(score, 50);
});
