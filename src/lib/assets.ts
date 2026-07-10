import { and, asc, desc, eq, gte, inArray, notInArray, sql } from "drizzle-orm";


import { db } from "@/db";
import {
  assetAttachments,
  assetBuildingDetails,
  assetBuildingLands,
  assetItemDetails,
  assetLandDetails,
  assetLocations,
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
import { finalDisposalAssetStatuses, isFinalDisposalAssetStatus, isManuallyEditableAssetStatus, normalizeLegacyAssetStatus, assertLoanedToInvariant, assertOnLoanStatusNote, resolveLoanedTo } from "@/lib/assets/status";
import { buildStatusHistoryNote, hasStatusHistoryValueChanged, recordAssetHistoryChanges, recordAssetPlacementChanges } from "@/lib/assets/histories";
import { assetPlacementHistorySources } from "@/lib/assets/histories.shared";
import { hasHistoryValueChanged, hasPlacementHistoryValueChanged } from "@/lib/assets/histories.helpers";
import { listActiveAssetStatusOptions, listFormSelectableAssetStatusOptions } from "@/lib/asset-statuses";
import { listActiveAssetCategoryOptions } from "@/lib/asset-categories";
import { listActiveAssetLocations } from "@/lib/master-data";
import { getAssetLocation } from "@/lib/master-data";
import { assertLocationKindMatchesAssetType } from "@/lib/assets/location-kind";
import { requiresPlacementLocation, usesMasterDataPlacementLocation } from "@/lib/assets/placement";
import { listTaxDepreciationGroupsByCategory } from "@/lib/tax-master";

export type AssetCommonFormInput = {
  code: string;
  name: string;
  assetType: string;
  ownershipLevel: string;
  unitId: string | null;
  badanHukumId: string | null;
  locationId: string | null;
  acquisitionDate: string | null;
  acquisitionValue: string | null;
  legalStatus: string;
  ownerName: string | null;
  condition: string | null;
  status: string;
  loanedTo: string | null;
  notes: string | null;
};

export type AssetDetailKind = "tanah" | "bangunan" | "kendaraan" | "benda";

export type AssetListItem = {
  id: string;
  code: string;
  name: string;
  assetType: string;
  ownershipLevel: string;
  unitId: string | null;
  unitName: string | null;
  badanHukumName: string | null;
  locationName: string | null;
  locationId: string | null;
  status: string;
  condition: string | null;
  loanedTo: string | null;
};

export async function listAssets(scope?: AccessScope, assetType?: AssetDetailKind) {
  const scopeCondition = scope ? buildAssetScopeCondition(scope) : undefined;
  const typeCondition = assetType ? eq(assets.assetType, assetType) : undefined;
  const activeListCondition = notInArray(assets.status, [...finalDisposalAssetStatuses]);
  const condition = and(...[scopeCondition, typeCondition, activeListCondition].filter(Boolean));

  const query = db
    .select({
      id: assets.id,
      code: assets.code,
      name: assets.name,
      assetType: assets.assetType,
      ownershipLevel: assets.ownershipLevel,
      status: assets.status,
      unitId: assets.unitId,
      unitName: units.name,
      badanHukumName: badanHukums.name,
      locationName: assetLocations.name,
      locationId: assets.locationId,
      condition: assets.condition,
      loanedTo: assets.loanedTo,
    })
    .from(assets)
    .leftJoin(units, eq(assets.unitId, units.id))
    .leftJoin(badanHukums, eq(assets.badanHukumId, badanHukums.id))
    .leftJoin(assetLocations, eq(assets.locationId, assetLocations.id))
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

  const [unitRows, badanHukumRows, rootAssets, activeUsers, depreciationGroups, locations, assetStatuses, formAssetStatuses, buildingCategories, vehicleCategories, itemCategories] = await Promise.all([
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
    listActiveAssetLocations(scope),
    listActiveAssetStatusOptions(),
    listFormSelectableAssetStatusOptions(),
    listActiveAssetCategoryOptions("bangunan"),
    listActiveAssetCategoryOptions("kendaraan"),
    listActiveAssetCategoryOptions("benda"),
  ]);

  return {
    units: unitRows,
    badanHukums: badanHukumRows,
    assets: rootAssets,
    landAssets: rootAssets.filter((asset) => asset.assetType === "tanah"),
    users: activeUsers,
    depreciationGroups,
    locations,
    assetStatuses,
    formAssetStatuses,
    buildingCategories,
    vehicleCategories,
    itemCategories,
  };
}

export async function listTopAssetLocations(scope?: AccessScope, limit = 5) {
  const scopeCondition = scope ? buildAssetScopeCondition(scope) : undefined;
  const hasLocation = sql`${assets.locationId} is not null`;
  const condition = scopeCondition ? and(scopeCondition, hasLocation) : hasLocation;

  return db
    .select({
      locationId: assetLocations.id,
      locationName: assetLocations.name,
      unitName: units.name,
      assetCount: sql<number>`count(${assets.id})::int`,
    })
    .from(assets)
    .innerJoin(assetLocations, eq(assets.locationId, assetLocations.id))
    .leftJoin(units, eq(assetLocations.unitId, units.id))
    .where(condition)
    .groupBy(assetLocations.id, assetLocations.name, units.name)
    .orderBy(desc(sql`count(${assets.id})`), asc(assetLocations.name))
    .limit(limit);
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

export type DbExecutor = any;

export async function createAsset(input: AssetCommonFormInput) {
  const [row] = await db.insert(assets).values(input).returning();
  return row;
}

export async function createAssetWithInitialHistory(
  tx: DbExecutor,
  input: {
    payload: AssetCommonFormInput;
    actorUserId: string;
    statusNotes?: string | null;
    conditionNotes?: string | null;
  }
) {
  const [row] = await tx.insert(assets).values(input.payload).returning();
  await recordAssetHistoryChanges(tx, {
    assetId: row.id,
    actorUserId: input.actorUserId,
    before: null,
    after: { status: row.status, condition: row.condition, loanedTo: row.loanedTo },
    statusNotes: input.statusNotes ?? null,
    conditionNotes: input.conditionNotes ?? null,
  });
  return row;
}

export async function updateAsset(id: string, input: AssetCommonFormInput) {
  const [row] = await db.update(assets).set(input).where(eq(assets.id, id)).returning();
  return row ?? null;
}

export async function updateAssetWithHistory(
  tx: DbExecutor,
  input: {
    assetId: string;
    payload: AssetCommonFormInput;
    actorUserId: string;
    before: {
      status: string;
      condition: string | null;
      loanedTo: string | null;
      unitId: string | null;
      locationId: string | null;
    };
    statusNotes?: string | null;
    conditionNotes?: string | null;
    loanNotes?: string | null;
    placementNotes?: string | null;
  }
) {
  const [row] = await tx.update(assets).set(input.payload).where(eq(assets.id, input.assetId)).returning();
  if (!row) {
    throw new Error("Asset tidak ditemukan");
  }

  await recordAssetHistoryChanges(tx, {
    assetId: input.assetId,
    actorUserId: input.actorUserId,
    before: input.before,
    after: { status: row.status, condition: row.condition, loanedTo: row.loanedTo },
    statusNotes: input.statusNotes ?? null,
    conditionNotes: input.conditionNotes ?? null,
    loanNotes: input.loanNotes ?? null,
  });

  await recordAssetPlacementChanges(tx, {
    assetId: input.assetId,
    actorUserId: input.actorUserId,
    source: assetPlacementHistorySources.MANUAL,
    before: { unitId: input.before.unitId, locationId: input.before.locationId },
    after: { unitId: row.unitId, locationId: row.locationId },
    notes: input.placementNotes ?? null,
  });

  return row;
}

export async function quickUpdateAssetOperationalState(input: {
  assetId: string;
  assetType: AssetDetailKind;
  status?: string | null;
  condition?: string | null;
  statusNote?: string | null;
  conditionNote?: string | null;
  actorUserId: string;
}) {
  const asset = await getAsset(input.assetId);
  if (!asset) {
    throw new Error("Asset tidak ditemukan");
  }

  if (isFinalDisposalAssetStatus(asset.status)) {
    throw new Error("Aset dengan status keluar inventori tidak dapat diperbarui dari daftar");
  }

  const normalizedCurrentStatus = normalizeLegacyAssetStatus(asset.status);
  const nextStatus = normalizeLegacyAssetStatus(input.status ?? asset.status);
  const nextCondition = input.condition !== undefined ? input.condition : asset.condition;
  const nextLoanedTo = resolveLoanedTo({
    nextStatus,
    previousStatus: normalizedCurrentStatus,
    statusNote: input.statusNote,
    currentLoanedTo: asset.loanedTo,
  });
  assertLoanedToInvariant(nextStatus, nextLoanedTo);

  if (input.status && nextStatus !== normalizedCurrentStatus) {
    if (!isManuallyEditableAssetStatus(normalizedCurrentStatus)) {
      throw new Error("Status aset saat ini dikelola oleh proses disposal");
    }
    if (!isManuallyEditableAssetStatus(nextStatus)) {
      throw new Error("Status ini hanya dapat diubah melalui proses Disposal");
    }
    assertOnLoanStatusNote({
      nextStatus,
      currentStatus: normalizedCurrentStatus,
      statusNote: input.statusNote,
    });
  }

  if (
    !hasStatusHistoryValueChanged(normalizedCurrentStatus, nextStatus) &&
    !hasHistoryValueChanged(asset.condition, nextCondition) &&
    !hasHistoryValueChanged(asset.loanedTo, nextLoanedTo)
  ) {
    throw new Error("Tidak ada perubahan status, kondisi fisik, atau peminjam");
  }

  return db.transaction(async (tx) => {
    await tx
      .update(assets)
      .set({
        status: nextStatus,
        condition: nextCondition,
        loanedTo: nextLoanedTo,
        updatedAt: new Date(),
      })
      .where(eq(assets.id, input.assetId));

    if (input.assetType === "kendaraan" && input.condition !== undefined) {
      await tx
        .update(assetVehicleDetails)
        .set({ condition: nextCondition })
        .where(eq(assetVehicleDetails.assetId, input.assetId));
    }

    if (input.assetType === "benda" && input.condition !== undefined) {
      await tx
        .update(assetItemDetails)
        .set({ condition: nextCondition })
        .where(eq(assetItemDetails.assetId, input.assetId));
    }

    await recordAssetHistoryChanges(tx, {
      assetId: input.assetId,
      actorUserId: input.actorUserId,
      before: { status: normalizedCurrentStatus, condition: asset.condition, loanedTo: asset.loanedTo },
      after: { status: nextStatus, condition: nextCondition, loanedTo: nextLoanedTo },
      statusNotes: hasStatusHistoryValueChanged(normalizedCurrentStatus, nextStatus)
        ? buildStatusHistoryNote(nextStatus, input.statusNote)
        : null,
      conditionNotes: hasHistoryValueChanged(asset.condition, nextCondition) ? input.conditionNote?.trim() || null : null,
      loanNotes:
        hasHistoryValueChanged(asset.loanedTo, nextLoanedTo) &&
        !hasStatusHistoryValueChanged(normalizedCurrentStatus, nextStatus)
          ? input.statusNote?.trim() || null
          : null,
    });

    const [row] = await tx.select().from(assets).where(eq(assets.id, input.assetId)).limit(1);
    return row ?? null;
  });
}

export async function quickMoveAssetPlacement(input: {
  assetId: string;
  locationId: string;
  placementNote?: string | null;
  actorUserId: string;
}) {
  const asset = await getAsset(input.assetId);
  if (!asset) {
    throw new Error("Asset tidak ditemukan");
  }

  if (!usesMasterDataPlacementLocation(asset.assetType)) {
    throw new Error("Hanya benda dan kendaraan yang dapat dipindahkan lokasinya dari daftar aset");
  }

  if (asset.ownershipLevel !== "keuskupan") {
    throw new Error("Penempatan master lokasi hanya berlaku untuk aset unit keuskupan");
  }

  if (!asset.unitId) {
    throw new Error("Unit pengelola belum ditentukan");
  }

  if (isFinalDisposalAssetStatus(asset.status)) {
    throw new Error("Aset dengan status keluar inventori tidak dapat dipindahkan lokasinya");
  }

  const location = await getAssetLocation(input.locationId);
  if (!location || !location.isActive) {
    throw new Error("Lokasi tidak valid atau sudah nonaktif");
  }

  if (location.unitId !== asset.unitId) {
    throw new Error("Lokasi harus berada pada unit pengelola aset saat ini");
  }

  assertLocationKindMatchesAssetType(location.locationKind, asset.assetType);

  if (!hasPlacementHistoryValueChanged({ locationId: asset.locationId }, { locationId: input.locationId })) {
    throw new Error("Pilih lokasi tujuan yang berbeda dari lokasi saat ini");
  }

  if (requiresPlacementLocation(asset.assetType, asset.status) && !input.locationId.trim()) {
    throw new Error(
      asset.assetType === "kendaraan"
        ? "Garasi / area parkir wajib dipilih untuk kendaraan aktif"
        : "Ruang penempatan wajib dipilih untuk benda aktif"
    );
  }

  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(assets)
      .set({ locationId: input.locationId, updatedAt: new Date() })
      .where(eq(assets.id, input.assetId))
      .returning();

    if (!row) {
      throw new Error("Asset tidak ditemukan");
    }

    await recordAssetPlacementChanges(tx, {
      assetId: input.assetId,
      actorUserId: input.actorUserId,
      source: assetPlacementHistorySources.MANUAL,
      before: { unitId: asset.unitId, locationId: asset.locationId },
      after: { unitId: asset.unitId, locationId: row.locationId },
      notes: input.placementNote?.trim() || "Perubahan lokasi penempatan dari daftar aset.",
    });

    return row;
  });
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
  }>,
  executor: DbExecutor = db
) {
  await executor.delete(assetOrganizations).where(eq(assetOrganizations.assetId, assetId));

  const validRelations = relations.filter((relation) => relation.unitId || relation.badanHukumId || relation.userId);
  if (validRelations.length > 0) {
    await executor.insert(assetOrganizations).values(validRelations.map((relation) => ({ assetId, ...relation })));
  }
}

