import "server-only";

import { and, asc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  assetAttachments,
  assetBuildingDetails,
  assetBuildingLands,
  assetLandDetails,
  assetOrganizations,
  assetVehicleDetails,
  assets,
  taxAssetDepreciation,
  units,
} from "@/db/schema";
import type { SessionUser } from "@/lib/authz";
import { hasPermission } from "@/lib/authz";
import { normalizeLegacyAssetStatus } from "@/lib/assets/status";
import { buildAssetScopeCondition, buildUnitScopeCondition, type AccessScope } from "@/lib/scope";
import { collectDescendantUnitIds } from "@/lib/unit-tree";
import {
  calculateBookValue,
  calculateDataHealthScore,
  filterAssetsByOrganizationScope,
  getAssetIssues,
  getPriority,
  resolveOrganizationIdsForScope,
  toNumber,
} from "./asset-dashboard.helpers";
import type {
  AssetActionRequiredRow,
  AssetCompositionRow,
  AssetDashboardAsset,
  AssetDashboardData,
  AssetDashboardDimension,
  AssetDashboardParams,
  AssetDashboardScope,
  AssetDataHealth,
  AssetLocationHealth,
  AssetDashboardSummary,
} from "./asset-dashboard.types";

export function canViewAssetDashboard(user: SessionUser | null | undefined) {
  return hasPermission(user, "asset.read");
}

export function canViewDescendantAssets(user: SessionUser, organizationId: string, scope: AccessScope) {
  // TODO ACL: ganti role/scope check ini dengan policy agregasi organisasi saat ACL per unit tersedia.
  if (user.role === "superadmin" || user.role === "admin-aset") return true;
  if (scope.type === "unit") return scope.unitIds.has(organizationId);
  return false;
}

export function canViewAssetValue(user: SessionUser) {
  // TODO ACL: pisahkan permission nilai aset jika dashboard nilai menjadi data sensitif per organisasi.
  return hasPermission(user, "asset.read");
}

export function canViewAssetDocuments(user: SessionUser) {
  // TODO ACL: pisahkan permission dokumen aset ketika modul dokumen memiliki policy download/view sendiri.
  return hasPermission(user, "asset.read");
}

function defaultScopeForUser(user: SessionUser): AssetDashboardScope {
  return user.role === "admin-keuskupan" || user.role === "admin-kevikepan" || user.role === "superadmin" || user.role === "admin-aset"
    ? "descendant"
    : "direct";
}

function normalizeString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function normalizeAssetDashboardParams(
  searchParams: Record<string, string | string[] | undefined>,
  user: SessionUser,
  organizationOptions: Array<{ id: string }>
): AssetDashboardParams {
  const organizationIds = new Set(organizationOptions.map((item) => item.id));
  const fallbackOrganizationId = user.unitId && organizationIds.has(user.unitId) ? user.unitId : organizationOptions[0]?.id;
  const requestedOrganizationId = normalizeString(searchParams.organizationId);
  const organizationId = requestedOrganizationId && organizationIds.has(requestedOrganizationId) ? requestedOrganizationId : fallbackOrganizationId;
  const requestedScope = normalizeString(searchParams.scope);
  const requestedDimension = normalizeString(searchParams.dimension);
  const acquisitionYear = Number(normalizeString(searchParams.acquisitionYear));

  return {
    organizationId,
    scope: requestedScope === "direct" || requestedScope === "descendant" ? requestedScope : defaultScopeForUser(user),
    dimension: ["ownedBy", "financedBy", "usedBy", "inputter", "all"].includes(requestedDimension ?? "")
      ? (requestedDimension as AssetDashboardDimension)
      : "ownedBy",
    assetType: normalizeString(searchParams.assetType) || undefined,
    acquisitionYear: Number.isInteger(acquisitionYear) ? acquisitionYear : undefined,
    status: normalizeString(searchParams.status) ? normalizeLegacyAssetStatus(normalizeString(searchParams.status)) : undefined,
  };
}

