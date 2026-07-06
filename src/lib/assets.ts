import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  assetAttachments,
  assetBuildingDetails,
  assetBuildingLands,
  assetItemDetails,
  assetLandDetails,
  assetOrganizations,
  assetVehicleDetails,
  assets,
  badanHukums,
  taxAssetCoretax,
  taxAssetDepreciation,
  taxDepreciationGroups,
  taxDepreciationRules,
  units,
  users,
} from "@/db/schema";
import type { AccessScope } from "@/lib/scope";
import { buildAssetScopeCondition, buildBadanHukumScopeCondition, buildUnitScopeCondition } from "@/lib/scope";
import { listTaxDepreciationGroupsByCategory } from "@/lib/tax-master";

export type AssetCommonFormInput = {
  code: string;
  name: string;
  assetType: string;
  ownershipLevel: string;
  unitId: string | null;
  badanHukumId: string | null;
  acquisitionDate: string | null;
  acquisitionValue: string | null;
  legalStatus: string;
  ownerName: string | null;
  condition: string | null;
  status: string;
  notes: string | null;
};

export type AssetDetailKind = "tanah" | "bangunan" | "kendaraan" | "benda";

export type AssetListItem = {
  id: string;
  code: string;
  name: string;
  assetType: string;
  ownershipLevel: string;
  unitName: string | null;
  badanHukumName: string | null;
  status: string;
};

export async function listAssets(scope?: AccessScope) {
  const condition = scope ? buildAssetScopeCondition(scope) : undefined;

  const query = db
    .select({
      id: assets.id,
      code: assets.code,
      name: assets.name,
      assetType: assets.assetType,
      ownershipLevel: assets.ownershipLevel,
      status: assets.status,
      unitName: units.name,
      badanHukumName: badanHukums.name,
    })
    .from(assets)
    .leftJoin(units, eq(assets.unitId, units.id))
    .leftJoin(badanHukums, eq(assets.badanHukumId, badanHukums.id))
    .orderBy(desc(assets.createdAt));

  if (condition) {
    return (await query.where(condition)) as AssetListItem[];
  }

  return (await query) as AssetListItem[];
}

export async function listAssetLookups(scope?: AccessScope) {
  const unitCondition = scope ? buildUnitScopeCondition(scope) : undefined;
  const badanHukumCondition = scope ? buildBadanHukumScopeCondition(scope) : undefined;
  const assetCondition = scope ? buildAssetScopeCondition(scope) : undefined;

  const unitQuery = db.select().from(units).orderBy(asc(units.name));
  const badanHukumQuery = db.select().from(badanHukums).orderBy(asc(badanHukums.name));
  const assetQuery = db
    .select({ id: assets.id, code: assets.code, name: assets.name, assetType: assets.assetType })
    .from(assets)
    .orderBy(asc(assets.name));

  const [unitRows, badanHukumRows, rootAssets, activeUsers, depreciationGroups] = await Promise.all([
    unitCondition ? unitQuery.where(unitCondition) : unitQuery,
    badanHukumCondition ? badanHukumQuery.where(badanHukumCondition) : badanHukumQuery,
    assetCondition ? assetQuery.where(assetCondition) : assetQuery,
    db.select({ id: users.id, name: users.name, email: users.email }).from(users).orderBy(asc(users.name)),
    db
      .select({
        id: taxDepreciationGroups.id,
        code: taxDepreciationGroups.code,
        name: taxDepreciationGroups.name,
        assetCategory: taxDepreciationGroups.assetCategory,
      })
      .from(taxDepreciationGroups)
      .where(eq(taxDepreciationGroups.isActive, true))
      .orderBy(asc(taxDepreciationGroups.assetCategory), asc(taxDepreciationGroups.name)),
  ]);

  return {
    units: unitRows,
    badanHukums: badanHukumRows,
    assets: rootAssets,
    landAssets: rootAssets.filter((asset) => asset.assetType === "tanah"),
    users: activeUsers,
    depreciationGroups,
  };
}