const internalDonationOrganizationTypes = ["owned_by", "used_by"] as const;

export async function syncAssetOrganizationsForInternalDonation(
  executor: DbExecutor,
  assetId: string,
  recipientUnitId: string
) {
  const existing = await executor
    .select()
    .from(assetOrganizations)
    .where(
      and(
        eq(assetOrganizations.assetId, assetId),
        inArray(assetOrganizations.relationType, [...internalDonationOrganizationTypes])
      )
    );

  const existingByType = new Map<any, any>(existing.map((row: any) => [row.relationType, row]));

  for (const relationType of internalDonationOrganizationTypes) {
    const row = existingByType.get(relationType);
    if (row) {
      await executor
        .update(assetOrganizations)
        .set({ unitId: recipientUnitId, badanHukumId: null })
        .where(eq(assetOrganizations.id, row.id));
      continue;
    }

    await executor.insert(assetOrganizations).values({
      assetId,
      relationType,
      unitId: recipientUnitId,
      badanHukumId: null,
      userId: null,
      notes: null,
    });
  }
}

export async function upsertAssetAttachments(
  assetId: string,
  attachments: Array<{
    attachmentType: string;
    filePath: string;
    notes: string | null;
  }>,
  executor: DbExecutor = db
) {
  await executor.delete(assetAttachments).where(eq(assetAttachments.assetId, assetId));

  if (attachments.length > 0) {
    await executor.insert(assetAttachments).values(attachments.map((attachment) => ({ assetId, ...attachment })));
  }
}

