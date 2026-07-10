"use server";

import { redirect } from "next/navigation";

import { writeAuditLog } from "@/lib/audit";
import { handleActionFailure } from "@/lib/action-errors";
import { db } from "@/db";
import { getActiveAssetCategoryByCode } from "@/lib/asset-categories";
import {
  createAssetWithInitialHistory,
  deleteAsset,
  getActiveDepreciationGroup,
  getActiveDepreciationRule,
  getAsset,
  getAssetAuditSnapshot,
  quickUpdateAssetOperationalState,
  quickMoveAssetPlacement,
  replaceAssetBuildingLands,
  replaceAssetOrganizations,
  saveAssetDepreciationSchedule,
  updateAssetWithHistory,
  upsertAssetAttachments,
  upsertBuildingDetail,
  upsertItemDetail,
  upsertLandDetail,
  upsertTaxAssetCoretax,
  upsertVehicleDetail,
} from "@/lib/assets";
import { getAssetLocation } from "@/lib/master-data";
import { assertLocationKindMatchesAssetType } from "@/lib/assets/location-kind";
import { requiresPlacementLocation, usesMasterDataPlacementLocation } from "@/lib/assets/placement";
import { calculateDepreciationFromMaster, generateDepreciationSchedule} from "@/lib/depreciation";
import { getTaxDepreciationGroupByCode, toDepreciationGroupInput, toDepreciationRuleInput } from "@/lib/tax-master";
import { saveAssetUpload } from "@/lib/file-upload";
import { assertActiveAssetStatus } from "@/lib/asset-statuses";
import { buildStatusHistoryNote, hasStatusHistoryValueChanged } from "@/lib/assets/histories";
import { hasHistoryValueChanged, hasPlacementHistoryValueChanged } from "@/lib/assets/histories.helpers";
import { revalidateAssetPaths } from "@/lib/assets/revalidate-paths";
import { assertManuallyEditableAssetStatus, assertOnLoanStatusNote, assertLoanedToInvariant, isManuallyEditableAssetStatus, normalizeLegacyAssetStatus, resolveLoanedTo } from "@/lib/assets/status";
import { getDateValue, getFormString, getFormStringList, getInteger, getNumber, getOptionalString } from "@/lib/form-utils";
import { assertAssetInScope, assertAssetPayloadInScope, assertUnitInScope } from "@/lib/scope";
import { requireAuthenticatedScope } from "@/lib/server-guards";
import { formDataToRecord, parseZod } from "@/lib/validators";
import { assetCommonSchema } from "@/lib/validators/asset";
import { assetQuickPlacementSchema } from "@/lib/validators/asset-quick-placement";
import { assetQuickUpdateSchema } from "@/lib/validators/asset-quick-update";
import type { AssetDetailKind } from "@/lib/assets";

type BoundaryPatokCoordinate = {
  label: string;
  lat: number;
  lng: number;
};

type DetailRecord = Record<string, string | number | BoundaryPatokCoordinate[] | null>;

type DetailPayloadMap = {
  tanah: DetailRecord;
  bangunan: DetailRecord;
  kendaraan: DetailRecord;
  benda: DetailRecord;
};