async function listDashboardOrganizationOptions(scope: AccessScope) {
  const condition = buildUnitScopeCondition(scope);
  const query = db.select({ id: units.id, name: units.name, code: units.code, kind: units.kind }).from(units).orderBy(asc(units.name));
  return condition ? query.where(condition) : query;
}

async function resolveDashboardUnitIds(params: AssetDashboardParams) {
  if (params.scope === "direct") return [params.organizationId];

  const nodes = await db.select({ id: units.id, parentId: units.parentId, name: units.name, code: units.code }).from(units);
  return [params.organizationId, ...collectDescendantUnitIds(nodes, params.organizationId)];
}

async function listScopedDashboardAssets(scope: AccessScope, params: AssetDashboardParams): Promise<AssetDashboardAsset[]> {
  const scopeCondition = buildAssetScopeCondition(scope);
  const filters = [
    scopeCondition,
    params.assetType ? eq(assets.assetType, params.assetType) : undefined,
    params.status
      ? params.status === "inactive"
        ? inArray(assets.status, ["inactive", "archived"])
        : eq(assets.status, params.status)
      : undefined,
    params.acquisitionYear ? sql`extract(year from ${assets.acquisitionDate}) = ${params.acquisitionYear}` : undefined,
  ].filter(Boolean);

  const latestDepreciation = db.$with("latest_depreciation").as(
    db
      .select({
        assetId: taxAssetDepreciation.assetId,
        accumulatedDepreciation: sql<string>`max(${taxAssetDepreciation.accumulatedDepreciation})`.as("accumulatedDepreciation"),
        bookValue: sql<string>`min(${taxAssetDepreciation.bookValue})`.as("bookValue"),
      })
      .from(taxAssetDepreciation)
      .groupBy(taxAssetDepreciation.assetId)
  );

  const rows = await db
    .with(latestDepreciation)
    .select({
      id: assets.id,
      code: assets.code,
      name: assets.name,
      assetType: assets.assetType,
      status: assets.status,
      condition: assets.condition,
      locationId: assets.locationId,
      acquisitionDate: assets.acquisitionDate,
      acquisitionValue: assets.acquisitionValue,
      accumulatedDepreciation: latestDepreciation.accumulatedDepreciation,
      bookValue: latestDepreciation.bookValue,
      landLatitude: assetLandDetails.latitude,
      landLongitude: assetLandDetails.longitude,
      landBoundaryNorth: assetLandDetails.boundaryNorth,
      landBoundarySouth: assetLandDetails.boundarySouth,
      landBoundaryEast: assetLandDetails.boundaryEast,
      landBoundaryWest: assetLandDetails.boundaryWest,
      landBoundaryPatokCoordinates: assetLandDetails.boundaryPatokCoordinates,
      landCertificateNumber: assetLandDetails.certificateNumber,
      buildingLatitude: assetBuildingDetails.latitude,
      buildingLongitude: assetBuildingDetails.longitude,
      buildingMainLandAssetId: assetBuildingDetails.mainLandAssetId,
      vehicleTaxDueAt: assetVehicleDetails.taxDueAt,
      vehicleStnkExpiredAt: assetVehicleDetails.stnkExpiredAt,
    })
    .from(assets)
    .leftJoin(assetLandDetails, eq(assetLandDetails.assetId, assets.id))
    .leftJoin(assetBuildingDetails, eq(assetBuildingDetails.assetId, assets.id))
    .leftJoin(assetVehicleDetails, eq(assetVehicleDetails.assetId, assets.id))
    .leftJoin(latestDepreciation, eq(latestDepreciation.assetId, assets.id))
    .where(filters.length > 0 ? and(...filters) : undefined);

  const assetIds = rows.map((row) => row.id);
  if (assetIds.length === 0) return [];

  const [relations, attachments, buildingLandRows, unitRows] = await Promise.all([
    db.select().from(assetOrganizations).where(inArray(assetOrganizations.assetId, assetIds)),
    db.select({ assetId: assetAttachments.assetId, count: sql<number>`count(*)::int` }).from(assetAttachments).where(inArray(assetAttachments.assetId, assetIds)).groupBy(assetAttachments.assetId),
    db.select({ buildingAssetId: assetBuildingLands.buildingAssetId, count: sql<number>`count(*)::int` }).from(assetBuildingLands).where(inArray(assetBuildingLands.buildingAssetId, assetIds)).groupBy(assetBuildingLands.buildingAssetId),
    db.select({ id: units.id, name: units.name }).from(units),
  ]);

  const unitsById = new Map(unitRows.map((unit) => [unit.id, unit.name]));
  const attachmentsByAssetId = new Map(attachments.map((item) => [item.assetId, item.count]));
  const buildingLandCountByAssetId = new Map(buildingLandRows.map((item) => [item.buildingAssetId, item.count]));
  const relationsByAssetId = new Map<string, typeof relations>();

  for (const relation of relations) {
    relationsByAssetId.set(relation.assetId, [...(relationsByAssetId.get(relation.assetId) ?? []), relation]);
  }

  return rows.map((row) => {
    const assetRelations = relationsByAssetId.get(row.id) ?? [];
    const relationByType = new Map(assetRelations.map((relation) => [relation.relationType, relation]));
    const ownedBy = relationByType.get("owned_by");
    const financedBy = relationByType.get("financed_by");
    const usedBy = relationByType.get("used_by");
    const inputter = relationByType.get("inputted_by");

    return {
      ...row,
      ownedByOrganizationId: ownedBy?.unitId ?? null,
      financedByOrganizationId: financedBy?.unitId ?? null,
      usedByOrganizationId: usedBy?.unitId ?? null,
      inputterOrganizationId: inputter?.unitId ?? null,
      ownedByOrganizationName: ownedBy?.unitId ? unitsById.get(ownedBy.unitId) ?? null : null,
      usedByOrganizationName: usedBy?.unitId ? unitsById.get(usedBy.unitId) ?? null : null,
      documentCount: attachmentsByAssetId.get(row.id) ?? 0,
      buildingLandCount: buildingLandCountByAssetId.get(row.id) ?? 0,
    };
  });
}

