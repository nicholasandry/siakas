import { notFound } from "next/navigation";
import Link from "next/link";

import { AssetForm } from "@/components/forms/asset-form";
import { ConfirmDeleteForm } from "@/components/ui/confirm-delete-form";
import { ActionAlert } from "@/components/ui/action-alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auditPageView } from "@/lib/audit";
import { deleteAssetAction, updateAssetAction } from "../../actions";
import { calculateDepreciationFromMaster } from "@/lib/depreciation";
import {
  getAsset,
  getActiveDepreciationGroup,
  getActiveDepreciationRule,
  getAssetAttachmentRows,
  getAssetDetailRows,
  getAssetOrganizationRows,
  listAssetLookups,
} from "@/lib/assets";
import { toDepreciationGroupInput, toDepreciationRuleInput } from "@/lib/tax-master";
import { hasPermission } from "@/lib/authz";
import { assertAssetInScope } from "@/lib/scope";
import { requireAuthenticatedScope } from "@/lib/server-guards";

const actionClassName =
  "inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function applyOrganizationValues(
  values: Record<string, string | number | null | undefined | string[]>,
  organizations: Awaited<ReturnType<typeof getAssetOrganizationRows>>
) {
  const prefixByType: Record<string, string> = {
    financed_by: "financedBy",
    used_by: "usedBy",
    owned_by: "ownedBy",
    inputted_by: "inputtedBy",
  };

  for (const org of organizations) {
    const prefix = prefixByType[org.relationType];
    if (!prefix) continue;

    values[`${prefix}UnitId`] = org.unitId;
    values[`${prefix}BadanHukumId`] = org.badanHukumId;
    values[`${prefix}UserId`] = org.userId;
    values[`${prefix}Notes`] = org.notes;
  }
}