function buildCommonPayload(formData: FormData) {
  const parsed = parseZod(assetCommonSchema, formDataToRecord(formData));
  const ownership =
    parsed.ownershipLevel === "keuskupan"
      ? { ownershipLevel: parsed.ownershipLevel, unitId: parsed.unitId ?? null, badanHukumId: null }
      : { ownershipLevel: parsed.ownershipLevel, unitId: null, badanHukumId: parsed.badanHukumId ?? null };

  const status = normalizeLegacyAssetStatus(parsed.status ?? "active");
  const loanedTo = resolveLoanedTo({
    nextStatus: status,
    previousStatus: getOptionalString(formData, "currentStatus"),
    statusNote: getOptionalString(formData, "statusNote"),
  });
  assertLoanedToInvariant(status, loanedTo);

  return {
    code: parsed.code,
    name: parsed.name,
    assetType: parsed.assetType,
    ...ownership,
    locationId: parsed.locationId ?? null,
    acquisitionDate: getDateValue(formData, "acquisitionDate"),
    acquisitionValue: parsed.acquisitionValue ?? null,
    legalStatus: parsed.legalStatus ?? "milik sendiri",
    ownerName: parsed.ownerName ?? null,
    condition:
      parsed.assetType === "kendaraan"
        ? getOptionalString(formData, "vehicleCondition") ?? parsed.condition ?? null
        : parsed.condition ?? null,
    status,
    notes: parsed.notes ?? null,
    loanedTo,
  };
}

async function assertLocationPayloadIsValid(
  scope: Awaited<ReturnType<typeof requireAuthenticatedScope>>["scope"],
  payload: ReturnType<typeof buildCommonPayload>
) {
  if (payload.badanHukumId && payload.locationId) {
    throw new Error("Lokasi hanya tersedia untuk aset unit");
  }

  if (
    payload.ownershipLevel === "keuskupan" &&
    requiresPlacementLocation(payload.assetType, payload.status) &&
    !payload.locationId
  ) {
    throw new Error(
      payload.assetType === "kendaraan"
        ? "Garasi / area parkir wajib dipilih untuk kendaraan aktif"
        : "Ruang penempatan wajib dipilih untuk benda aktif"
    );
  }

  if (!payload.locationId) {
    return;
  }

  const location = await getAssetLocation(payload.locationId);

  if (!location || !location.isActive) {
    throw new Error("Lokasi tidak valid atau sudah nonaktif");
  }

  assertUnitInScope(scope, location.unitId);

  if (payload.unitId && location.unitId !== payload.unitId) {
    throw new Error("Lokasi harus berada pada unit pengelola aset");
  }

  if (usesMasterDataPlacementLocation(payload.assetType)) {
    assertLocationKindMatchesAssetType(location.locationKind, payload.assetType);
  }
}

function buildOrganizationPayload(formData: FormData) {
  return [
    {
      relationType: "financed_by",
      unitId: getOptionalString(formData, "financedByUnitId"),
      badanHukumId: getOptionalString(formData, "financedByBadanHukumId"),
      userId: getOptionalString(formData, "financedByUserId"),
      notes: getOptionalString(formData, "financedByNotes"),
    },
    {
      relationType: "used_by",
      unitId: getOptionalString(formData, "usedByUnitId"),
      badanHukumId: getOptionalString(formData, "usedByBadanHukumId"),
      userId: getOptionalString(formData, "usedByUserId"),
      notes: getOptionalString(formData, "usedByNotes"),
    },
    {
      relationType: "owned_by",
      unitId: getOptionalString(formData, "ownedByUnitId"),
      badanHukumId: getOptionalString(formData, "ownedByBadanHukumId"),
      userId: getOptionalString(formData, "ownedByUserId"),
      notes: getOptionalString(formData, "ownedByNotes"),
    },
    {
      relationType: "inputted_by",
      unitId: getOptionalString(formData, "inputtedByUnitId"),
      badanHukumId: getOptionalString(formData, "inputtedByBadanHukumId"),
      userId: getOptionalString(formData, "inputtedByUserId"),
      notes: getOptionalString(formData, "inputtedByNotes"),
    },
  ];
}