export async function getAsset(id: string) {
  const rows = await db.select().from(assets).where(eq(assets.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getAssetAttachmentRows(assetId: string) {
  return db.select().from(assetAttachments).where(eq(assetAttachments.assetId, assetId));
}

export async function getAssetOrganizationRows(assetId: string) {
  return db.select().from(assetOrganizations).where(eq(assetOrganizations.assetId, assetId));
}

export async function getAssetBuildingLandIds(buildingAssetId: string) {
  const rows = await db
    .select({ landAssetId: assetBuildingLands.landAssetId })
    .from(assetBuildingLands)
    .where(eq(assetBuildingLands.buildingAssetId, buildingAssetId));

  return rows.map((row) => row.landAssetId);
}

export async function getTaxAssetCoretax(assetId: string) {
  const rows = await db.select().from(taxAssetCoretax).where(eq(taxAssetCoretax.assetId, assetId)).limit(1);
  return rows[0] ?? null;
}

export async function getLatestAssetDepreciation(assetId: string) {
  const rows = await db
    .select({
      record: taxAssetDepreciation,
      groupName: taxDepreciationGroups.name,
      groupCode: taxDepreciationGroups.code,
    })
    .from(taxAssetDepreciation)
    .leftJoin(taxDepreciationGroups, eq(taxAssetDepreciation.depreciationGroupId, taxDepreciationGroups.id))
    .where(eq(taxAssetDepreciation.assetId, assetId))
    .orderBy(desc(taxAssetDepreciation.createdAt), desc(taxAssetDepreciation.taxYear))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    ...row.record,
    groupName: row.groupName,
    groupCode: row.groupCode,
  };
}

export async function getAssetDepreciationHistory(assetId: string) {
  return db
    .select({
      record: taxAssetDepreciation,
      groupName: taxDepreciationGroups.name,
      groupCode: taxDepreciationGroups.code,
    })
    .from(taxAssetDepreciation)
    .leftJoin(taxDepreciationGroups, eq(taxAssetDepreciation.depreciationGroupId, taxDepreciationGroups.id))
    .where(eq(taxAssetDepreciation.assetId, assetId))
    .orderBy(desc(taxAssetDepreciation.createdAt), desc(taxAssetDepreciation.taxYear));
}

export async function getAssetDetailRows(assetId: string) {
  const [land, building, vehicle, item, depreciation, depreciationHistory, coretax, buildingLandIds] = await Promise.all([
    db.select().from(assetLandDetails).where(eq(assetLandDetails.assetId, assetId)).limit(1),
    db.select().from(assetBuildingDetails).where(eq(assetBuildingDetails.assetId, assetId)).limit(1),
    db.select().from(assetVehicleDetails).where(eq(assetVehicleDetails.assetId, assetId)).limit(1),
    db.select().from(assetItemDetails).where(eq(assetItemDetails.assetId, assetId)).limit(1),
    getLatestAssetDepreciation(assetId),
    getAssetDepreciationHistory(assetId),
    db.select().from(taxAssetCoretax).where(eq(taxAssetCoretax.assetId, assetId)).limit(1),
    getAssetBuildingLandIds(assetId),
  ]);

  return {
    land: land[0] ?? null,
    building: building[0] ?? null,
    vehicle: vehicle[0] ?? null,
    item: item[0] ?? null,
    depreciation,
    depreciationHistory: depreciationHistory.map((row) => ({
      ...row.record,
      groupName: row.groupName,
      groupCode: row.groupCode,
    })),
    coretax: coretax[0] ?? null,
    buildingLandIds,
  };
}

export async function getAssetAuditSnapshot(assetId: string) {
  const [asset, detail, organizations, attachments] = await Promise.all([
    getAsset(assetId),
    getAssetDetailRows(assetId),
    getAssetOrganizationRows(assetId),
    getAssetAttachmentRows(assetId),
  ]);

  return {
    asset,
    detail,
    organizations,
    attachments,
    coretax: detail.coretax,
    buildingLandIds: detail.buildingLandIds,
  };
}

export async function createAsset(input: AssetCommonFormInput) {
  const [row] = await db.insert(assets).values(input).returning();
  return row;
}

export async function updateAsset(id: string, input: AssetCommonFormInput) {
  const [row] = await db.update(assets).set(input).where(eq(assets.id, id)).returning();
  return row ?? null;
}

export async function deleteAsset(id: string) {
  await db.delete(assets).where(eq(assets.id, id));
}

export async function replaceAssetOrganizations(
  assetId: string,
  relations: Array<{
    relationType: string;
    unitId: string | null;
    badanHukumId: string | null;
    userId: string | null;
    notes: string | null;
  }>
) {
  await db.delete(assetOrganizations).where(eq(assetOrganizations.assetId, assetId));

  const validRelations = relations.filter((relation) => relation.unitId || relation.badanHukumId || relation.userId);
  if (validRelations.length > 0) {
    await db.insert(assetOrganizations).values(validRelations.map((relation) => ({ assetId, ...relation })));
  }
}

export async function upsertAssetAttachments(
  assetId: string,
  attachments: Array<{
    attachmentType: string;
    filePath: string;
    notes: string | null;
  }>
) {
  await db.delete(assetAttachments).where(eq(assetAttachments.assetId, assetId));

  if (attachments.length > 0) {
    await db.insert(assetAttachments).values(attachments.map((attachment) => ({ assetId, ...attachment })));
  }
}

export async function replaceAssetBuildingLands(buildingAssetId: string, landAssetIds: string[]) {
  const uniqueLandIds = [...new Set(landAssetIds)];

  if (uniqueLandIds.length > 0) {
    const landRows = await db
      .select({ id: assets.id, assetType: assets.assetType })
      .from(assets)
      .where(inArray(assets.id, uniqueLandIds));

    if (landRows.length !== uniqueLandIds.length || landRows.some((row) => row.assetType !== "tanah")) {
      throw new Error("Tanah terkait bangunan harus berjenis tanah yang valid");
    }
  }

  await db.delete(assetBuildingLands).where(eq(assetBuildingLands.buildingAssetId, buildingAssetId));

  if (uniqueLandIds.length > 0) {
    await db.insert(assetBuildingLands).values(
      uniqueLandIds.map((landAssetId) => ({
        buildingAssetId,
        landAssetId,
      }))
    );
  }
}

export async function upsertTaxAssetCoretax(
  assetId: string,
  detail: {
    coretaxAssetType: string | null;
    coretaxAssetCode: string | null;
    assetClassType: string | null;
    ownershipSource: string | null;
    sptOwnerName: string | null;
    taxNotes: string | null;
    auditNotes: string | null;
  }
) {
  const hasValue = Object.values(detail).some((value) => value && value.length > 0);

  if (!hasValue) {
    await db.delete(taxAssetCoretax).where(eq(taxAssetCoretax.assetId, assetId));
    return;
  }

  await db
    .insert(taxAssetCoretax)
    .values({ assetId, ...detail })
    .onConflictDoUpdate({
      target: taxAssetCoretax.assetId,
      set: {
        ...detail,
        updatedAt: new Date(),
      },
    });
}

export async function appendAssetDepreciation(
  assetId: string,
  detail: {
    depreciationGroupId: string;
    ruleId: string | null;
    acquisitionValue: string;
    residualValue: string;
    depreciableBase: string;
    annualDepreciation: string;
    accumulatedDepreciation: string;
    bookValue: string;
    startDate: string;
    endDate: string | null;
    status: string;
    calculationMethod: string;
    taxYear: number;
    notes: string | null;
  }
) {
  const latest = await getLatestAssetDepreciation(assetId);

  if (
    latest &&
    latest.depreciationGroupId === detail.depreciationGroupId &&
    latest.ruleId === detail.ruleId &&
    latest.acquisitionValue === detail.acquisitionValue &&
    latest.calculationMethod === detail.calculationMethod &&
    latest.annualDepreciation === detail.annualDepreciation &&
    latest.depreciableBase === detail.depreciableBase
  ) {
    return latest;
  }

  const [row] = await db.insert(taxAssetDepreciation).values({ assetId, ...detail }).returning();
  return row;
}

/** @deprecated Use appendAssetDepreciation — histori tidak boleh ditimpa */
export async function replaceAssetDepreciation(
  assetId: string,
  detail: Parameters<typeof appendAssetDepreciation>[1]
) {
  return appendAssetDepreciation(assetId, detail);
}

export async function getDepreciationGroupById(groupId: string) {
  const rows = await db.select().from(taxDepreciationGroups).where(eq(taxDepreciationGroups.id, groupId)).limit(1);
  return rows[0] ?? null;
}

export async function getActiveDepreciationGroup(assetCategory: string, groupId?: string | null) {
  if (groupId) {
    const selected = await getDepreciationGroupById(groupId);
    if (selected?.isActive) {
      return selected;
    }
  }

  const rows = await listTaxDepreciationGroupsByCategory(assetCategory);
  return rows[0] ?? null;
}

export async function upsertLandDetail(assetId: string, detail: Record<string, string | number | null>) {
  await db.delete(assetLandDetails).where(eq(assetLandDetails.assetId, assetId));
  await db.insert(assetLandDetails).values({ assetId, ...detail });
}

export async function upsertBuildingDetail(assetId: string, detail: Record<string, string | number | null>) {
  await db.delete(assetBuildingDetails).where(eq(assetBuildingDetails.assetId, assetId));
  await db.insert(assetBuildingDetails).values({ assetId, ...detail });
}

export async function upsertVehicleDetail(assetId: string, detail: Record<string, string | number | null>) {
  await db.delete(assetVehicleDetails).where(eq(assetVehicleDetails.assetId, assetId));
  await db.insert(assetVehicleDetails).values({ assetId, ...detail });
}

export async function upsertItemDetail(assetId: string, detail: Record<string, string | number | null>) {
  await db.delete(assetItemDetails).where(eq(assetItemDetails.assetId, assetId));
  await db.insert(assetItemDetails).values({ assetId, ...detail });
}

export async function getActiveDepreciationRule(groupId: string, taxYear: number) {
  const exactYearRows = await db
    .select()
    .from(taxDepreciationRules)
    .where(and(eq(taxDepreciationRules.groupId, groupId), eq(taxDepreciationRules.taxYear, taxYear), eq(taxDepreciationRules.isActive, true)))
    .orderBy(desc(taxDepreciationRules.effectiveFrom), desc(taxDepreciationRules.updatedAt))
    .limit(1);

  if (exactYearRows[0]) {
    return exactYearRows[0];
  }

  const fallbackRows = await db
    .select()
    .from(taxDepreciationRules)
    .where(and(eq(taxDepreciationRules.groupId, groupId), eq(taxDepreciationRules.isActive, true)))
    .orderBy(desc(taxDepreciationRules.taxYear), desc(taxDepreciationRules.effectiveFrom), desc(taxDepreciationRules.updatedAt))
    .limit(1);

  return fallbackRows[0] ?? null;
}