function valuesFromAsset(
  asset: Awaited<ReturnType<typeof getAsset>>,
  detail: Awaited<ReturnType<typeof getAssetDetailRows>>,
  organizations: Awaited<ReturnType<typeof getAssetOrganizationRows>>
) {
  if (!asset) return null;

  const result = {
    id: asset.id,
    code: asset.code,
    name: asset.name,
    assetType: asset.assetType,
    ownershipLevel: asset.ownershipLevel,
    unitId: asset.unitId,
    badanHukumId: asset.badanHukumId,
    acquisitionDate: asset.acquisitionDate,
    acquisitionValue: asset.acquisitionValue,
    legalStatus: asset.legalStatus,
    ownerName: asset.ownerName,
    condition: asset.condition,
    status: asset.status,
    notes: asset.notes,
    landAddress: detail.land?.address,
    landAreaSquareMeters: detail.land?.areaSquareMeters,
    landCertificateType: detail.land?.certificateType,
    landCertificateNumber: detail.land?.certificateNumber,
    landCertificateHolderName: detail.land?.certificateHolderName,
    landCertificateIssuedAt: detail.land?.certificateIssuedAt,
    landCertificateExpiredAt: detail.land?.certificateExpiredAt,
    landIssuingInstitution: detail.land?.issuingInstitution,
    landLegalOwnerType: detail.land?.legalOwnerType,
    landActualOwnerName: detail.land?.actualOwnerName,
    landLastNjopValue: detail.land?.lastNjopValue,
    landAppraisalValue: detail.land?.appraisalValue,
    landAppraisalDate: detail.land?.appraisalDate,
    landNopPbb: detail.land?.nopPbb,
    landBoundaryNorth: detail.land?.boundaryNorth,
    landBoundarySouth: detail.land?.boundarySouth,
    landBoundaryEast: detail.land?.boundaryEast,
    landBoundaryWest: detail.land?.boundaryWest,
    landLatitude: detail.land?.latitude,
    landLongitude: detail.land?.longitude,
    landLandUse: detail.land?.landUse,
    landAcquisitionMethod: detail.land?.acquisitionMethod,
    landDisputeStatus: detail.land?.disputeStatus,
    landNotes: detail.land?.notes,
    buildingAddress: detail.building?.address,
    buildingType: detail.building?.buildingType,
    buildingMainLandAssetId: detail.building?.mainLandAssetId,
    buildingAcquisitionMethod: detail.building?.acquisitionMethod,
    buildingDisputeStatus: detail.building?.disputeStatus,
    buildingAreaSquareMeters: detail.building?.buildingAreaSquareMeters,
    buildingLandAssetIds: detail.buildingLandIds,
    buildingFloorCount: detail.building?.floorCount,
    buildingConstructionYear: detail.building?.constructionYear,
    buildingLastRenovationYear: detail.building?.lastRenovationYear,
    buildingStructureType: detail.building?.structureType,
    buildingFootprintAreaSquareMeters: detail.building?.footprintAreaSquareMeters,
    buildingPermitType: detail.building?.permitType,
    buildingPermitNumber: detail.building?.permitNumber,
    buildingPermitIssuedAt: detail.building?.permitIssuedAt,
    buildingPermitExpiredAt: detail.building?.permitExpiredAt,
    buildingPermitIssuer: detail.building?.permitIssuer,
    buildingSlfNumber: detail.building?.slfNumber,
    buildingSlfIssuedAt: detail.building?.slfIssuedAt,
    buildingSlfExpiredAt: detail.building?.slfExpiredAt,
    buildingLeaseAgreementDocument: detail.building?.leaseAgreementDocument,
    buildingElectricityCapacity: detail.building?.electricityCapacity,
    buildingWaterSource: detail.building?.waterSource,
    buildingParkingCapacity: detail.building?.parkingCapacity,
    buildingFacilities: detail.building?.facilities,
    buildingLatitude: detail.building?.latitude,
    buildingLongitude: detail.building?.longitude,
    buildingNotes: detail.building?.notes,
    vehicleCategory: detail.vehicle?.vehicleCategory,
    vehicleBrand: detail.vehicle?.brand,
    vehicleModel: detail.vehicle?.model,
    vehicleManufactureYear: detail.vehicle?.manufactureYear,
    vehicleColor: detail.vehicle?.color,
    vehiclePlateNumber: detail.vehicle?.plateNumber,
    vehicleChassisNumber: detail.vehicle?.chassisNumber,
    vehicleEngineNumber: detail.vehicle?.engineNumber,
    vehicleStnkNumber: detail.vehicle?.stnkNumber,
    vehicleBpkbNumber: detail.vehicle?.bpkbNumber,
    vehicleDocumentCompletenessStatus: detail.vehicle?.documentCompletenessStatus,
    vehicleStnkIssuedAt: detail.vehicle?.stnkIssuedAt,
    vehicleStnkExpiredAt: detail.vehicle?.stnkExpiredAt,
    vehicleLastTaxPaidAt: detail.vehicle?.lastTaxPaidAt,
    vehicleTaxDueAt: detail.vehicle?.taxDueAt,
    vehicleTaxStatus: detail.vehicle?.taxStatus,
    vehicleIssuingInstitution: detail.vehicle?.issuingInstitution,
    vehicleRegisteredOwnerName: detail.vehicle?.registeredOwnerName,
    vehicleInsurancePolicyNumber: detail.vehicle?.insurancePolicyNumber,
    vehicleInsuranceValidUntil: detail.vehicle?.insuranceValidUntil,
    vehicleDomicileLocation: detail.vehicle?.domicileLocation,
    vehicleCondition: detail.vehicle?.condition,
    vehicleOperationalStatus: detail.vehicle?.operationalStatus,
    vehicleNotes: detail.vehicle?.notes,
    itemCategory: detail.item?.itemCategory,
    itemDescription: detail.item?.description,
    itemBrand: detail.item?.brand,
    itemModel: detail.item?.model,
    itemSerialNumber: detail.item?.serialNumber,
    itemQuantity: detail.item?.quantity,
    itemUnit: detail.item?.unit,
    itemStorageLocation: detail.item?.storageLocation,
    itemResponsiblePerson: detail.item?.responsiblePerson,
    itemEvidenceDocumentNumber: detail.item?.evidenceDocumentNumber,
    itemEvidenceDocumentDate: detail.item?.evidenceDocumentDate,
    itemEvidenceIssuer: detail.item?.evidenceIssuer,
    itemEvidenceRegisteredName: detail.item?.evidenceRegisteredName,
    itemDocumentStatus: detail.item?.documentStatus,
    itemCondition: detail.item?.condition,
    itemNotes: detail.item?.notes,
    coretaxAssetType: detail.coretax?.coretaxAssetType,
    coretaxAssetCode: detail.coretax?.coretaxAssetCode,
    coretaxAssetClassType: detail.coretax?.assetClassType,
    coretaxOwnershipSource: detail.coretax?.ownershipSource,
    coretaxSptOwnerName: detail.coretax?.sptOwnerName,
    coretaxTaxNotes: detail.coretax?.taxNotes,
    coretaxAuditNotes: detail.coretax?.auditNotes,
    depreciationGroupId: detail.depreciation?.depreciationGroupId,
  };

  applyOrganizationValues(result, organizations);
  return result;
}