async function buildAttachmentPayload(formData: FormData, assetId: string) {
  const attachments: Array<{ attachmentType: string; filePath: string; notes: string | null }> = [];

  for (const id of getFormStringList(formData, "keepAttachmentIds")) {
    attachments.push({
      attachmentType: getFormString(formData, `attachmentType_${id}`),
      filePath: getFormString(formData, `attachmentPath_${id}`),
      notes: getOptionalString(formData, `attachmentNotes_${id}`),
    });
  }

  const types = formData.getAll("newAttachmentType");
  const files = formData.getAll("newAttachmentFile");
  const notes = formData.getAll("newAttachmentNotes");

  for (let index = 0; index < types.length; index += 1) {
    const rawType = types[index];
    const rawNote = notes[index];
    const attachmentType = typeof rawType === "string" ? rawType.trim() : "";
    const file = files[index];
    const note = typeof rawNote === "string" ? rawNote.trim() : "";

    if (!attachmentType) {
      continue;
    }

    if (!(file instanceof File) || file.size === 0) {
      continue;
    }

    const filePath = await saveAssetUpload(file, assetId);
    attachments.push({
      attachmentType,
      filePath,
      notes: note || null,
    });
  }

  return attachments;
}

function buildCoretaxPayload(formData: FormData) {
  return {
    coretaxAssetType: getOptionalString(formData, "coretaxAssetType"),
    coretaxAssetCode: getOptionalString(formData, "coretaxAssetCode"),
    assetClassType: getOptionalString(formData, "coretaxAssetClassType"),
    ownershipSource: getOptionalString(formData, "coretaxOwnershipSource"),
    sptOwnerName: getOptionalString(formData, "coretaxSptOwnerName"),
    taxNotes: getOptionalString(formData, "coretaxTaxNotes"),
    auditNotes: getOptionalString(formData, "coretaxAuditNotes"),
  };
}

function parseBoundaryPatokCoordinates(formData: FormData) {
  const raw = getOptionalString(formData, "boundaryPatokCoordinates");
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      throw new Error("Format koordinat patok tidak valid.");
    }

    const cleaned = parsed
      .map((item, index) => {
        const record = item && typeof item === "object" ? (item as Record<string, unknown>) : {};

        return {
          label: String(record.label || `Patok ${index + 1}`).trim(),
          lat: Number(record.lat),
          lng: Number(record.lng),
        };
      })
      .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));

    return cleaned.length > 0 ? cleaned : null;
  } catch {
    throw new Error("Format koordinat patok tidak valid.");
  }
}

function getOptionalNumericString(formData: FormData, key: string) {
  const raw = getOptionalString(formData, key);
  if (!raw) return null;

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? raw : null;
}

function getNonNegativeNumericString(formData: FormData, key: string) {
  const raw = getOptionalNumericString(formData, key);
  if (!raw) return null;

  return Number(raw) >= 0 ? raw : null;
}

function getPositiveInteger(formData: FormData, key: string) {
  const value = getInteger(formData, key);
  if (value === null) return null;

  return value > 0 ? value : null;
}

