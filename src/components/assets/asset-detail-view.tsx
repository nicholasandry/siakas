import Link from "next/link";
import { Download, Pencil } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { hasPermission } from "@/lib/authz";
import type { SessionUser } from "@/lib/authz";

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
    notes: string | null;
    unitName: string | null;
    badanHukumName: string | null;
  };
  detail: Awaited<ReturnType<typeof import("@/lib/assets").getAssetDetailRows>>;
  organizations: Awaited<ReturnType<typeof import("@/lib/assets").getAssetOrganizationRows>>;
  attachments: Awaited<ReturnType<typeof import("@/lib/assets").getAssetAttachmentRows>>;
  relatedLandNames: string[];
};

const relationLabels: Record<string, string> = {
  financed_by: "Dibiayai oleh",
  used_by: "Dipakai oleh",
  owned_by: "Dimiliki oleh",
  inputted_by: "Diinput oleh",
};

export function AssetDetailView({ user, asset, detail, organizations, attachments, relatedLandNames }: AssetDetailViewProps) {
  const canUpdate = hasPermission(user, "asset.update");
  const ownershipLabel = asset.ownershipLevel === "badan_hukum" ? "Badan Hukum" : "Keuskupan";
  const managerLabel = asset.ownershipLevel === "badan_hukum" ? asset.badanHukumName : asset.unitName;

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
        ]
      : asset.assetType === "bangunan" && detail.building
        ? [
            { label: "Alamat", value: detail.building.address },
            { label: "Jenis bangunan", value: detail.building.buildingType },
            { label: "Luas bangunan (m2)", value: formatValue(detail.building.buildingAreaSquareMeters) },
            { label: "Cara perolehan", value: detail.building.acquisitionMethod },
            { label: "Status sengketa", value: detail.building.disputeStatus },
            { label: "Jumlah lantai", value: formatValue(detail.building.floorCount) },
            { label: "Tahun bangunan", value: formatValue(detail.building.constructionYear) },
            { label: "Tanah terkait", value: relatedLandNames.length > 0 ? relatedLandNames.join(", ") : null },
          ]
        : asset.assetType === "kendaraan" && detail.vehicle
          ? [
              { label: "Kategori", value: detail.vehicle.vehicleCategory },
              { label: "Merek / model", value: [detail.vehicle.brand, detail.vehicle.model].filter(Boolean).join(" ") },
              { label: "Nomor polisi", value: detail.vehicle.plateNumber },
              { label: "Nomor rangka", value: detail.vehicle.chassisNumber },
              { label: "Status operasional", value: detail.vehicle.operationalStatus },
            ]
          : asset.assetType === "benda" && detail.item
            ? [
                { label: "Kategori", value: detail.item.itemCategory },
                { label: "Deskripsi", value: detail.item.description },
                { label: "Merek / model", value: [detail.item.brand, detail.item.model].filter(Boolean).join(" ") },
                { label: "Nomor seri", value: detail.item.serialNumber },
                { label: "Jumlah", value: formatValue(detail.item.quantity) },
              ]
            : [];

  return (
    <div className="space-y-6">
      <Card className="border-slate-200/80 bg-white/80 shadow-sm backdrop-blur">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-2xl">{asset.name}</CardTitle>
            <CardDescription>
              {asset.code} · {asset.assetType} · {ownershipLabel}
            </CardDescription>
          </div>
          {canUpdate ? (
            <Link
              href={`/assets/${asset.id}/edit`}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          ) : null}
        </CardHeader>
        <CardContent>
          <DetailGrid
            fields={[
              { label: "Pengelola", value: managerLabel },
              { label: "Tanggal perolehan", value: asset.acquisitionDate },
              { label: "Nilai perolehan", value: asset.acquisitionValue ? `Rp ${asset.acquisitionValue}` : null },
              { label: "Status legalitas", value: asset.legalStatus },
              { label: "Pemilik legal", value: asset.ownerName },
              { label: "Kondisi", value: asset.condition },
              { label: "Status aset", value: asset.status },
              { label: "Catatan", value: asset.notes },
            ]}
          />
        </CardContent>
      </Card>

      <Card className="border-slate-200/80 bg-white/80 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle className="text-xl">Detail {asset.assetType}</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailGrid fields={typeDetailFields} />
        </CardContent>
      </Card>

      {organizations.length > 0 ? (
        <Card className="border-slate-200/80 bg-white/80 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle className="text-xl">Relasi organisasi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {organizations.map((org) => (
              <div key={org.id} className="rounded-2xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-900">{relationLabels[org.relationType] ?? org.relationType}</p>
                <p className="mt-1 text-sm text-slate-600">{org.notes || "—"}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {detail.coretax ? (
        <Card className="border-slate-200/80 bg-white/80 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle className="text-xl">Coretax</CardTitle>
          </CardHeader>
          <CardContent>
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
        <Card className="border-slate-200/80 bg-white/80 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle className="text-xl">Depresiasi fiskal</CardTitle>
            <CardDescription>
              Snapshot terbaru — {detail.depreciation.groupName ?? "Kelompok fiskal"} ({detail.depreciation.groupCode ?? "—"})
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <DetailGrid
              fields={[
                { label: "Metode", value: detail.depreciation.calculationMethod },
                { label: "Tahun pajak", value: formatValue(detail.depreciation.taxYear) },
                { label: "Nilai perolehan", value: detail.depreciation.acquisitionValue ? `Rp ${detail.depreciation.acquisitionValue}` : null },
                { label: "Nilai residu", value: detail.depreciation.residualValue ? `Rp ${detail.depreciation.residualValue}` : null },
                { label: "Dasar susut", value: detail.depreciation.depreciableBase ? `Rp ${detail.depreciation.depreciableBase}` : null },
                { label: "Depresiasi tahunan", value: detail.depreciation.annualDepreciation ? `Rp ${detail.depreciation.annualDepreciation}` : null },
                { label: "Akumulasi", value: detail.depreciation.accumulatedDepreciation ? `Rp ${detail.depreciation.accumulatedDepreciation}` : null },
                { label: "Nilai buku", value: detail.depreciation.bookValue ? `Rp ${detail.depreciation.bookValue}` : null },
                { label: "Status", value: detail.depreciation.status },
                { label: "Mulai", value: detail.depreciation.startDate },
              ]}
            />

            {detail.depreciationHistory.length > 1 ? (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-900">Histori perhitungan</h4>
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="min-w-[720px] w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-slate-600">
                      <tr>
                        <th className="px-4 py-3">Tahun</th>
                        <th className="px-4 py-3">Kelompok</th>
                        <th className="px-4 py-3">Metode</th>
                        <th className="px-4 py-3">Nilai buku</th>
                        <th className="px-4 py-3">Dicatat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {detail.depreciationHistory.map((entry) => (
                        <tr key={entry.id}>
                          <td className="px-4 py-3">{entry.taxYear}</td>
                          <td className="px-4 py-3">{entry.groupName ?? entry.groupCode ?? "—"}</td>
                          <td className="px-4 py-3">{entry.calculationMethod}</td>
                          <td className="px-4 py-3">Rp {entry.bookValue}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {entry.createdAt.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {attachments.length > 0 ? (
        <Card className="border-slate-200/80 bg-white/80 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle className="text-xl">Lampiran</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {attachments.map((item) => (
              <div key={item.id} className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">{item.attachmentType}</p>
                  <p className="text-sm text-slate-600">{item.filePath}</p>
                  {item.notes ? <p className="text-xs text-slate-500">{item.notes}</p> : null}
                </div>
                <a
                  href={item.filePath}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Download className="h-4 w-4" />
                  Unduh
                </a>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
