"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { writeAuditLog } from "@/lib/audit";
import { handleActionFailure } from "@/lib/action-errors";
import {
  appendAssetDepreciation,
  createAsset,
  deleteAsset,
  getActiveDepreciationGroup,
  getActiveDepreciationRule,
  getAsset,
  getAssetAuditSnapshot,
  replaceAssetBuildingLands,
  replaceAssetOrganizations,
  updateAsset,
  upsertAssetAttachments,
  upsertBuildingDetail,
  upsertItemDetail,
  upsertLandDetail,
  upsertTaxAssetCoretax,
  upsertVehicleDetail,
} from "@/lib/assets";
import { calculateDepreciationFromMaster } from "@/lib/depreciation";
import { toDepreciationGroupInput, toDepreciationRuleInput } from "@/lib/tax-master";
import { saveAssetUpload } from "@/lib/file-upload";
import { getDateValue, getFormString, getFormStringList, getInteger, getNumber, getOptionalString } from "@/lib/form-utils";
import { assertAssetInScope, assertAssetPayloadInScope } from "@/lib/scope";
import { requireAuthenticatedScope } from "@/lib/server-guards";
import { formDataToRecord, parseZod } from "@/lib/validators";
import { assetCommonSchema } from "@/lib/validators/asset";
import type { AssetDetailKind } from "@/lib/assets";

type DetailRecord = Record<string, string | number | null>;

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

  return {
    code: parsed.code,
    name: parsed.name,
    assetType: parsed.assetType,
    ...ownership,
    acquisitionDate: getDateValue(formData, "acquisitionDate"),
    acquisitionValue: parsed.acquisitionValue ?? null,
    legalStatus: parsed.legalStatus ?? "milik sendiri",
    ownerName: parsed.ownerName ?? null,
    condition: parsed.condition ?? null,
    status: parsed.status ?? "active",
    notes: parsed.notes ?? null,
  };
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
      latitude: getOptionalString(formData, "landLatitude"),
      longitude: getOptionalString(formData, "landLongitude"),
      landUse: getOptionalString(formData, "landLandUse"),
      acquisitionMethod: getOptionalString(formData, "landAcquisitionMethod"),
      disputeStatus: getOptionalString(formData, "landDisputeStatus"),
      notes: getOptionalString(formData, "landNotes"),
    },
    bangunan: {
      address: getOptionalString(formData, "buildingAddress"),
      buildingType: getOptionalString(formData, "buildingType"),
      mainLandAssetId: getOptionalString(formData, "buildingMainLandAssetId"),
      acquisitionMethod: getOptionalString(formData, "buildingAcquisitionMethod"),
      disputeStatus: getOptionalString(formData, "buildingDisputeStatus"),
      buildingAreaSquareMeters: getOptionalString(formData, "buildingAreaSquareMeters"),
      floorCount: getInteger(formData, "buildingFloorCount"),
      constructionYear: getInteger(formData, "buildingConstructionYear"),
      lastRenovationYear: getInteger(formData, "buildingLastRenovationYear"),
      structureType: getOptionalString(formData, "buildingStructureType"),
      footprintAreaSquareMeters: getOptionalString(formData, "buildingFootprintAreaSquareMeters"),
      permitType: getOptionalString(formData, "buildingPermitType"),
      permitNumber: getOptionalString(formData, "buildingPermitNumber"),
      permitIssuedAt: getDateValue(formData, "buildingPermitIssuedAt"),
      permitExpiredAt: getDateValue(formData, "buildingPermitExpiredAt"),
      permitIssuer: getOptionalString(formData, "buildingPermitIssuer"),
      slfNumber: getOptionalString(formData, "buildingSlfNumber"),
      slfIssuedAt: getDateValue(formData, "buildingSlfIssuedAt"),
      slfExpiredAt: getDateValue(formData, "buildingSlfExpiredAt"),
      leaseAgreementDocument: getOptionalString(formData, "buildingLeaseAgreementDocument"),
      electricityCapacity: getOptionalString(formData, "buildingElectricityCapacity"),
      waterSource: getOptionalString(formData, "buildingWaterSource"),
      parkingCapacity: getOptionalString(formData, "buildingParkingCapacity"),
      facilities: getOptionalString(formData, "buildingFacilities"),
      latitude: getOptionalString(formData, "buildingLatitude"),
      longitude: getOptionalString(formData, "buildingLongitude"),
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
      condition: getOptionalString(formData, "itemCondition"),
      notes: getOptionalString(formData, "itemNotes"),
    },
  };
}