function buildDetailPayload(formData: FormData): DetailPayloadMap {
  return {
    tanah: {
      address: getOptionalString(formData, "landAddress"),
      areaSquareMeters: getOptionalString(formData, "landAreaSquareMeters"),
      certificateType: getOptionalString(formData, "landCertificateType"),
      certificateNumber: getOptionalString(formData, "landCertificateNumber"),
      certificateHolderName: getOptionalString(formData, "landCertificateHolderName"),
      certificateIssuedAt: getDateValue(formData, "landCertificateIssuedAt"),
      certificateExpiredAt: getDateValue(formData, "landCertificateExpiredAt"),
      issuingInstitution: getOptionalString(formData, "landIssuingInstitution"),
      legalOwnerType: getOptionalString(formData, "landLegalOwnerType"),
      actualOwnerName: getOptionalString(formData, "landActualOwnerName"),
      lastNjopValue: getOptionalString(formData, "landLastNjopValue"),
      appraisalValue: getOptionalString(formData, "landAppraisalValue"),
      appraisalDate: getDateValue(formData, "landAppraisalDate"),
      nopPbb: getOptionalString(formData, "landNopPbb"),
      boundaryNorth: getOptionalString(formData, "landBoundaryNorth"),
      boundarySouth: getOptionalString(formData, "landBoundarySouth"),
      boundaryEast: getOptionalString(formData, "landBoundaryEast"),
      boundaryWest: getOptionalString(formData, "landBoundaryWest"),
      boundaryPatokCoordinates: parseBoundaryPatokCoordinates(formData),
      latitude: getOptionalNumericString(formData, "landLatitude"),
      longitude: getOptionalNumericString(formData, "landLongitude"),
      landUse: getOptionalString(formData, "landLandUse"),
      acquisitionMethod: getOptionalString(formData, "landAcquisitionMethod"),
      disputeStatus: getOptionalString(formData, "landDisputeStatus"),
      notes: getOptionalString(formData, "landNotes"),
    },
    bangunan: {
      address: getOptionalString(formData, "buildingAddress"),
      buildingCategory: getOptionalString(formData, "buildingCategory") ?? "permanent",
      buildingType: getOptionalString(formData, "buildingType"),
      mainLandAssetId: getOptionalString(formData, "buildingMainLandAssetId"),
      acquisitionMethod: getOptionalString(formData, "buildingAcquisitionMethod"),
      disputeStatus: getOptionalString(formData, "buildingDisputeStatus"),
      buildingAreaSquareMeters: getNonNegativeNumericString(formData, "buildingAreaSquareMeters"),
      floorCount: getPositiveInteger(formData, "buildingFloorCount"),
      constructionYear: getInteger(formData, "buildingConstructionYear"),
      lastRenovationYear: getInteger(formData, "buildingLastRenovationYear"),
      structureType: getOptionalString(formData, "buildingStructureType"),
      footprintAreaSquareMeters: getNonNegativeNumericString(formData, "buildingFootprintAreaSquareMeters"),
      permitType: getOptionalString(formData, "buildingPermitType"),
      permitNumber: getOptionalString(formData, "buildingPermitNumber"),
      permitIssuedAt: getDateValue(formData, "buildingPermitIssuedAt"),
      permitExpiredAt: getDateValue(formData, "buildingPermitExpiredAt"),
      permitIssuer: getOptionalString(formData, "buildingPermitIssuer"),
      slfNumber: getOptionalString(formData, "buildingSlfNumber"),
      slfIssuedAt: getDateValue(formData, "buildingSlfIssuedAt"),
      slfExpiredAt: getDateValue(formData, "buildingSlfExpiredAt"),
      leaseAgreementDocument: getOptionalString(formData, "buildingLeaseAgreementDocument"),
      rentAmount: getNonNegativeNumericString(formData, "buildingRentAmount"),
      njopValue: getNonNegativeNumericString(formData, "buildingNjopValue"),
      appraisalValue: getNonNegativeNumericString(formData, "buildingAppraisalValue"),
      electricityCapacity: getOptionalString(formData, "buildingElectricityCapacity"),
      waterSource: getOptionalString(formData, "buildingWaterSource"),
      parkingCapacity: getOptionalString(formData, "buildingParkingCapacity"),
      facilities: getOptionalString(formData, "buildingFacilities"),
      maintenanceResponsibleName: getOptionalString(formData, "buildingMaintenanceResponsibleName"),
      maintenanceAnnualCost: getNonNegativeNumericString(formData, "buildingMaintenanceAnnualCost"),
      physicalCondition: getOptionalString(formData, "buildingPhysicalCondition"),
      latitude: getOptionalNumericString(formData, "buildingLatitude"),
      longitude: getOptionalNumericString(formData, "buildingLongitude"),
      notes: getOptionalString(formData, "buildingNotes"),
    },
    kendaraan: {
      vehicleCategory: getOptionalString(formData, "vehicleCategory"),
      brand: getOptionalString(formData, "vehicleBrand"),
      model: getOptionalString(formData, "vehicleModel"),
      manufactureYear: getInteger(formData, "vehicleManufactureYear"),
      color: getOptionalString(formData, "vehicleColor"),
      plateNumber: getOptionalString(formData, "vehiclePlateNumber"),
      chassisNumber: getOptionalString(formData, "vehicleChassisNumber"),
      engineNumber: getOptionalString(formData, "vehicleEngineNumber"),
      stnkNumber: getOptionalString(formData, "vehicleStnkNumber"),
      bpkbNumber: getOptionalString(formData, "vehicleBpkbNumber"),
      documentCompletenessStatus: getOptionalString(formData, "vehicleDocumentCompletenessStatus"),
      stnkIssuedAt: getDateValue(formData, "vehicleStnkIssuedAt"),
      stnkExpiredAt: getDateValue(formData, "vehicleStnkExpiredAt"),
      lastTaxPaidAt: getDateValue(formData, "vehicleLastTaxPaidAt"),
      taxDueAt: getDateValue(formData, "vehicleTaxDueAt"),
      taxStatus: getOptionalString(formData, "vehicleTaxStatus"),
      issuingInstitution: getOptionalString(formData, "vehicleIssuingInstitution"),
      registeredOwnerName: getOptionalString(formData, "vehicleRegisteredOwnerName"),
      insurancePolicyNumber: getOptionalString(formData, "vehicleInsurancePolicyNumber"),
      insuranceValidUntil: getDateValue(formData, "vehicleInsuranceValidUntil"),
      domicileLocation: getOptionalString(formData, "vehicleDomicileLocation"),
      condition: getOptionalString(formData, "vehicleCondition"),
      operationalStatus: getOptionalString(formData, "vehicleOperationalStatus"),
      notes: getOptionalString(formData, "vehicleNotes"),
    },
    benda: {
      itemCategory: getOptionalString(formData, "itemCategory"),
      description: getOptionalString(formData, "itemDescription"),
      brand: getOptionalString(formData, "itemBrand"),
      model: getOptionalString(formData, "itemModel"),
      serialNumber: getOptionalString(formData, "itemSerialNumber"),
      quantity: getNumber(formData, "itemQuantity"),
      unit: getOptionalString(formData, "itemUnit"),
      storageLocation: getOptionalString(formData, "itemStorageLocation"),
      responsiblePerson: getOptionalString(formData, "itemResponsiblePerson"),
      evidenceDocumentNumber: getOptionalString(formData, "itemEvidenceDocumentNumber"),
      evidenceDocumentDate: getDateValue(formData, "itemEvidenceDocumentDate"),
      evidenceIssuer: getOptionalString(formData, "itemEvidenceIssuer"),
      evidenceRegisteredName: getOptionalString(formData, "itemEvidenceRegisteredName"),
      documentStatus: getOptionalString(formData, "itemDocumentStatus"),
      condition: getOptionalString(formData, "condition"),
      notes: getOptionalString(formData, "itemNotes"),
    },
  };
}