export async function replaceAssetBuildingLands(
  buildingAssetId: string,
  landAssetIds: string[],
  primaryLandAssetId?: string | null,
  executor: DbExecutor = db
) {
  const uniqueLandIds = [...new Set(landAssetIds)];

  if (uniqueLandIds.length > 0) {
    const landRows = await executor
      .select({ id: assets.id, assetType: assets.assetType })
      .from(assets)
      .where(inArray(assets.id, uniqueLandIds));

    if (landRows.length !== uniqueLandIds.length || landRows.some((row: any) => row.assetType !== "tanah")) {
      throw new Error("Tanah terkait bangunan harus berjenis tanah yang valid");
    }
  }

  await executor.delete(assetBuildingLands).where(eq(assetBuildingLands.buildingAssetId, buildingAssetId));

  if (uniqueLandIds.length > 0) {
    await executor.insert(assetBuildingLands).values(
      uniqueLandIds.map((landAssetId) => ({
        buildingAssetId,
        landAssetId,
        isPrimary: primaryLandAssetId === landAssetId,
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
  },
  executor: DbExecutor = db
) {
  const hasValue = Object.values(detail).some((value) => value && value.length > 0);

  if (!hasValue) {
    await executor.delete(taxAssetCoretax).where(eq(taxAssetCoretax.assetId, assetId));
    return;
  }

  await executor
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

export async function clearAssetDepreciation(assetId: string, startYear?: number, executor: DbExecutor = db) {
  if (startYear !== undefined) {
    await executor
      .delete(taxAssetDepreciation)
      .where(and(eq(taxAssetDepreciation.assetId, assetId), gte(taxAssetDepreciation.taxYear, startYear)));
  } else {
    await executor.delete(taxAssetDepreciation).where(eq(taxAssetDepreciation.assetId, assetId));
  }
}

export async function saveAssetDepreciationSchedule(
  assetId: string,
  schedule: {
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
  }[],
  executor: DbExecutor = db
) {
  await clearAssetDepreciation(assetId, undefined, executor);
  if (schedule.length > 0) {
    await executor.insert(taxAssetDepreciation).values(
      schedule.map((item) => ({
        assetId,
        depreciationGroupId: item.depreciationGroupId,
        ruleId: item.ruleId,
        acquisitionValue: item.acquisitionValue,
        residualValue: item.residualValue,
        depreciableBase: item.depreciableBase,
        annualDepreciation: item.annualDepreciation,
        accumulatedDepreciation: item.accumulatedDepreciation,
        bookValue: item.bookValue,
        startDate: item.startDate,
        endDate: item.endDate,
        status: item.status,
        calculationMethod: item.calculationMethod,
        taxYear: item.taxYear,
        notes: item.notes,
      }))
    );
  }
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

type AssetDetailValue = string | number | Record<string, unknown>[] | null;

export async function upsertLandDetail(
  assetId: string,
  detail: Record<string, AssetDetailValue>,
  executor: DbExecutor = db
) {
  await executor.delete(assetLandDetails).where(eq(assetLandDetails.assetId, assetId));
  await executor.insert(assetLandDetails).values({ assetId, ...detail });
}

export async function upsertBuildingDetail(
  assetId: string,
  detail: Record<string, AssetDetailValue>,
  executor: DbExecutor = db
) {
  await executor.delete(assetBuildingDetails).where(eq(assetBuildingDetails.assetId, assetId));
  await executor.insert(assetBuildingDetails).values({ assetId, ...detail });
}

export async function upsertVehicleDetail(
  assetId: string,
  detail: Record<string, AssetDetailValue>,
  executor: DbExecutor = db
) {
  await executor.delete(assetVehicleDetails).where(eq(assetVehicleDetails.assetId, assetId));
  await executor.insert(assetVehicleDetails).values({ assetId, ...detail });
}

export async function upsertItemDetail(
  assetId: string,
  detail: Record<string, AssetDetailValue>,
  executor: DbExecutor = db
) {
  await executor.delete(assetItemDetails).where(eq(assetItemDetails.assetId, assetId));
  await executor.insert(assetItemDetails).values({ assetId, ...detail });
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