export function getAssetDashboardSummary(assets: AssetDashboardAsset[]): AssetDashboardSummary {
  const activeAssets = assets.filter((asset) => asset.status === "active" || asset.status === "expired_still_used");
  return {
    totalActiveAssets: activeAssets.length,
    totalAcquisitionValue: assets.reduce((total, asset) => total + toNumber(asset.acquisitionValue), 0),
    totalBookValue: assets.reduce((total, asset) => total + calculateBookValue(asset), 0),
    totalAccumulatedDepreciation: assets.reduce((total, asset) => total + (asset.assetType === "tanah" ? 0 : toNumber(asset.accumulatedDepreciation)), 0),
    incompleteDataAssets: assets.filter((asset) => getAssetIssues(asset).length > 0).length,
    actionRequiredAssets: getAssetActionRequired(assets).length,
  };
}

export function getAssetComposition(assets: AssetDashboardAsset[]): AssetCompositionRow[] {
  const labels = ["tanah", "bangunan", "kendaraan", "benda"];
  return labels.map((assetType) => {
    const rows = assets.filter((asset) => asset.assetType === assetType);
    return {
      assetType,
      count: rows.length,
      acquisitionValue: rows.reduce((total, asset) => total + toNumber(asset.acquisitionValue), 0),
      bookValue: rows.reduce((total, asset) => total + calculateBookValue(asset), 0),
    };
  });
}

export function getAssetDataHealth(assets: AssetDashboardAsset[]): AssetDataHealth {
  const issueCounts = {} as AssetDataHealth["issueCounts"];
  const codeCounts = new Map<string, number>();

  for (const asset of assets) {
    if (asset.code) codeCounts.set(asset.code, (codeCounts.get(asset.code) ?? 0) + 1);
    for (const issue of getAssetIssues(asset)) {
      issueCounts[issue.code] = (issueCounts[issue.code] ?? 0) + 1;
    }
  }

  return {
    score: calculateDataHealthScore(assets),
    totalAssets: assets.length,
    issueCounts,
    duplicateAssetCodes: [...codeCounts.entries()].filter(([, count]) => count > 1).map(([code, count]) => ({ code, count })),
  };
}