async function persistAssetDetails(
  assetId: string,
  formData: FormData,
  assetType: AssetDetailKind,
  executor: any = db,
  options?: {
    attachments?: Array<{ attachmentType: string; filePath: string; notes: string | null }>;
    skipAttachments?: boolean;
  }
) {
  const detailPayload = buildDetailPayload(formData);

  if (assetType === "tanah") {
    await upsertLandDetail(assetId, detailPayload.tanah, executor);
  }
  if (assetType === "bangunan") {
    await upsertBuildingDetail(assetId, detailPayload.bangunan, executor);
    const landAssetIds = getFormStringList(formData, "buildingLandAssetIds");
    const mainLandId = detailPayload.bangunan.mainLandAssetId;

    if (typeof mainLandId === "string" && mainLandId && !landAssetIds.includes(mainLandId)) {
      landAssetIds.push(mainLandId);
    }

    await replaceAssetBuildingLands(
      assetId,
      landAssetIds,
      typeof mainLandId === "string" ? mainLandId : null,
      executor
    );
  }
  if (assetType === "kendaraan") {
    await upsertVehicleDetail(assetId, detailPayload.kendaraan, executor);
  }
  if (assetType === "benda") {
    await upsertItemDetail(assetId, detailPayload.benda, executor);
  }

  await replaceAssetOrganizations(assetId, buildOrganizationPayload(formData), executor);

  if (options?.attachments) {
    await upsertAssetAttachments(assetId, options.attachments, executor);
  } else if (!options?.skipAttachments) {
    await upsertAssetAttachments(assetId, await buildAttachmentPayload(formData, assetId), executor);
  }

  await upsertTaxAssetCoretax(assetId, buildCoretaxPayload(formData), executor);

  const acquisitionValue = getNumber(formData, "acquisitionValue") ?? 0;
  if (acquisitionValue > 0) {
    const buildingCategory = assetType === "bangunan" && typeof detailPayload.bangunan.buildingCategory === "string"
      ? await getActiveAssetCategoryByCode("bangunan", detailPayload.bangunan.buildingCategory)
      : null;
    const mappedBuildingGroup = buildingCategory
      ? await getTaxDepreciationGroupByCode(buildingCategory.depreciationGroupCode)
      : null;
    const vehicleCategory = assetType === "kendaraan" && typeof detailPayload.kendaraan.vehicleCategory === "string"
      ? await getActiveAssetCategoryByCode("kendaraan", detailPayload.kendaraan.vehicleCategory)
      : null;
    const mappedVehicleGroup = vehicleCategory
      ? await getTaxDepreciationGroupByCode(vehicleCategory.depreciationGroupCode)
      : null;
    const itemCategory = assetType === "benda" && typeof detailPayload.benda.itemCategory === "string"
      ? await getActiveAssetCategoryByCode("benda", detailPayload.benda.itemCategory)
      : null;
    const mappedItemGroup = itemCategory
      ? await getTaxDepreciationGroupByCode(itemCategory.depreciationGroupCode)
      : null;
    const depreciationGroup = mappedBuildingGroup?.isActive
      ? mappedBuildingGroup
      : mappedVehicleGroup?.isActive
        ? mappedVehicleGroup
      : mappedItemGroup?.isActive
        ? mappedItemGroup
        : await getActiveDepreciationGroup(assetType);

    if (depreciationGroup) {
      const taxYear = new Date(getDateValue(formData, "acquisitionDate") ?? new Date().toISOString().slice(0, 10)).getFullYear();
      const rule = await getActiveDepreciationRule(depreciationGroup.id, taxYear);
      const schedule = generateDepreciationSchedule(
        acquisitionValue,
        toDepreciationGroupInput(depreciationGroup),
        rule ? toDepreciationRuleInput(rule) : null,
        taxYear
      );

      await saveAssetDepreciationSchedule(assetId, schedule, executor);
    }
  }
}

