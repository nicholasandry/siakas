import Link from "next/link";
import { Eye } from "lucide-react";

import {
  DataTable,
  tableBodyClassName,
  tableCellClassName,
  tableClassName,
  tableHeadClassName,
  tableHeaderCellClassName,
  tableRowClassName,
} from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { assetIssueDefinitions } from "@/lib/asset-dashboard/asset-dashboard.helpers";
import type { AssetDashboardData, AssetDashboardIssueSeverity } from "@/lib/asset-dashboard/asset-dashboard.types";
import { assetTypeLabels, labelFromMap } from "@/lib/formatters";
import { formatRupiah } from "@/lib/utils";
import { AssetDashboardFilters } from "./asset-dashboard-filters";

type AssetDashboardPageProps = {
  data: AssetDashboardData;
};

const severityTone: Record<AssetDashboardIssueSeverity, "success" | "warning" | "danger" | "neutral"> = {
  low: "neutral",
  medium: "warning",
  high: "warning",
  critical: "danger",
};

function metricValue(value: number, isMoney = false) {
  return isMoney ? formatRupiah(value) : new Intl.NumberFormat("id-ID").format(value);
}

export function AssetSummaryCards({ data }: AssetDashboardPageProps) {
  const cards = [
    { label: "Total Aset Aktif", value: metricValue(data.summary.totalActiveAssets) },
    { label: "Total Nilai Perolehan", value: data.canViewValues ? metricValue(data.summary.totalAcquisitionValue, true) : "Tersembunyi" },
    { label: "Total Nilai Buku", value: data.canViewValues ? metricValue(data.summary.totalBookValue, true) : "Tersembunyi" },
    { label: "Akumulasi Penyusutan", value: data.canViewValues ? metricValue(data.summary.totalAccumulatedDepreciation, true) : "Tersembunyi" },
    { label: "Data Tidak Lengkap", value: metricValue(data.summary.incompleteDataAssets) },
    { label: "Perlu Tindak Lanjut", value: metricValue(data.summary.actionRequiredAssets) },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.label} className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="p-5 pb-2">
            <CardDescription>{card.label}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums text-slate-950">{card.value}</CardTitle>
          </CardHeader>
        </Card>
      ))}
    </section>
  );
}