async function persistAssetDetails(assetId: string, formData: FormData, assetType: AssetDetailKind) {
  const detailPayload = buildDetailPayload(formData);

  if (assetType === "tanah") {
    await upsertLandDetail(assetId, detailPayload.tanah);
  }
  if (assetType === "bangunan") {
    await upsertBuildingDetail(assetId, detailPayload.bangunan);
    const landAssetIds = getFormStringList(formData, "buildingLandAssetIds");
    const mainLandId = detailPayload.bangunan.mainLandAssetId;

    if (typeof mainLandId === "string" && mainLandId && !landAssetIds.includes(mainLandId)) {
      landAssetIds.push(mainLandId);
    }

    await replaceAssetBuildingLands(assetId, landAssetIds);
  }
  if (assetType === "kendaraan") {
    await upsertVehicleDetail(assetId, detailPayload.kendaraan);
  }
  if (assetType === "benda") {
    await upsertItemDetail(assetId, detailPayload.benda);
  }

  await replaceAssetOrganizations(assetId, buildOrganizationPayload(formData));
  await upsertAssetAttachments(assetId, await buildAttachmentPayload(formData, assetId));
  await upsertTaxAssetCoretax(assetId, buildCoretaxPayload(formData));

  const acquisitionValue = getNumber(formData, "acquisitionValue") ?? 0;
  if (acquisitionValue > 0) {
    const depreciationGroupId = getOptionalString(formData, "depreciationGroupId");
    const depreciationGroup = await getActiveDepreciationGroup(assetType, depreciationGroupId);

    if (depreciationGroup) {
      const taxYear = new Date(getDateValue(formData, "acquisitionDate") ?? new Date().toISOString().slice(0, 10)).getFullYear();
      const rule = await getActiveDepreciationRule(depreciationGroup.id, taxYear);
      const preview = calculateDepreciationFromMaster(
        acquisitionValue,
        toDepreciationGroupInput(depreciationGroup),
        rule ? toDepreciationRuleInput(rule) : null
      );

      await appendAssetDepreciation(assetId, {
        depreciationGroupId: depreciationGroup.id,
        ruleId: preview.ruleId,
        acquisitionValue: preview.acquisitionValue,
        residualValue: preview.residualValue,
        depreciableBase: preview.depreciableBase,
        annualDepreciation: preview.annualDepreciation,
        accumulatedDepreciation: preview.accumulatedDepreciation,
        bookValue: preview.bookValue,
        startDate: getDateValue(formData, "acquisitionDate") ?? new Date().toISOString().slice(0, 10),
        endDate: null,
        status: preview.isDepreciable ? "active" : "inactive",
        calculationMethod: preview.method,
        taxYear,
        notes: `Kelompok fiskal: ${preview.groupName}`,
      });
    }
  }
}

export async function createAssetAction(formData: FormData) {
  try {
    const { user, scope } = await requireAuthenticatedScope("asset.create");
    const payload = buildCommonPayload(formData);

    assertAssetPayloadInScope(scope, payload);

    const asset = await createAsset(payload);
    await persistAssetDetails(asset.id, formData, asset.assetType as AssetDetailKind);
    const afterSnapshot = await getAssetAuditSnapshot(asset.id);

    await writeAuditLog({
      actorUserId: user.id,
      action: "create",
      entity: "asset",
      entityId: asset.id,
      afterData: afterSnapshot,
    });

    revalidatePath("/assets");
    revalidatePath(`/assets/${asset.id}`);
    redirect(`/assets/${asset.id}`);
  } catch (error) {
    await handleActionFailure(error, "/assets");
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

    const payload = buildCommonPayload(formData);
    assertAssetPayloadInScope(scope, payload);

    const asset = await updateAsset(id, payload);
    if (!asset) {
      throw new Error("Asset tidak ditemukan");
    }

    await persistAssetDetails(id, formData, asset.assetType as AssetDetailKind);
    const afterSnapshot = await getAssetAuditSnapshot(id);

    await writeAuditLog({
      actorUserId: user.id,
      action: "update",
      entity: "asset",
      entityId: id,
      beforeData: beforeSnapshot,
      afterData: afterSnapshot,
    });

    revalidatePath("/assets");
    revalidatePath(`/assets/${id}`);
    redirect(`/assets/${id}`);
  } catch (error) {
    await handleActionFailure(error, "/assets");
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

    revalidatePath("/assets");
    redirect("/assets");
  } catch (error) {
    await handleActionFailure(error, "/assets");
  }
}