export async function createAssetAction(formData: FormData) {
  const submittedAssetType = String(formData.get("assetType") ?? "tanah");
  const failurePath = `/assets/${submittedAssetType}/new`;

  try {
    const { user, scope } = await requireAuthenticatedScope("asset.create");
    const payload = buildCommonPayload(formData);

    await assertActiveAssetStatus(payload.status);
    assertManuallyEditableAssetStatus(payload.status);
    assertOnLoanStatusNote({
      nextStatus: payload.status,
      currentStatus: "active",
      statusNote: getOptionalString(formData, "statusNote"),
    });
    assertAssetPayloadInScope(scope, payload);
    await assertLocationPayloadIsValid(scope, payload);

    const asset = await db.transaction(async (tx) => {
      const created = await createAssetWithInitialHistory(tx, {
        payload,
        actorUserId: user.id,
        statusNotes: buildStatusHistoryNote(payload.status, getOptionalString(formData, "statusNote")),
        conditionNotes: getOptionalString(formData, "conditionNote"),
      });
      await persistAssetDetails(created.id, formData, created.assetType as AssetDetailKind, tx, {
        skipAttachments: true,
      });
      return created;
    });
    const attachments = await buildAttachmentPayload(formData, asset.id);
    if (attachments.length > 0) {
      await upsertAssetAttachments(asset.id, attachments);
    }
    const afterSnapshot = await getAssetAuditSnapshot(asset.id);

    await writeAuditLog({
      actorUserId: user.id,
      action: "create",
      entity: "asset",
      entityId: asset.id,
      afterData: afterSnapshot,
    });

    revalidateAssetPaths(asset.id, asset.assetType);
    redirect(`/assets/${asset.id}`);
  } catch (error) {
    await handleActionFailure(error, failurePath);
  }
}

