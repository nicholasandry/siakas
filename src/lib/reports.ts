import { and, desc, eq } from "drizzle-orm";

import {
  assetOrganizations,
  assetBuildingDetails,
  assetItemDetails,
  assetLandDetails,
  assets,
  assetVehicleDetails,
  badanHukums,
  units,
  users,
} from "@/db/schema";
import { db } from "@/db";
import type { AccessScope } from "@/lib/scope";
import { buildAssetScopeCondition } from "@/lib/scope";

export type AssetReportType = "tanah" | "bangunan" | "kendaraan" | "benda";
export type AssetRelationReportType = "financed_by" | "owned_by" | "used_by" | "inputted_by";

export type AssetReportBaseRow = {
  id: string;
  code: string;
  name: string;
  assetType: string;
  ownershipLevel: string;
  acquisitionDate: string | null;
  acquisitionValue: string | null;
  legalStatus: string | null;
  ownerName: string | null;
  condition: string | null;
  status: string;
  unitName: string | null;
  badanHukumName: string | null;
};

export type AssetRelationshipReportRow = {
  assetId: string;
  assetType: string;
  assetCode: string;
  assetName: string;
  acquisitionValue: string | null;
  relationType: AssetRelationReportType;
  unitName: string | null;
  badanHukumName: string | null;
  userName: string | null;
  notes: string | null;
};

const baseSelect = {
  id: assets.id,
  code: assets.code,
  name: assets.name,
  assetType: assets.assetType,
  ownershipLevel: assets.ownershipLevel,
  acquisitionDate: assets.acquisitionDate,
  acquisitionValue: assets.acquisitionValue,
  legalStatus: assets.legalStatus,
  ownerName: assets.ownerName,
  condition: assets.condition,
  status: assets.status,
  unitName: units.name,
  badanHukumName: badanHukums.name,
};

function assetReportCondition(scope: AccessScope | undefined, assetType?: AssetReportType) {
  const scopeCondition = scope ? buildAssetScopeCondition(scope) : undefined;
  const typeCondition = assetType ? eq(assets.assetType, assetType) : undefined;

  if (scopeCondition && typeCondition) return and(scopeCondition, typeCondition);
  return scopeCondition ?? typeCondition;
}

export async function listAssetReportBaseRows(scope?: AccessScope) {
  const condition = assetReportCondition(scope);
  const query = db
    .select(baseSelect)
    .from(assets)
    .leftJoin(units, eq(assets.unitId, units.id))
    .leftJoin(badanHukums, eq(assets.badanHukumId, badanHukums.id))
    .orderBy(desc(assets.createdAt));

  return (condition ? await query.where(condition) : await query) as AssetReportBaseRow[];
}

export async function listAssetRelationshipReportRows(scope?: AccessScope, assetType?: AssetReportType) {
  const condition = assetReportCondition(scope, assetType);
  const query = db
    .select({
      assetId: assets.id,
      assetType: assets.assetType,
      assetCode: assets.code,
      assetName: assets.name,
      acquisitionValue: assets.acquisitionValue,
      relationType: assetOrganizations.relationType,
      unitName: units.name,
      badanHukumName: badanHukums.name,
      userName: users.name,
      notes: assetOrganizations.notes,
    })
    .from(assetOrganizations)
    .innerJoin(assets, eq(assetOrganizations.assetId, assets.id))
    .leftJoin(units, eq(assetOrganizations.unitId, units.id))
    .leftJoin(badanHukums, eq(assetOrganizations.badanHukumId, badanHukums.id))
    .leftJoin(users, eq(assetOrganizations.userId, users.id))
    .orderBy(desc(assets.createdAt));

  return (condition ? await query.where(condition) : await query) as AssetRelationshipReportRow[];
}

export async function listLandReportRows(scope?: AccessScope) {
  const condition = assetReportCondition(scope, "tanah");
  const rows = await db
    .select({
      ...baseSelect,
      address: assetLandDetails.address,
      areaSquareMeters: assetLandDetails.areaSquareMeters,
      certificateType: assetLandDetails.certificateType,
      certificateNumber: assetLandDetails.certificateNumber,
      certificateHolderName: assetLandDetails.certificateHolderName,
      certificateExpiredAt: assetLandDetails.certificateExpiredAt,
      legalOwnerType: assetLandDetails.legalOwnerType,
      actualOwnerName: assetLandDetails.actualOwnerName,
      lastNjopValue: assetLandDetails.lastNjopValue,
      appraisalValue: assetLandDetails.appraisalValue,
      nopPbb: assetLandDetails.nopPbb,
      landUse: assetLandDetails.landUse,
      acquisitionMethod: assetLandDetails.acquisitionMethod,
      disputeStatus: assetLandDetails.disputeStatus,
      latitude: assetLandDetails.latitude,
      longitude: assetLandDetails.longitude,
      boundaryNorth: assetLandDetails.boundaryNorth,
      boundarySouth: assetLandDetails.boundarySouth,
      boundaryEast: assetLandDetails.boundaryEast,
      boundaryWest: assetLandDetails.boundaryWest,
    })
    .from(assets)
    .leftJoin(units, eq(assets.unitId, units.id))
    .leftJoin(badanHukums, eq(assets.badanHukumId, badanHukums.id))
    .leftJoin(assetLandDetails, eq(assets.id, assetLandDetails.assetId))
    .where(condition)
    .orderBy(desc(assets.createdAt));

  return rows;
}

