import Link from "next/link";
import { Download, Pencil } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapView } from "@/components/maps/map-view";
import {
  DataTable,
  tableBodyClassName,
  tableCellClassName,
  tableClassName,
  tableHeadClassName,
  tableHeaderCellClassName,
} from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { hasPermission } from "@/lib/authz";
import { assetBuildingCategoryLabels } from "@/lib/asset-building-categories";
import { disposalMethodLabels, disposalReasonLabels, disposalStatusLabels } from "@/lib/asset-disposals/constants";
import { assetItemCategoryLabels } from "@/lib/asset-item-categories";
import { assetVehicleCategoryLabels } from "@/lib/asset-vehicle-categories";
import { getPlacementLocationFieldLabel, needsPlacementLocationReminder, usesMasterDataPlacementLocation } from "@/lib/assets/placement";
import { canStartAssetDisposalFromAssetStatus, isInactiveAssetStatus } from "@/lib/assets/status";
import { StartAssetDisposalButton } from "@/components/assets/start-asset-disposal-button";
import { AssetHistoryTimeline } from "@/components/assets/asset-history-timeline";
import { AssetQuickPlacementButton } from "@/components/assets/asset-quick-placement-dialog";
import type { AssetHistoryFilter, UnifiedAssetHistoryItem } from "@/lib/assets/histories.shared";
import { assetStatusLabels, assetTypeLabels, formatRupiahRp, labelFromMap } from "@/lib/formatters";
import type { SessionUser } from "@/lib/authz";
import { formatRupiah } from "@/lib/utils";

type DetailField = {
  label: string;
  value: string | null | undefined;
};