export default async function EditAssetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { user, scope } = await requireAuthenticatedScope("asset.update");
  const [asset, detail, lookups, organizations, attachments] = await Promise.all([
    getAsset(id),
    getAssetDetailRows(id),
    listAssetLookups(scope),
    getAssetOrganizationRows(id),
    getAssetAttachmentRows(id),
  ]);
  const canDelete = hasPermission(user, "asset.delete");

  if (!asset) {
    notFound();
  }

  assertAssetInScope(scope, asset);

  await auditPageView(user.id, {
    entity: "asset",
    entityId: asset.id,
    view: "edit",
    metadata: { code: asset.code, name: asset.name, assetType: asset.assetType },
  });

  const values = valuesFromAsset(asset, detail, organizations);
  let depreciationPreview = null;

  if (asset.acquisitionValue) {
    const group = await getActiveDepreciationGroup(
      asset.assetType,
      detail.depreciation?.depreciationGroupId ?? null
    );

    if (group) {
      const taxYear = asset.acquisitionDate
        ? new Date(asset.acquisitionDate).getFullYear()
        : new Date().getFullYear();
      const rule = await getActiveDepreciationRule(group.id, taxYear);

      depreciationPreview = calculateDepreciationFromMaster(
        Number(asset.acquisitionValue),
        toDepreciationGroupInput(group),
        rule ? toDepreciationRuleInput(rule) : null
      );
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <ActionAlert message={error} />

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Assets / Edit</p>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">Edit aset</h1>
            <p className="text-base leading-7 text-slate-600">
              {asset.code} - {asset.name}
            </p>
          </div>
          <Link href={`/assets/${asset.id}`} className={actionClassName}>
            Lihat detail
          </Link>
        </div>
      </section>

      <Card className="border-slate-200/80 bg-white/80 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle className="text-2xl">Ringkasan aset</CardTitle>
          <CardDescription>
            {asset.assetType} · {asset.ownershipLevel === "badan_hukum" ? "Badan Hukum" : "Keuskupan"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">Status: {asset.status}</span>
            {canDelete ? (
              <ConfirmDeleteForm
                action={deleteAssetAction}
                confirmMessage={`Hapus aset "${asset.name}" beserta seluruh detail dan lampiran?`}
              >
                <input type="hidden" name="id" value={asset.id} />
                <button type="submit" className="rounded-full border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50">
                  Hapus aset
                </button>
              </ConfirmDeleteForm>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <AssetForm
        action={updateAssetAction}
        submitLabel="Simpan perubahan"
        assetType={asset.assetType as "tanah" | "bangunan" | "kendaraan" | "benda"}
        values={values ?? undefined}
        lookups={lookups}
        existingAttachments={attachments}
        depreciationPreview={depreciationPreview}
      />
    </main>
  );
}