export async function updateAssetAction(formData: FormData) {
  try {
    const { user, scope } = await requireAuthenticatedScope("asset.update");

    const id = getFormString(formData, "id");
    const beforeSnapshot = await getAssetAuditSnapshot(id);

    if (!beforeSnapshot.asset) {
      throw new Error("Asset tidak ditemukan");
    }

    assertAssetInScope(scope, beforeSnapshot.asset);

    const basePayload = buildCommonPayload(formData);
    await assertActiveAssetStatus(basePayload.status);

    const payload = {
      ...basePayload,
      status: isManuallyEditableAssetStatus(beforeSnapshot.asset.status)
        ? basePayload.status
        : beforeSnapshot.asset.status,
      loanedTo: resolveLoanedTo({
        nextStatus: isManuallyEditableAssetStatus(beforeSnapshot.asset.status) ? basePayload.status : beforeSnapshot.asset.status,
        previousStatus: beforeSnapshot.asset.status,
        statusNote: getOptionalString(formData, "statusNote"),
        currentLoanedTo: beforeSnapshot.asset.loanedTo,
      }),
    };
    assertLoanedToInvariant(payload.status, payload.loanedTo);

    if (isManuallyEditableAssetStatus(beforeSnapshot.asset.status)) {
      assertManuallyEditableAssetStatus(payload.status);
    }

    assertOnLoanStatusNote({
      nextStatus: payload.status,
      currentStatus: beforeSnapshot.asset.status,
      statusNote: getOptionalString(formData, "statusNote"),
    });

    assertAssetPayloadInScope(scope, payload);
    await assertLocationPayloadIsValid(scope, payload);

    const statusNote = getOptionalString(formData, "statusNote");
    const conditionNote = getOptionalString(formData, "conditionNote");

    const attachments = await buildAttachmentPayload(formData, id);

    const asset = await db.transaction(async (tx) => {
      const updated = await updateAssetWithHistory(tx, {
        assetId: id,
        payload,
        actorUserId: user.id,
        before: {
          status: beforeSnapshot.asset.status,
          condition: beforeSnapshot.asset.condition,
          loanedTo: beforeSnapshot.asset.loanedTo,
          unitId: beforeSnapshot.asset.unitId,
          locationId: beforeSnapshot.asset.locationId,
        },
        statusNotes: hasStatusHistoryValueChanged(beforeSnapshot.asset.status, payload.status)
          ? buildStatusHistoryNote(payload.status, statusNote)
          : null,
        conditionNotes: hasHistoryValueChanged(beforeSnapshot.asset.condition, payload.condition) ? conditionNote : null,
        loanNotes:
          hasHistoryValueChanged(beforeSnapshot.asset.loanedTo, payload.loanedTo) &&
          !hasStatusHistoryValueChanged(beforeSnapshot.asset.status, payload.status)
            ? statusNote?.trim() || null
            : null,
        placementNotes: hasPlacementHistoryValueChanged(
          { unitId: beforeSnapshot.asset.unitId, locationId: beforeSnapshot.asset.locationId },
          { unitId: payload.unitId, locationId: payload.locationId }
        )
          ? "Perubahan unit pengelola dan/atau lokasi fisik aset."
          : null,
      });
      await persistAssetDetails(id, formData, updated.assetType as AssetDetailKind, tx, { attachments });
      return updated;
    });
    const afterSnapshot = await getAssetAuditSnapshot(id);

    await writeAuditLog({
      actorUserId: user.id,
      action: "update",
      entity: "asset",
      entityId: id,
      beforeData: beforeSnapshot,
      afterData: afterSnapshot,
    });

    revalidateAssetPaths(id, asset.assetType);
    redirect(`/assets/${id}`);
  } catch (error) {
    await handleActionFailure(error, "/assets");
  }
}