function DetailGrid({ fields }: { fields: DetailField[] }) {
  const visible = fields.filter((field) => field.value && field.value !== "-");

  if (visible.length === 0) {
    return <p className="text-sm text-slate-500">Belum ada data.</p>;
  }

  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {visible.map((field) => (
        <div key={field.label}>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{field.label}</dt>
          <dd className="mt-1 text-sm text-slate-800">{field.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function formatValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return String(value);
}

type PatokCoordinate = {
  label: string;
  lat: number;
  lng: number;
};

function normalizePatoks(value: unknown): PatokCoordinate[] {
  let raw = value;
  if (typeof value === "string" && value) {
    try {
      raw = JSON.parse(value);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(raw)) return [];

  return raw
    .map((item, index) => {
      const record = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const lat = Number(record.lat);
      const lng = Number(record.lng);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      return {
        label: String(record.label || `Patok ${index + 1}`).trim(),
        lat,
        lng,
      };
    })
    .filter((item): item is PatokCoordinate => Boolean(item));
}

type AssetDetailViewProps = {
  user: SessionUser;
  asset: {
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
    loanedTo?: string | null;
    notes: string | null;
    unitName: string | null;
    badanHukumName: string | null;
    locationName: string | null;
    unitId: string | null;
    locationId: string | null;
  };
  locations?: Array<{ id: string; name: string; code?: string | null; unitId: string }>;
  detail: Awaited<ReturnType<typeof import("@/lib/assets").getAssetDetailRows>>;
  organizations: Awaited<ReturnType<typeof import("@/lib/assets").getAssetOrganizationRows>>;
  attachments: Awaited<ReturnType<typeof import("@/lib/assets").getAssetAttachmentRows>>;
  disposals: Awaited<ReturnType<typeof import("@/lib/asset-disposals").getAssetDisposalsByAssetId>>;
  historyItemsByFilter?: Partial<Record<AssetHistoryFilter, UnifiedAssetHistoryItem[]>>;
  historyFilterCounts?: Record<AssetHistoryFilter, number>;
  relatedLandNames: string[];
};

const relationLabels: Record<string, string> = {
  financed_by: "Dibiayai oleh",
  used_by: "Dipakai oleh",
  owned_by: "Dimiliki oleh",
  inputted_by: "Diinput oleh",
};

export function AssetDetailView({
  user,
  asset,
  detail,
  organizations,
  attachments,
  disposals,
  historyItemsByFilter,
  historyFilterCounts,
  relatedLandNames,
  locations = [],
}: AssetDetailViewProps) {
  const canUpdate = hasPermission(user, "asset.update");
  const canViewDisposal = hasPermission(user, "asset.disposal.view");
  const canCreateDisposal = hasPermission(user, "asset.disposal.create");
  const activeDisposal = disposals.find((item) => ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "WAITING_APPROVAL", "APPROVED"].includes(item.status));
  const hasActiveDisposal = Boolean(activeDisposal);
  const ownershipLabel = asset.ownershipLevel === "badan_hukum" ? "Badan hukum" : "Keuskupan";
  const managerLabel = asset.ownershipLevel === "badan_hukum" ? asset.badanHukumName : asset.unitName;
  const assetTypeLabel = labelFromMap(asset.assetType, assetTypeLabels);
  const landPatoks = detail.land ? normalizePatoks(detail.land.boundaryPatokCoordinates) : [];
  const placementLabel = getPlacementLocationFieldLabel(asset.assetType);
  const showPlacementReminder = needsPlacementLocationReminder({
    assetType: asset.assetType,
    ownershipLevel: asset.ownershipLevel,
    status: asset.status,
    locationId: asset.locationId,
  });

  const typeDetailFields: DetailField[] =
    asset.assetType === "tanah" && detail.land
      ? [
          { label: "Alamat", value: detail.land.address },
          { label: "Luas tanah (m2)", value: formatValue(detail.land.areaSquareMeters) },
          { label: "Jenis sertifikat", value: detail.land.certificateType },
          { label: "Nomor sertifikat", value: detail.land.certificateNumber },
          { label: "Peruntukan", value: detail.land.landUse },
          { label: "Cara perolehan", value: detail.land.acquisitionMethod },
          { label: "Status sengketa", value: detail.land.disputeStatus },
          { label: "Batas Utara", value: detail.land.boundaryNorth },
          { label: "Batas Timur", value: detail.land.boundaryEast },
          { label: "Batas Selatan", value: detail.land.boundarySouth },
          { label: "Batas Barat", value: detail.land.boundaryWest },
        ]
      : asset.assetType === "bangunan" && detail.building
        ? [
            { label: "Alamat", value: detail.building.address },
            { label: "Kategori bangunan", value: labelFromMap(detail.building.buildingCategory, assetBuildingCategoryLabels) },
            { label: "Jenis bangunan", value: detail.building.buildingType },
            { label: "Luas bangunan (m2)", value: formatValue(detail.building.buildingAreaSquareMeters) },
            { label: "Luas tapak / footprint (m2)", value: formatValue(detail.building.footprintAreaSquareMeters) },
            { label: "Cara perolehan", value: detail.building.acquisitionMethod },
            { label: "Status sengketa", value: detail.building.disputeStatus },
            { label: "Jumlah lantai", value: formatValue(detail.building.floorCount) },
            { label: "Tahun bangunan", value: formatValue(detail.building.constructionYear) },
            { label: "Tahun renovasi terakhir", value: formatValue(detail.building.lastRenovationYear) },
            { label: "Struktur bangunan", value: detail.building.structureType },
            { label: "Kondisi fisik detail", value: detail.building.physicalCondition },
            { label: "Tanah terkait", value: relatedLandNames.length > 0 ? relatedLandNames.join(", ") : null },
          ]
        : asset.assetType === "kendaraan" && detail.vehicle
          ? [
              { label: "Kategori", value: labelFromMap(detail.vehicle.vehicleCategory, assetVehicleCategoryLabels) },
              { label: "Merek / model", value: [detail.vehicle.brand, detail.vehicle.model].filter(Boolean).join(" ") },
              { label: "Nomor polisi", value: detail.vehicle.plateNumber },
              { label: "Nomor rangka", value: detail.vehicle.chassisNumber },
              { label: "Status operasional", value: detail.vehicle.operationalStatus },
            ]
          : asset.assetType === "benda" && detail.item
            ? [
                { label: "Kategori", value: labelFromMap(detail.item.itemCategory, assetItemCategoryLabels) },
                { label: "Deskripsi", value: detail.item.description },
                { label: "Merek / model", value: [detail.item.brand, detail.item.model].filter(Boolean).join(" ") },
                { label: "Nomor seri", value: detail.item.serialNumber },
                { label: "Jumlah", value: formatValue(detail.item.quantity) },
              ]
            : [];

  return (
    <div className="space-y-5">
      {showPlacementReminder ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
          <p className="font-medium">Lokasi penempatan belum ditentukan</p>
          <p className="mt-1 text-amber-900">
            Aset ini aktif di unit <span className="font-medium">{asset.unitName ?? "pengelola"}</span> tetapi belum memiliki{" "}
            {placementLabel.toLowerCase()}. Hal ini umum setelah hibah internal — pilih lokasi dari master data unit pengelola.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {canUpdate ? (
              <>
                <AssetQuickPlacementButton
                  asset={{
                    id: asset.id,
                    code: asset.code,
                    name: asset.name,
                    assetType: asset.assetType,
                    ownershipLevel: asset.ownershipLevel,
                    status: asset.status,
                    unitId: asset.unitId,
                    locationId: asset.locationId,
                  }}
                  locations={locations}
                  returnPath={`/assets/${asset.id}`}
                />
                <Link
                  href={`/assets/${asset.id}/edit`}
                  className="inline-flex h-9 items-center rounded-lg border border-amber-300 bg-white px-3 text-xs font-medium text-amber-900 hover:bg-amber-100"
                >
                  Atur lewat edit aset
                </Link>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-xl">{asset.name}</CardTitle>
            <CardDescription className="mt-2 flex flex-wrap items-center gap-2">
              <span>{asset.code}</span>
              <span>{assetTypeLabel}</span>
              <span>{ownershipLabel}</span>
              <StatusBadge tone={asset.status === "active" ? "success" : isInactiveAssetStatus(asset.status) ? "warning" : "neutral"}>
                {labelFromMap(asset.status, assetStatusLabels)}
              </StatusBadge>
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {canViewDisposal && activeDisposal ? (
              <Link
                href={`/assets/disposals/${activeDisposal.id}`}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-amber-200 px-4 text-sm font-medium text-amber-700 hover:bg-amber-50"
              >
                Buka Disposal
              </Link>
            ) : null}
            {canCreateDisposal && canStartAssetDisposalFromAssetStatus(asset.status, hasActiveDisposal) ? (
              <StartAssetDisposalButton
                assetId={asset.id}
                assetName={asset.name}
                assetStatus={asset.status}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800"
                label="Hapus Aset"
              />
            ) : null}
            {canUpdate ? (
              <Link
                href={`/assets/${asset.id}/edit`}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <DetailGrid
            fields={[
              { label: "Pengelola", value: managerLabel },
              ...(usesMasterDataPlacementLocation(asset.assetType)
                ? [{ label: getPlacementLocationFieldLabel(asset.assetType), value: asset.locationName }]
                : []),
              { label: "Tanggal perolehan", value: asset.acquisitionDate },
              { label: "Nilai perolehan", value: asset.acquisitionValue ? formatRupiah(asset.acquisitionValue) : null },
              { label: "Status legalitas", value: asset.legalStatus },
              { label: "Pemilik legal", value: asset.ownerName },
              { label: "Kondisi", value: asset.condition },
              { label: "Status aset", value: labelFromMap(asset.status, assetStatusLabels) },
              ...(asset.status === "on_loan" && asset.loanedTo
                ? [{ label: "Dipinjamkan kepada", value: asset.loanedTo }]
                : []),
              { label: "Catatan", value: asset.notes },
            ]}
          />
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="p-5">
          <CardTitle className="text-lg">Detail {assetTypeLabel}</CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <DetailGrid fields={typeDetailFields} />
        </CardContent>
      </Card>

      {asset.assetType === "tanah" && detail.land ? (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="p-5">
            <CardTitle className="text-lg">Peta &amp; batas tanah</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 p-5 pt-0">
            <DetailGrid
              fields={[
                { label: "Batas Utara", value: detail.land.boundaryNorth },
                { label: "Batas Timur", value: detail.land.boundaryEast },
                { label: "Batas Selatan", value: detail.land.boundarySouth },
                { label: "Batas Barat", value: detail.land.boundaryWest },
              ]}
            />

            <MapView latitude={detail.land.latitude} longitude={detail.land.longitude} patoks={landPatoks} assetType="land" />

            {landPatoks.length > 0 ? (
              <DataTable minWidth="640px">
                <table className={tableClassName}>
                  <thead className={tableHeadClassName}>
                    <tr>
                      <th className={tableHeaderCellClassName}>No</th>
                      <th className={tableHeaderCellClassName}>Label Patok</th>
                      <th className={tableHeaderCellClassName}>Latitude</th>
                      <th className={tableHeaderCellClassName}>Longitude</th>
                    </tr>
                  </thead>
                  <tbody className={tableBodyClassName}>
                    {landPatoks.map((patok, index) => (
                      <tr key={`${patok.label}-${index}`}>
                        <td className={tableCellClassName}>{index + 1}</td>
                        <td className={tableCellClassName}>{patok.label}</td>
                        <td className={tableCellClassName}>{patok.lat}</td>
                        <td className={tableCellClassName}>{patok.lng}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DataTable>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {asset.assetType === "bangunan" && detail.building ? (
        <>
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="p-5">
              <CardTitle className="text-lg">Tanah terkait</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <DetailGrid
                fields={[
                  { label: "Tanah utama", value: relatedLandNames.find((_, index) => detail.buildingLandIds[index] === detail.building?.mainLandAssetId) },
                  { label: "Semua tanah terkait", value: relatedLandNames.length > 0 ? relatedLandNames.join(", ") : null },
                ]}
              />
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="p-5">
              <CardTitle className="text-lg">IMB / PBG</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <DetailGrid
                fields={[
                  { label: "Jenis izin", value: detail.building.permitType },
                  { label: "Nomor IMB/PBG", value: detail.building.permitNumber },
                  { label: "Instansi penerbit", value: detail.building.permitIssuer },
                  { label: "Tanggal terbit IMB/PBG", value: detail.building.permitIssuedAt },
                  { label: "Tanggal kadaluarsa IMB/PBG", value: detail.building.permitExpiredAt },
                ]}
              />
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="p-5">
              <CardTitle className="text-lg">SLF</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <DetailGrid
                fields={[
                  { label: "Nomor SLF", value: detail.building.slfNumber },
                  { label: "Tanggal terbit SLF", value: detail.building.slfIssuedAt },
                  { label: "Masa berlaku SLF", value: detail.building.slfExpiredAt },
                ]}
              />
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="p-5">
              <CardTitle className="text-lg">Sewa, Utilitas &amp; Fasilitas</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <DetailGrid
                fields={[
                  { label: "Nilai sewa", value: formatRupiah(detail.building.rentAmount) },
                  { label: "Nilai NJOP", value: formatRupiah(detail.building.njopValue) },
                  { label: "Nilai pasar appraisal", value: formatRupiah(detail.building.appraisalValue) },
                  { label: "Daya listrik", value: detail.building.electricityCapacity },
                  { label: "Sumber air", value: detail.building.waterSource },
                  { label: "Kapasitas parkir", value: detail.building.parkingCapacity },
                  { label: "Fasilitas pendukung", value: detail.building.facilities },
                  { label: "Penanggung jawab pemeliharaan", value: detail.building.maintenanceResponsibleName },
                  { label: "Biaya pemeliharaan", value: formatRupiah(detail.building.maintenanceAnnualCost) },
                  { label: "Catatan bangunan", value: detail.building.notes },
                ]}
              />
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="p-5">
              <CardTitle className="text-lg">Peta Lokasi</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <MapView latitude={detail.building.latitude} longitude={detail.building.longitude} assetType="building" />
            </CardContent>
          </Card>
        </>
      ) : null}

      {organizations.length > 0 ? (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="p-5">
            <CardTitle className="text-lg">Relasi organisasi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-5 pt-0">
            {organizations.map((org) => (
              <div key={org.id} className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-900">{relationLabels[org.relationType] ?? org.relationType}</p>
                <p className="mt-1 text-sm text-slate-600">{org.notes || "-"}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {detail.coretax ? (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="p-5">
            <CardTitle className="text-lg">Coretax</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <DetailGrid
              fields={[
                { label: "Jenis harta", value: detail.coretax.coretaxAssetType },
                { label: "Kode harta", value: detail.coretax.coretaxAssetCode },
                { label: "Golongan harta", value: detail.coretax.assetClassType },
                { label: "Sumber kepemilikan", value: detail.coretax.ownershipSource },
                { label: "Pemilik SPT", value: detail.coretax.sptOwnerName },
                { label: "Catatan pajak", value: detail.coretax.taxNotes },
                { label: "Catatan audit", value: detail.coretax.auditNotes },
              ]}
            />
          </CardContent>
        </Card>
      ) : null}

      {detail.depreciation ? (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="p-5">
            <CardTitle className="text-lg">Depresiasi fiskal</CardTitle>
            <CardDescription>
              Snapshot terbaru - {detail.depreciation.groupName ?? "Kelompok fiskal"} ({detail.depreciation.groupCode ?? "-"})
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 p-5 pt-0">
            <DetailGrid
              fields={[
                { label: "Metode", value: detail.depreciation.calculationMethod },
                { label: "Tahun pajak", value: formatValue(detail.depreciation.taxYear) },
                { label: "Nilai perolehan", value: detail.depreciation.acquisitionValue ? formatRupiah(detail.depreciation.acquisitionValue) : null },
                { label: "Nilai residu", value: detail.depreciation.residualValue ? formatRupiah(detail.depreciation.residualValue) : null },
                { label: "Dasar susut", value: detail.depreciation.depreciableBase ? formatRupiah(detail.depreciation.depreciableBase) : null },
                { label: "Depresiasi tahunan", value: detail.depreciation.annualDepreciation ? formatRupiah(detail.depreciation.annualDepreciation) : null },
                { label: "Akumulasi", value: detail.depreciation.accumulatedDepreciation ? formatRupiah(detail.depreciation.accumulatedDepreciation) : null },
                { label: "Nilai buku", value: detail.depreciation.bookValue ? formatRupiah(detail.depreciation.bookValue) : null },
                { label: "Status", value: detail.depreciation.status },
                { label: "Mulai", value: detail.depreciation.startDate },
              ]}
            />

            {detail.depreciationHistory.length > 1 ? (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-900">Histori perhitungan</h4>
                <DataTable minWidth="720px">
                  <table className={tableClassName}>
                    <thead className={tableHeadClassName}>
                      <tr>
                        <th className={tableHeaderCellClassName}>Tahun</th>
                        <th className={tableHeaderCellClassName}>Kelompok</th>
                        <th className={tableHeaderCellClassName}>Metode</th>
                        <th className={tableHeaderCellClassName}>Nilai buku</th>
                        <th className={tableHeaderCellClassName}>Dicatat</th>
                      </tr>
                    </thead>
                    <tbody className={tableBodyClassName}>
                      {detail.depreciationHistory.map((entry) => (
                        <tr key={entry.id}>
                          <td className="px-4 py-3">{entry.taxYear}</td>
                          <td className="px-4 py-3">{entry.groupName ?? entry.groupCode ?? "-"}</td>
                          <td className="px-4 py-3">{entry.calculationMethod}</td>
                          <td className="px-4 py-3">{formatRupiah(entry.bookValue)}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {entry.createdAt.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </DataTable>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {attachments.length > 0 ? (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="p-5">
            <CardTitle className="text-lg">Lampiran</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-5 pt-0">
            {attachments.map((item) => (
              <div key={item.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">{item.attachmentType}</p>
                  <p className="text-sm text-slate-600">{item.filePath}</p>
                  {item.notes ? <p className="text-xs text-slate-500">{item.notes}</p> : null}
                </div>
                <a
                  href={item.filePath}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Download className="h-4 w-4" />
                  Unduh
                </a>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="space-y-1 p-5">
          <CardTitle className="text-lg">Proses Disposal</CardTitle>
          <CardDescription className="text-slate-600">
            Ringkasan pengajuan, persetujuan, dan hasil keuangan disposal. Berbeda dari riwayat perubahan status di bawah.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 p-5 pt-0">
          {disposals.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada proses disposal untuk aset ini.</p>
          ) : (
            disposals.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {labelFromMap(item.disposalReasonType, disposalReasonLabels)} - {labelFromMap(item.disposalMethod, disposalMethodLabels)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {["DRAFT", "SUBMITTED", "UNDER_REVIEW", "WAITING_APPROVAL", "APPROVED"].includes(item.status)
                        ? "Aset sedang dalam proses disposal"
                        : `Tanggal disposal: ${item.effectiveDisposalDate}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge>{labelFromMap(item.status, disposalStatusLabels)}</StatusBadge>
                    <Link href={`/assets/disposals/${item.id}`} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700">
                      Detail
                    </Link>
                  </div>
                </div>
                {item.status === "COMPLETED" ? (
                  <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
                    <span>Nilai buku: {formatRupiah(item.bookValueAtDisposal)}</span>
                    <span>Jual/kompensasi: {formatRupiah(item.saleNetAmount ?? item.compensationAmount ?? item.governmentCompensationAmount ?? item.insuranceClaimAmount)}</span>
                    <span>Selisih: {formatRupiah(item.disposalGainLossAmount)}</span>
                  </div>
                ) : null}
              </div>
            ))
          )}
          {disposals.length > 0 ? (
            <div className="border-t border-slate-200 pt-3">
              <Link
                href={`/assets/${asset.id}/history?filter=disposal`}
                className="text-sm font-medium text-slate-700 underline-offset-2 hover:underline"
              >
                Lihat audit perubahan status disposal
              </Link>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <AssetHistoryTimeline
        assetId={asset.id}
        historyItemsByFilter={historyItemsByFilter}
        filterCounts={historyFilterCounts}
        excludeFilters={["disposal"]}
        description="Catatan perubahan status operasional, kondisi fisik, peminjaman, dan penempatan (unit/lokasi). Untuk ringkasan proses disposal, lihat kartu Proses Disposal di atas."
        mode="preview"
      />
    </div>
  );
}