export function AssetCompositionSection({ data }: AssetDashboardPageProps) {
  const maxCount = Math.max(...data.composition.map((item) => item.count), 1);

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="p-5">
        <CardTitle className="text-xl">Komposisi Aset</CardTitle>
        <CardDescription>Jumlah dan nilai berdasarkan jenis aset.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-5 pt-0">
        {data.composition.every((item) => item.count === 0) ? (
          <EmptyState title="Belum ada aset" description="Data belum tersedia untuk filter ini." />
        ) : (
          data.composition.map((item) => {
            const width = Math.max(5, (item.count / maxCount) * 100);
            return (
              <div key={item.assetType} className="grid gap-2 md:grid-cols-[160px_1fr_180px] md:items-center">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{labelFromMap(item.assetType, assetTypeLabels)}</p>
                  <p className="text-xs text-slate-500">{metricValue(item.count)} aset</p>
                </div>
                <div className="h-8 rounded-lg bg-slate-100">
                  <div className="h-8 rounded-lg bg-emerald-600" style={{ width: `${width}%` }} />
                </div>
                <p className="text-sm font-medium text-slate-700 md:text-right">{data.canViewValues ? formatRupiah(item.acquisitionValue) : "Tersembunyi"}</p>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

export function AssetDataHealthSection({ data }: AssetDashboardPageProps) {
  const issueRows = Object.entries(assetIssueDefinitions)
    .map(([code, issue]) => ({ ...issue, count: data.dataHealth.issueCounts[code as keyof typeof data.dataHealth.issueCounts] ?? 0 }))
    .filter((item) => item.count > 0);

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="p-5">
        <CardTitle className="text-xl">Kesehatan Data Aset</CardTitle>
        <CardDescription>{data.dataHealth.totalAssets} aset dianalisis.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 p-5 pt-0">
        <div className="grid gap-4 md:grid-cols-[180px_1fr] md:items-center">
          <div>
            <p className="text-4xl font-semibold tabular-nums text-slate-950">{data.dataHealth.score}%</p>
            <p className="text-sm text-slate-500">Data Health Score</p>
          </div>
          <div className="h-4 rounded-full bg-slate-100">
            <div className="h-4 rounded-full bg-emerald-600" style={{ width: `${data.dataHealth.score}%` }} />
          </div>
        </div>
        {issueRows.length === 0 ? (
          <EmptyState title="Tidak ada aset bermasalah" description="Tidak ditemukan issue kritis pada filter ini." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {issueRows.map((issue) => (
              <div key={issue.code} className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-slate-900">{issue.label}</p>
                  <StatusBadge tone={severityTone[issue.severity]}>{issue.severity}</StatusBadge>
                </div>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-950">{issue.count}</p>
              </div>
            ))}
          </div>
        )}
        {data.dataHealth.duplicateAssetCodes.length > 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Kode aset duplikat: {data.dataHealth.duplicateAssetCodes.map((item) => `${item.code} (${item.count})`).join(", ")}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function AssetLocationHealthSection({ data }: AssetDashboardPageProps) {
  const rows = [
    ["Tanah dengan koordinat", data.locationHealth.landWithCoordinate],
    ["Tanah tanpa koordinat", data.locationHealth.landWithoutCoordinate],
    ["Bangunan dengan koordinat / relasi tanah", data.locationHealth.buildingWithCoordinateOrLand],
    ["Bangunan tanpa relasi tanah/lokasi", data.locationHealth.buildingWithoutLandOrLocation],
    ["Tanah belum lengkap patok & batas", data.locationHealth.landMissingBoundary],
  ];

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="p-5">
        <CardTitle className="text-xl">Peta dan Lokasi Aset</CardTitle>
        <CardDescription>Ringkasan kelengkapan lokasi untuk tanah dan bangunan.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 p-5 pt-0">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {rows.map(([label, value]) => (
            <div key={label} className="rounded-lg border border-slate-200 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-950">{metricValue(Number(value))}</p>
            </div>
          ))}
        </div>
        {data.locationHealth.problematicLandAssets.length === 0 ? (
          <EmptyState title="Tidak ada aset bermasalah" description="Data lokasi tanah sudah lengkap untuk filter ini." />
        ) : (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Aset Tanah Bermasalah Lokasi</h3>
            {data.locationHealth.problematicLandAssets.map((asset) => (
              <div key={asset.id} className="flex flex-col gap-2 rounded-lg border border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{asset.name}</p>
                  <p className="text-xs text-slate-500">{asset.code ?? "-"}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {asset.issues.map((issue) => (
                    <StatusBadge key={issue.code} tone={severityTone[issue.severity]}>{issue.label}</StatusBadge>
                  ))}
                  <Link href={`/assets/${asset.id}`} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                    Detail
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AssetActionRequiredTable({ data }: AssetDashboardPageProps) {
  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="p-5">
        <CardTitle className="text-xl">Aset Perlu Tindak Lanjut</CardTitle>
        <CardDescription>Maksimal 10 aset dengan issue prioritas tertinggi.</CardDescription>
      </CardHeader>
      <CardContent className="p-5 pt-0">
        {data.actionRequired.length === 0 ? (
          <EmptyState title="Tidak ada aset bermasalah" description="Tidak ada tindak lanjut prioritas untuk filter ini." />
        ) : (
          <DataTable minWidth="980px">
            <table className={tableClassName}>
              <thead className={tableHeadClassName}>
                <tr>
                  <th className={tableHeaderCellClassName}>Kode Aset</th>
                  <th className={tableHeaderCellClassName}>Nama Aset</th>
                  <th className={tableHeaderCellClassName}>Jenis</th>
                  <th className={tableHeaderCellClassName}>Pemilik</th>
                  <th className={tableHeaderCellClassName}>Pemakai</th>
                  <th className={tableHeaderCellClassName}>Issue</th>
                  <th className={tableHeaderCellClassName}>Prioritas</th>
                  <th className={tableHeaderCellClassName}>Aksi</th>
                </tr>
              </thead>
              <tbody className={tableBodyClassName}>
                {data.actionRequired.map((asset) => (
                  <tr key={asset.id} className={tableRowClassName}>
                    <td className={tableCellClassName}>{asset.code ?? "-"}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{asset.name}</td>
                    <td className={tableCellClassName}>{labelFromMap(asset.assetType, assetTypeLabels)}</td>
                    <td className={tableCellClassName}>{asset.ownedByOrganizationName ?? "-"}</td>
                    <td className={tableCellClassName}>{asset.usedByOrganizationName ?? "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {asset.issues.slice(0, 3).map((issue) => (
                          <StatusBadge key={issue.code} tone={severityTone[issue.severity]}>{issue.label}</StatusBadge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={severityTone[asset.priority]}>{asset.priority}</StatusBadge>
                    </td>
                     <td className="px-4 py-3">
                       <Link
                         href={`/assets/${asset.id}`}
                         className="inline-flex items-center justify-center rounded-md border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                         title="Detail Aset"
                       >
                         <Eye className="h-4 w-4" />
                       </Link>
                     </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTable>
        )}
      </CardContent>
    </Card>
  );
}

export function AssetDashboardPage({ data }: AssetDashboardPageProps) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
      <PageHeader
        eyebrow="Aset"
        title="Dashboard Aset"
        description="Ringkasan aset, kesehatan data, nilai, lokasi, dan tindak lanjut."
      />
      <AssetDashboardFilters data={data} />
      <AssetSummaryCards data={data} />
      <AssetCompositionSection data={data} />
      <AssetDataHealthSection data={data} />
      <AssetLocationHealthSection data={data} />
      <AssetActionRequiredTable data={data} />
    </main>
  );
}