export async function listBuildingReportRows(scope?: AccessScope) {
  const condition = assetReportCondition(scope, "bangunan");
  const rows = await db
    .select({
      ...baseSelect,
      address: assetBuildingDetails.address,
      buildingCategory: assetBuildingDetails.buildingCategory,
      buildingType: assetBuildingDetails.buildingType,
      mainLandAssetId: assetBuildingDetails.mainLandAssetId,
      acquisitionMethod: assetBuildingDetails.acquisitionMethod,
      buildingAreaSquareMeters: assetBuildingDetails.buildingAreaSquareMeters,
      floorCount: assetBuildingDetails.floorCount,
      constructionYear: assetBuildingDetails.constructionYear,
      lastRenovationYear: assetBuildingDetails.lastRenovationYear,
      structureType: assetBuildingDetails.structureType,
      permitType: assetBuildingDetails.permitType,
      permitNumber: assetBuildingDetails.permitNumber,
      permitExpiredAt: assetBuildingDetails.permitExpiredAt,
      slfNumber: assetBuildingDetails.slfNumber,
      slfExpiredAt: assetBuildingDetails.slfExpiredAt,
      njopValue: assetBuildingDetails.njopValue,
      appraisalValue: assetBuildingDetails.appraisalValue,
      waterSource: assetBuildingDetails.waterSource,
      maintenanceResponsibleName: assetBuildingDetails.maintenanceResponsibleName,
      maintenanceAnnualCost: assetBuildingDetails.maintenanceAnnualCost,
      physicalCondition: assetBuildingDetails.physicalCondition,
      disputeStatus: assetBuildingDetails.disputeStatus,
      latitude: assetBuildingDetails.latitude,
      longitude: assetBuildingDetails.longitude,
    })
    .from(assets)
    .leftJoin(units, eq(assets.unitId, units.id))
    .leftJoin(badanHukums, eq(assets.badanHukumId, badanHukums.id))
    .leftJoin(assetBuildingDetails, eq(assets.id, assetBuildingDetails.assetId))
    .where(condition)
    .orderBy(desc(assets.createdAt));

  return rows;
}

export async function listVehicleReportRows(scope?: AccessScope) {
  const condition = assetReportCondition(scope, "kendaraan");
  const rows = await db
    .select({
      ...baseSelect,
      vehicleCategory: assetVehicleDetails.vehicleCategory,
      brand: assetVehicleDetails.brand,
      model: assetVehicleDetails.model,
      manufactureYear: assetVehicleDetails.manufactureYear,
      plateNumber: assetVehicleDetails.plateNumber,
      documentCompletenessStatus: assetVehicleDetails.documentCompletenessStatus,
      stnkNumber: assetVehicleDetails.stnkNumber,
      bpkbNumber: assetVehicleDetails.bpkbNumber,
      stnkExpiredAt: assetVehicleDetails.stnkExpiredAt,
      taxDueAt: assetVehicleDetails.taxDueAt,
      taxStatus: assetVehicleDetails.taxStatus,
      registeredOwnerName: assetVehicleDetails.registeredOwnerName,
      insuranceValidUntil: assetVehicleDetails.insuranceValidUntil,
      domicileLocation: assetVehicleDetails.domicileLocation,
      condition: assetVehicleDetails.condition,
      operationalStatus: assetVehicleDetails.operationalStatus,
    })
    .from(assets)
    .leftJoin(units, eq(assets.unitId, units.id))
    .leftJoin(badanHukums, eq(assets.badanHukumId, badanHukums.id))
    .leftJoin(assetVehicleDetails, eq(assets.id, assetVehicleDetails.assetId))
    .where(condition)
    .orderBy(desc(assets.createdAt));

  return rows;
}

export async function listItemReportRows(scope?: AccessScope) {
  const condition = assetReportCondition(scope, "benda");
  const rows = await db
    .select({
      ...baseSelect,
      itemCategory: assetItemDetails.itemCategory,
      description: assetItemDetails.description,
      brand: assetItemDetails.brand,
      model: assetItemDetails.model,
      serialNumber: assetItemDetails.serialNumber,
      quantity: assetItemDetails.quantity,
      unit: assetItemDetails.unit,
      storageLocation: assetItemDetails.storageLocation,
      responsiblePerson: assetItemDetails.responsiblePerson,
      evidenceDocumentNumber: assetItemDetails.evidenceDocumentNumber,
      evidenceDocumentDate: assetItemDetails.evidenceDocumentDate,
      evidenceIssuer: assetItemDetails.evidenceIssuer,
      evidenceRegisteredName: assetItemDetails.evidenceRegisteredName,
      documentStatus: assetItemDetails.documentStatus,
      condition: assetItemDetails.condition,
    })
    .from(assets)
    .leftJoin(units, eq(assets.unitId, units.id))
    .leftJoin(badanHukums, eq(assets.badanHukumId, badanHukums.id))
    .leftJoin(assetItemDetails, eq(assets.id, assetItemDetails.assetId))
    .where(condition)
    .orderBy(desc(assets.createdAt));

  return rows;
}