export function getAssetLocationHealth(assets: AssetDashboardAsset[]): AssetLocationHealth {
  const landAssets = assets.filter((asset) => asset.assetType === "tanah");
  const buildingAssets = assets.filter((asset) => asset.assetType === "bangunan");
  const problematicLandAssets = landAssets
    .map((asset) => ({ id: asset.id, code: asset.code, name: asset.name, issues: getAssetIssues(asset).filter((issue) => issue.code === "MISSING_COORDINATE" || issue.code === "MISSING_LAND_BOUNDARY") }))
    .filter((asset) => asset.issues.length > 0)
    .slice(0, 10);

  return {
    landWithCoordinate: landAssets.filter((asset) => toNumber(asset.landLatitude) !== 0 && toNumber(asset.landLongitude) !== 0).length,
    landWithoutCoordinate: landAssets.filter((asset) => toNumber(asset.landLatitude) === 0 || toNumber(asset.landLongitude) === 0).length,
    buildingWithCoordinateOrLand: buildingAssets.filter((asset) => (toNumber(asset.buildingLatitude) !== 0 && toNumber(asset.buildingLongitude) !== 0) || asset.buildingMainLandAssetId || (asset.buildingLandCount ?? 0) > 0).length,
    buildingWithoutLandOrLocation: buildingAssets.filter((asset) => toNumber(asset.buildingLatitude) === 0 && toNumber(asset.buildingLongitude) === 0 && !asset.buildingMainLandAssetId && !(asset.buildingLandCount ?? 0)).length,
    landMissingBoundary: problematicLandAssets.filter((asset) => asset.issues.some((issue) => issue.code === "MISSING_LAND_BOUNDARY")).length,
    problematicLandAssets,
  };
}

export function getAssetActionRequired(assets: AssetDashboardAsset[]): AssetActionRequiredRow[] {
  return assets
    .map((asset) => {
      const priorityIssues = getAssetIssues(asset).filter((issue) => issue.severity === "critical" || issue.severity === "high");
      return {
        id: asset.id,
        code: asset.code,
        name: asset.name,
        assetType: asset.assetType,
        ownedByOrganizationName: asset.ownedByOrganizationName ?? null,
        usedByOrganizationName: asset.usedByOrganizationName ?? null,
        issues: priorityIssues,
        priority: getPriority(priorityIssues),
      };
    })
    .filter((asset) => asset.issues.length > 0)
    .sort((a, b) => {
      const rank = { critical: 0, high: 1, medium: 2, low: 3 };
      return rank[a.priority] - rank[b.priority] || a.name.localeCompare(b.name);
    })
    .slice(0, 10);
}

export async function getAssetDashboardData(
  user: SessionUser,
  scope: AccessScope,
  searchParams: Record<string, string | string[] | undefined>
): Promise<AssetDashboardData | { error: "NO_ORGANIZATION" | "FORBIDDEN_DESCENDANT" }> {
  const organizationOptions = await listDashboardOrganizationOptions(scope);
  if (organizationOptions.length === 0) return { error: "NO_ORGANIZATION" };

  const params = normalizeAssetDashboardParams(searchParams, user, organizationOptions);
  if (params.scope === "descendant" && !canViewDescendantAssets(user, params.organizationId, scope)) {
    return { error: "FORBIDDEN_DESCENDANT" };
  }

  const unitIds = await resolveDashboardUnitIds(params);
  const organizationIds = resolveOrganizationIdsForScope(unitIds, params.organizationId, params.scope);
  const scopedAssets = await listScopedDashboardAssets(scope, params);
  const assetsByDimension = filterAssetsByOrganizationScope(scopedAssets, organizationIds, params.dimension);

  return {
    params,
    user,
    organizationOptions,
    canViewValues: canViewAssetValue(user),
    summary: getAssetDashboardSummary(assetsByDimension),
    composition: getAssetComposition(assetsByDimension),
    dataHealth: getAssetDataHealth(assetsByDimension),
    locationHealth: getAssetLocationHealth(assetsByDimension),
    actionRequired: getAssetActionRequired(assetsByDimension),
  };
}