export async function quickMoveAssetPlacementAction(formData: FormData) {
  const returnPath = String(formData.get("returnPath") ?? "/assets");

  try {
    const { user, scope } = await requireAuthenticatedScope("asset.update");
    const parsed = parseZod(assetQuickPlacementSchema, formDataToRecord(formData));
    const asset = await getAsset(parsed.assetId);

    if (!asset) {
      throw new Error("Asset tidak ditemukan");
    }

    assertAssetInScope(scope, asset);

    const updated = await quickMoveAssetPlacement({
      assetId: parsed.assetId,
      locationId: parsed.locationId,
      placementNote: parsed.placementNote,
      actorUserId: user.id,
    });

    await writeAuditLog({
      actorUserId: user.id,
      action: "QUICK_MOVE_PLACEMENT",
      entity: "asset",
      entityId: parsed.assetId,
      afterData: updated,
    });

    revalidateAssetPaths(parsed.assetId, updated?.assetType ?? asset.assetType);
    redirect(returnPath);
  } catch (error) {
    await handleActionFailure(error, returnPath || "/assets");
  }
}

export async function quickUpdateAssetStateAction(formData: FormData) {
  const assetId = getFormString(formData, "assetId");
  const returnPath = String(formData.get("returnPath") ?? "/assets");

  try {
    const { user, scope } = await requireAuthenticatedScope("asset.update");
    const parsed = parseZod(assetQuickUpdateSchema, formDataToRecord(formData));
    const asset = await getAsset(parsed.assetId);

    if (!asset) {
      throw new Error("Asset tidak ditemukan");
    }

    assertAssetInScope(scope, asset);

    const updated = await quickUpdateAssetOperationalState({
      assetId: parsed.assetId,
      assetType: parsed.assetType,
      status: normalizeLegacyAssetStatus(parsed.status ?? undefined),
      condition: parsed.condition,
      statusNote: parsed.statusNote,
      conditionNote: parsed.conditionNote,
      actorUserId: user.id,
    });

    await writeAuditLog({
      actorUserId: user.id,
      action: "QUICK_UPDATE_OPERATIONAL_STATE",
      entity: "asset",
      entityId: parsed.assetId,
      afterData: updated,
    });

    revalidateAssetPaths(parsed.assetId, updated?.assetType ?? asset.assetType);
    redirect(returnPath);
  } catch (error) {
    await handleActionFailure(error, returnPath || "/assets");
  }
}

export async function deleteAssetAction(formData: FormData) {
  try {
    const { user, scope } = await requireAuthenticatedScope("asset.delete");

    const id = getFormString(formData, "id");
    const beforeSnapshot = await getAssetAuditSnapshot(id);

    if (!beforeSnapshot.asset) {
      throw new Error("Asset tidak ditemukan");
    }

    assertAssetInScope(scope, beforeSnapshot.asset);
    await deleteAsset(id);

    await writeAuditLog({
      actorUserId: user.id,
      action: "delete",
      entity: "asset",
      entityId: id,
      beforeData: beforeSnapshot,
    });

    revalidateAssetPaths(id, beforeSnapshot.asset.assetType ?? undefined);
    redirect("/assets");
  } catch (error) {
    await handleActionFailure(error, "/assets");
  }
}
