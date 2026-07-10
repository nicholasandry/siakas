import Link from "next/link";
import type { ReactNode } from "react";

import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auditPageView } from "@/lib/audit";
import { assetBuildingCategoryLabels } from "@/lib/asset-building-categories";
import { assetItemCategoryLabels } from "@/lib/asset-item-categories";
import { assetVehicleCategoryLabels } from "@/lib/asset-vehicle-categories";
import { assetTypeConfigs, type AssetType } from "@/lib/asset-types";
import { isActiveOperationalAssetStatus } from "@/lib/assets/status";
import { formatRupiah } from "@/lib/formatters";
import {
  listBuildingReportRows,
  listItemReportRows,
  listAssetRelationshipReportRows,
  listLandReportRows,
  listVehicleReportRows,
  type AssetReportBaseRow,
  type AssetRelationshipReportRow,
  type AssetRelationReportType,
  type AssetReportType,
} from "@/lib/reports";
import type { AccessScope } from "@/lib/scope";
import { requireAuthenticatedScope } from "@/lib/server-guards";

type AssetTypeReportPageProps = {
  assetType: AssetType;
};

function numberValue(value: string | number | Date | null | undefined) {
  if (value instanceof Date) return 0;
  const parsed = Number(value ?? 0);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function dateValue(value: string | number | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatSquareMeters(value: number) {
  return `${Math.round(value).toLocaleString("id-ID")} m²`;
}

function formatCount(value: number) {
  return value.toLocaleString("id-ID");
}

type ChartDatum = {
  label: string;
  value: number;
};

const chartColors = ["#059669", "#0f766e", "#16a34a", "#84cc16", "#64748b", "#94a3b8", "#a3e635", "#22c55e", "#475569"];

function normalizeLabel(value: string | number | Date | null | undefined, fallback = "Tidak diketahui") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function normalizeItemCategoryLabel(value: string | number | Date | null | undefined) {
  const normalized = normalizeLabel(value, "Tidak diketahui");
  return assetItemCategoryLabels[normalized] ?? normalized;
}

function normalizeVehicleCategoryLabel(value: string | number | Date | null | undefined) {
  const normalized = normalizeLabel(value, "Tidak diketahui");
  return assetVehicleCategoryLabels[normalized] ?? normalized;
}

function normalizeBuildingCategoryLabel(value: string | number | Date | null | undefined) {
  const normalized = normalizeLabel(value, "Tidak diketahui");
  return assetBuildingCategoryLabels[normalized] ?? normalized;
}

function topItems(rows: ChartDatum[], limit = 8) {
  const sorted = rows.filter((row) => row.value > 0).sort((a, b) => b.value - a.value);
  if (sorted.length <= limit) return sorted;

  const visible = sorted.slice(0, limit);
  const other = sorted.slice(limit).reduce((sum, row) => sum + row.value, 0);
  const existingOther = visible.find((row) => row.label === "Lainnya");
  if (existingOther) {
    return visible.map((row) => (row.label === "Lainnya" ? { ...row, value: row.value + other } : row));
  }

  return [...visible, { label: "Lainnya", value: other }];
}

function chartKey(row: ChartDatum, index: number) {
  return `${row.label}-${index}`;
}

function aggregateRows<T>(rows: T[], getLabel: (row: T) => string, getValue: (row: T) => number = () => 1, limit = 8) {
  const map = new Map<string, number>();

  for (const row of rows) {
    const label = getLabel(row);
    map.set(label, (map.get(label) ?? 0) + getValue(row));
  }

  return topItems([...map.entries()].map(([label, value]) => ({ label, value })), limit);
}

function EmptyChartState() {
  return <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">Belum ada data.</div>;
}

function ReportChartCard({ title, children, description }: { title: string; children: ReactNode; description?: string }) {
  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="p-5">
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="p-5 pt-0">{children}</CardContent>
    </Card>
  );
}

function DonutChart({ rows, format = formatCount }: { rows: ChartDatum[]; format?: (value: number) => string }) {
  const data = topItems(rows);
  const total = data.reduce((sum, row) => sum + row.value, 0);
  if (total <= 0) return <EmptyChartState />;

  let offset = 0;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="grid gap-4 sm:grid-cols-[160px_1fr] sm:items-center">
      <svg viewBox="0 0 120 120" className="mx-auto h-40 w-40 -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="18" />
        {data.map((row, index) => {
          const dash = (row.value / total) * circumference;
          const segment = (
            <circle
              key={chartKey(row, index)}
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={chartColors[index % chartColors.length]}
              strokeWidth="18"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="round"
            />
          );
          offset += dash;
          return segment;
        })}
      </svg>
      <div className="space-y-2">
        {data.map((row, index) => (
          <div key={chartKey(row, index)} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 text-slate-700">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
              <span className="truncate">{row.label}</span>
            </span>
            <span className="shrink-0 font-medium text-slate-900">{format(row.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HorizontalBarChart({ rows, format = formatCount }: { rows: ChartDatum[]; format?: (value: number) => string }) {
  const data = topItems(rows);
  const max = Math.max(0, ...data.map((row) => row.value));
  if (max <= 0) return <EmptyChartState />;

  return (
    <div className="space-y-3">
      {data.map((row, index) => (
        <div key={chartKey(row, index)} className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-medium text-slate-700">{row.label}</span>
            <span className="shrink-0 text-slate-500">{format(row.value)}</span>
          </div>
          <div className="h-3 rounded-full bg-slate-100">
            <div className="h-3 rounded-full" style={{ width: `${Math.max(4, (row.value / max) * 100)}%`, backgroundColor: chartColors[index % chartColors.length] }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function LineChart({ rows }: { rows: ChartDatum[] }) {
  const data = rows.filter((row) => row.value > 0).sort((a, b) => Number(a.label) - Number(b.label));
  if (data.length === 0) return <EmptyChartState />;

  const width = 520;
  const height = 180;
  const pad = 28;
  const max = Math.max(1, ...data.map((row) => row.value));
  const xStep = data.length === 1 ? 0 : (width - pad * 2) / (data.length - 1);
  const points = data.map((row, index) => {
    const x = pad + index * xStep;
    const y = height - pad - (row.value / max) * (height - pad * 2);
    return { ...row, x, y };
  });
  const d = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");

  return (
    <div className="space-y-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full">
        <path d={d} fill="none" stroke="#059669" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d={`${d} L ${points[points.length - 1].x} ${height - pad} L ${points[0].x} ${height - pad} Z`} fill="#059669" opacity="0.12" />
        {points.map((point) => (
          <circle key={point.label} cx={point.x} cy={point.y} r="4" fill="#059669" />
        ))}
      </svg>
      <div className="flex flex-wrap gap-2 text-xs text-slate-500">
        {data.map((row) => (
          <span key={row.label} className="rounded-full bg-slate-100 px-2 py-1">{row.label}: {formatCount(row.value)}</span>
        ))}
      </div>
    </div>
  );
}

function ProgressMetric({ label, value, total }: { label: string; value: number; total: number }) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500">{value}/{total}</span>
      </div>
      <div className="h-3 rounded-full bg-slate-100">
        <div className="h-3 rounded-full bg-emerald-600" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function AssetStatusDonutChart({ rows }: { rows: ReportRow[] }) {
  return <DonutChart rows={aggregateRows(rows, (row) => normalizeLabel(row.status))} />;
}

function AssetConditionDonutChart({ rows }: { rows: ReportRow[] }) {
  return <DonutChart rows={aggregateRows(rows, (row) => normalizeLabel(row.condition))} />;
}

function AcquisitionValueBarChart({ rows, groupBy }: { rows: ReportRow[]; groupBy: (row: ReportRow) => string }) {
  return <HorizontalBarChart rows={aggregateRows(rows, groupBy, (row) => numberValue(row.acquisitionValue))} format={formatRupiah} />;
}

function AssetByUnitBarChart({ rows }: { rows: ReportRow[] }) {
  return <HorizontalBarChart rows={aggregateRows(rows, (row) => normalizeLabel(row.unitName ?? row.badanHukumName, "Tanpa pengguna"))} />;
}

function AssetGrowthLineChart({ rows }: { rows: ReportRow[] }) {
  return (
    <LineChart
      rows={aggregateRows(
        rows.filter((row) => dateValue(row.acquisitionDate)),
        (row) => String(dateValue(row.acquisitionDate)?.getFullYear() ?? ""),
        () => 1,
        20
      )}
    />
  );
}

function AssetValueByYearBarChart({ rows }: { rows: ReportRow[] }) {
  return (
    <HorizontalBarChart
      rows={aggregateRows(
        rows.filter((row) => dateValue(row.acquisitionDate)),
        (row) => String(dateValue(row.acquisitionDate)?.getFullYear() ?? ""),
        (row) => numberValue(row.acquisitionValue),
        20
      )}
      format={formatRupiah}
    />
  );
}

function isPresent(value: string | number | Date | null | undefined) {
  return value !== null && value !== undefined && value !== "";
}

function daysUntil(value: string | number | Date | null | undefined) {
  const date = dateValue(value);
  if (!date) return null;
  const now = new Date();
  return Math.ceil((date.getTime() - now.getTime()) / 86_400_000);
}

function AlertMetricCard({ title, items }: { title: string; items: { label: string; value: number; tone?: "danger" | "warning" | "neutral" }[] }) {
  const toneClass = {
    danger: "border-rose-200 bg-rose-50 text-rose-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    neutral: "border-slate-200 bg-slate-50 text-slate-700",
  };

  return (
    <ReportChartCard title={title}>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.label} className={`rounded-xl border p-4 ${toneClass[item.tone ?? "neutral"]}`}>
            <p className="text-sm font-medium">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold">{item.value}</p>
          </div>
        ))}
      </div>
    </ReportChartCard>
  );
}

function insightSentence(rows: ReportRow[], relationRows: AssetRelationshipReportRow[], assetType: AssetReportType) {
  if (rows.length === 0) return "Belum ada data untuk dianalisis pada laporan ini.";

  const totalValue = rows.reduce((sum, row) => sum + numberValue(row.acquisitionValue), 0);
  const missingOwner = rows.filter((row) => !relationRows.some((relation) => relation.assetId === row.id && relation.relationType === "owned_by")).length;
  const missingUser = rows.filter((row) => !relationRows.some((relation) => relation.assetId === row.id && relation.relationType === "used_by")).length;
  const largestUnit = aggregateRows(rows, (row) => normalizeLabel(row.unitName ?? row.badanHukumName, "Tanpa pengguna"))[0];

  if (assetType === "tanah") {
    const totalArea = rows.reduce((sum, row) => sum + numberValue(row.areaSquareMeters), 0);
    const missingCoordinate = rows.filter((row) => !isPresent(row.latitude) || !isPresent(row.longitude)).length;
    return `Portofolio tanah mencakup ${formatSquareMeters(totalArea)} dengan nilai perolehan ${formatRupiah(totalValue)}. ${missingCoordinate} bidang belum memiliki koordinat, sehingga prioritas data ada pada validasi lokasi dan batas.`;
  }

  if (assetType === "bangunan") {
    const missingLand = rows.filter((row) => !isPresent(row.mainLandAssetId)).length;
    const missingPermit = rows.filter((row) => !isPresent(row.permitNumber)).length;
    return `Bangunan paling banyak terkait dengan ${largestUnit?.label ?? "unit belum diketahui"}. ${missingLand} bangunan belum terhubung ke tanah utama dan ${missingPermit} belum memiliki nomor izin, sehingga insight utama adalah risiko legalitas dan keterlacakan lokasi.`;
  }

  if (assetType === "kendaraan") {
    const overdue = rows.filter((row) => {
      const taxDays = daysUntil(row.taxDueAt);
      const stnkDays = daysUntil(row.stnkExpiredAt);
      return (taxDays !== null && taxDays < 0) || (stnkDays !== null && stnkDays < 0);
    }).length;
    return `${overdue} kendaraan memiliki pajak atau STNK lewat masa berlaku. Nilai portofolio ${formatRupiah(totalValue)} perlu dibaca bersama status operasional agar keputusan perawatan, pajak, atau disposal lebih tepat.`;
  }

  const totalQuantity = rows.reduce((sum, row) => sum + (numberValue(row.quantity) || 1), 0);
  const missingDocument = rows.filter((row) => !isPresent(row.evidenceDocumentNumber) && !isPresent(row.documentStatus)).length;
  return `Laporan benda mencatat ${formatCount(totalQuantity)} unit/item dengan nilai perolehan ${formatRupiah(totalValue)}. ${missingDocument} baris belum kuat dari sisi dokumen bukti, sementara ${missingOwner + missingUser} relasi pemilik/pengguna masih perlu dirapikan.`;
}

function conclusionItems(rows: ReportRow[], relationRows: AssetRelationshipReportRow[], assetType: AssetReportType) {
  const missingOwner = rows.filter((row) => !relationRows.some((relation) => relation.assetId === row.id && relation.relationType === "owned_by")).length;
  const missingUser = rows.filter((row) => !relationRows.some((relation) => relation.assetId === row.id && relation.relationType === "used_by")).length;
  const conclusions = [
    missingOwner > 0 ? `${missingOwner} aset perlu dilengkapi relasi pemilik agar akuntabilitas legal lebih jelas.` : "Relasi pemilik sudah tercatat untuk seluruh aset pada cakupan ini.",
    missingUser > 0 ? `${missingUser} aset perlu dilengkapi pengguna/penanggung jawab agar pemantauan operasional lebih mudah.` : "Relasi pengguna sudah tercatat untuk seluruh aset pada cakupan ini.",
  ];

  if (assetType === "tanah") {
    conclusions.push(rows.some((row) => !isPresent(row.latitude) || !isPresent(row.longitude)) ? "Prioritas berikutnya adalah melengkapi koordinat dan batas tanah untuk memperkuat kontrol fisik aset." : "Data koordinat tanah sudah cukup kuat untuk pemantauan lokasi.");
  } else if (assetType === "bangunan") {
    conclusions.push(rows.some((row) => !isPresent(row.mainLandAssetId)) ? "Relasi bangunan ke tanah utama perlu dibereskan sebelum laporan legalitas dianggap lengkap." : "Relasi bangunan dan tanah utama sudah siap menjadi dasar analisis legalitas.");
  } else if (assetType === "kendaraan") {
    conclusions.push(rows.some((row) => (daysUntil(row.taxDueAt) ?? 1) < 0 || (daysUntil(row.stnkExpiredAt) ?? 1) < 0) ? "Kendaraan dengan pajak/STNK lewat masa berlaku perlu menjadi daftar tindak lanjut terdekat." : "Tidak ada pajak atau STNK yang terdeteksi lewat masa berlaku.");
  } else {
    conclusions.push(rows.some((row) => !isPresent(row.evidenceDocumentNumber) && !isPresent(row.documentStatus)) ? "Dokumen bukti benda masih perlu dirapikan agar inventaris lebih siap diaudit." : "Dokumen bukti benda sudah tercatat baik pada cakupan laporan ini.");
  }

  return conclusions;
}

function InsightPanel({ rows, relationRows, assetType }: { rows: ReportRow[]; relationRows: AssetRelationshipReportRow[]; assetType: AssetReportType }) {
  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="p-5">
        <CardTitle className="text-xl">Insight &amp; kesimpulan</CardTitle>
        <CardDescription>{insightSentence(rows, relationRows, assetType)}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 p-5 pt-0 md:grid-cols-3">
        {conclusionItems(rows, relationRows, assetType).map((item) => (
          <div key={item} className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            {item}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function CommonCharts({ rows }: { rows: ReportRow[] }) {
  return (
    <>
      <ReportChartCard title="Komposisi status aset">
        <AssetStatusDonutChart rows={rows} />
      </ReportChartCard>
      <ReportChartCard title="Kondisi aset">
        <AssetConditionDonutChart rows={rows} />
      </ReportChartCard>
      <ReportChartCard title="Pertambahan aset per tahun">
        <AssetGrowthLineChart rows={rows} />
      </ReportChartCard>
      <ReportChartCard title="Nilai perolehan per tahun">
        <AssetValueByYearBarChart rows={rows} />
      </ReportChartCard>
    </>
  );
}

function LandCharts({ rows }: { rows: ReportRow[] }) {
  const withCoordinate = rows.filter((row) => isPresent(row.latitude) && isPresent(row.longitude)).length;

  return (
    <>
      <ReportChartCard title="Nilai perolehan per pemilik">
        <AcquisitionValueBarChart rows={rows} groupBy={(row) => normalizeLabel(row.badanHukumName ?? row.ownerName, "Belum ada pemilik")} />
      </ReportChartCard>
      <ReportChartCard title="Luas tanah berdasarkan pemilik">
        <HorizontalBarChart rows={aggregateRows(rows, (row) => normalizeLabel(row.badanHukumName ?? row.ownerName, "Belum ada pemilik"), (row) => numberValue(row.areaSquareMeters))} format={formatSquareMeters} />
      </ReportChartCard>
      <ReportChartCard title="Jenis sertifikat">
        <DonutChart rows={aggregateRows(rows, (row) => normalizeLabel(row.certificateType, "Belum bersertifikat"))} />
      </ReportChartCard>
      <ReportChartCard title="Peruntukan tanah">
        <HorizontalBarChart rows={aggregateRows(rows, (row) => normalizeLabel(row.landUse, "Tidak diketahui"), (row) => numberValue(row.areaSquareMeters))} format={formatSquareMeters} />
      </ReportChartCard>
      <ReportChartCard title="Metode perolehan tanah">
        <DonutChart rows={aggregateRows(rows, (row) => normalizeLabel(row.acquisitionMethod, "Tidak diketahui"))} />
      </ReportChartCard>
      <ReportChartCard title="Status sengketa">
        <HorizontalBarChart rows={aggregateRows(rows, (row) => normalizeLabel(row.disputeStatus, "Tidak diketahui"))} />
      </ReportChartCard>
      <AlertMetricCard
        title="Kelengkapan koordinat"
        items={[
          { label: "Punya koordinat", value: withCoordinate, tone: "neutral" },
          { label: "Belum punya koordinat", value: rows.length - withCoordinate, tone: rows.length - withCoordinate > 0 ? "warning" : "neutral" },
        ]}
      />
    </>
  );
}

function BuildingCharts({ rows }: { rows: ReportRow[] }) {
  return (
    <>
      <ReportChartCard title="Luas bangunan berdasarkan pengguna">
        <HorizontalBarChart rows={aggregateRows(rows, (row) => normalizeLabel(row.unitName ?? row.badanHukumName, "Tanpa pengguna"), (row) => numberValue(row.buildingAreaSquareMeters))} format={formatSquareMeters} />
      </ReportChartCard>
      <ReportChartCard title="Jenis bangunan">
        <DonutChart rows={aggregateRows(rows, (row) => normalizeLabel(row.buildingType, "Tidak diketahui"))} />
      </ReportChartCard>
      <ReportChartCard title="Kategori bangunan">
        <DonutChart rows={aggregateRows(rows, (row) => normalizeBuildingCategoryLabel(row.buildingCategory))} />
      </ReportChartCard>
      <ReportChartCard title="Struktur bangunan">
        <HorizontalBarChart rows={aggregateRows(rows, (row) => normalizeLabel(row.structureType, "Tidak diketahui"))} />
      </ReportChartCard>
      <ReportChartCard title="Biaya perawatan tahunan">
        <HorizontalBarChart rows={aggregateRows(rows, (row) => normalizeLabel(row.maintenanceResponsibleName, "Tidak diketahui"), (row) => numberValue(row.maintenanceAnnualCost))} format={formatRupiah} />
      </ReportChartCard>
      <ReportChartCard title="Tahun pembangunan">
        <HorizontalBarChart rows={aggregateRows(rows, (row) => normalizeLabel(row.constructionYear, "Tidak diketahui"), () => 1, 20)} />
      </ReportChartCard>
      <ReportChartCard title="Kelengkapan legalitas">
        <div className="space-y-4">
          <ProgressMetric label="Nomor izin" value={rows.filter((row) => isPresent(row.permitNumber)).length} total={rows.length} />
          <ProgressMetric label="Nomor SLF" value={rows.filter((row) => isPresent(row.slfNumber)).length} total={rows.length} />
          <ProgressMetric label="Tanah utama" value={rows.filter((row) => isPresent(row.mainLandAssetId)).length} total={rows.length} />
        </div>
      </ReportChartCard>
    </>
  );
}

function VehicleCharts({ rows }: { rows: ReportRow[] }) {
  const stnkDueSoon = rows.filter((row) => {
    const days = daysUntil(row.stnkExpiredAt);
    return days !== null && days >= 0 && days <= 30;
  }).length;
  const stnkOverdue = rows.filter((row) => {
    const days = daysUntil(row.stnkExpiredAt);
    return days !== null && days < 0;
  }).length;
  const taxDueSoon = rows.filter((row) => {
    const days = daysUntil(row.taxDueAt);
    return days !== null && days >= 0 && days <= 30;
  }).length;
  const taxOverdue = rows.filter((row) => {
    const days = daysUntil(row.taxDueAt);
    return days !== null && days < 0;
  }).length;

  return (
    <>
      <ReportChartCard title="Kategori kendaraan">
        <DonutChart rows={aggregateRows(rows, (row) => normalizeVehicleCategoryLabel(row.vehicleCategory))} />
      </ReportChartCard>
      <ReportChartCard title="Kendaraan berdasarkan merek">
        <HorizontalBarChart rows={aggregateRows(rows, (row) => normalizeLabel(row.brand, "Tidak diketahui"))} />
      </ReportChartCard>
      <ReportChartCard title="Tahun pembuatan">
        <HorizontalBarChart rows={aggregateRows(rows, (row) => normalizeLabel(row.manufactureYear, "Tidak diketahui"), () => 1, 20)} />
      </ReportChartCard>
      <AlertMetricCard
        title="Status pajak dan STNK"
        items={[
          { label: "STNK 30 hari", value: stnkDueSoon, tone: "warning" },
          { label: "STNK lewat", value: stnkOverdue, tone: "danger" },
          { label: "Pajak 30 hari", value: taxDueSoon, tone: "warning" },
          { label: "Pajak lewat", value: taxOverdue, tone: "danger" },
        ]}
      />
      <ReportChartCard title="Status operasional">
        <DonutChart rows={aggregateRows(rows, (row) => normalizeLabel(row.operationalStatus, "Tidak diketahui"))} />
      </ReportChartCard>
      <ReportChartCard title="Kelengkapan dokumen kendaraan">
        <div className="space-y-4">
          <ProgressMetric label="Nomor STNK" value={rows.filter((row) => isPresent(row.stnkNumber)).length} total={rows.length} />
          <ProgressMetric label="Nomor BPKB" value={rows.filter((row) => isPresent(row.bpkbNumber)).length} total={rows.length} />
          <ProgressMetric label="Pemilik terdaftar" value={rows.filter((row) => isPresent(row.registeredOwnerName)).length} total={rows.length} />
        </div>
      </ReportChartCard>
    </>
  );
}

function ItemCharts({ rows }: { rows: ReportRow[] }) {
  return (
    <>
      <ReportChartCard title="Kategori benda">
        <HorizontalBarChart rows={aggregateRows(rows, (row) => normalizeItemCategoryLabel(row.itemCategory), (row) => numberValue(row.quantity) || 1)} />
      </ReportChartCard>
      <ReportChartCard title="Lokasi penyimpanan">
        <HorizontalBarChart rows={aggregateRows(rows, (row) => normalizeLabel(row.storageLocation, "Tidak diketahui"), (row) => numberValue(row.quantity) || 1)} />
      </ReportChartCard>
      <ReportChartCard title="Kondisi benda">
        <DonutChart rows={aggregateRows(rows, (row) => normalizeLabel(row.condition, "Tidak diketahui"))} />
      </ReportChartCard>
      <ReportChartCard title="Status dokumen benda">
        <DonutChart rows={aggregateRows(rows, (row) => normalizeLabel(row.documentStatus, "Tidak diketahui"), (row) => numberValue(row.quantity) || 1)} />
      </ReportChartCard>
      <ReportChartCard title="Nilai perolehan per kategori">
        <AcquisitionValueBarChart rows={rows} groupBy={(row) => normalizeItemCategoryLabel(row.itemCategory)} />
      </ReportChartCard>
      <ReportChartCard title="Jumlah berdasarkan penanggung jawab">
        <HorizontalBarChart rows={aggregateRows(rows, (row) => normalizeLabel(row.responsiblePerson, "Tidak diketahui"), (row) => numberValue(row.quantity) || 1)} />
      </ReportChartCard>
    </>
  );
}

function relationName(row: AssetRelationshipReportRow) {
  return row.unitName ?? row.badanHukumName ?? row.userName ?? row.notes ?? "Belum diisi";
}

function aggregateRelation(rows: AssetRelationshipReportRow[], relationType: AssetRelationReportType, metric: "count" | "value" = "count") {
  const map = new Map<string, number>();

  for (const row of rows.filter((item) => item.relationType === relationType)) {
    const label = relationName(row);
    const value = metric === "value" ? numberValue(row.acquisitionValue) : 1;
    map.set(label, (map.get(label) ?? 0) + value);
  }

  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}

function BarList({ title, rows, format = "count" }: { title: string; rows: { label: string; value: number }[]; format?: "count" | "money" }) {
  const max = Math.max(1, ...rows.map((row) => row.value));

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="p-5">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-5 pt-0">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada data.</p>
        ) : (
          rows.map((row) => (
            <div key={row.label} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-medium text-slate-700">{row.label}</span>
                <span className="shrink-0 text-slate-500">{format === "money" ? formatRupiah(row.value) : row.value}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${Math.max(4, (row.value / max) * 100)}%` }} />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

type ReportRow = AssetReportBaseRow & Record<string, string | number | Date | null>;

async function loadReportRows(assetType: AssetReportType, scope: AccessScope) {
  if (assetType === "tanah") return listLandReportRows(scope);
  if (assetType === "bangunan") return listBuildingReportRows(scope);
  if (assetType === "kendaraan") return listVehicleReportRows(scope);
  return listItemReportRows(scope);
}

export async function AssetTypeReportPage({ assetType }: AssetTypeReportPageProps) {
  const { user, scope } = await requireAuthenticatedScope("asset.read");
  const currentType = assetTypeConfigs.find((item) => item.type === assetType);
  const [rows, relationRows] = await Promise.all([
    loadReportRows(assetType, scope) as Promise<ReportRow[]>,
    listAssetRelationshipReportRows(scope, assetType),
  ]);

  await auditPageView(user.id, {
    entity: "asset",
    view: `report-${assetType}`,
    metadata: { count: rows.length },
  });

  const totalValue = rows.reduce((sum, row) => sum + numberValue(row.acquisitionValue), 0);
  const activeCount = rows.filter((row) => isActiveOperationalAssetStatus(row.status)).length;
  const missingOwnerCount = rows.filter((row) => !relationRows.some((relation) => relation.assetId === row.id && relation.relationType === "owned_by")).length;
  const missingUserCount = rows.filter((row) => !relationRows.some((relation) => relation.assetId === row.id && relation.relationType === "used_by")).length;
  const missingFinancierCount = rows.filter((row) => !relationRows.some((relation) => relation.assetId === row.id && relation.relationType === "financed_by")).length;
  const typeMetric =
    assetType === "tanah"
      ? { label: "Total luas tanah", value: `${rows.reduce((sum, row) => sum + numberValue(row.areaSquareMeters), 0).toLocaleString("id-ID")} m2` }
      : assetType === "bangunan"
        ? { label: "Total luas bangunan", value: `${rows.reduce((sum, row) => sum + numberValue(row.buildingAreaSquareMeters), 0).toLocaleString("id-ID")} m2` }
        : assetType === "kendaraan"
          ? { label: "Tidak digunakan", value: String(rows.filter((row) => row.status !== "active").length + missingUserCount) }
          : { label: "Total jumlah benda", value: rows.reduce((sum, row) => sum + numberValue(row.quantity), 0).toLocaleString("id-ID") };

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
      <PageHeader
        eyebrow="Laporan aset"
        title={`Laporan ${currentType?.label}`}
        actions={
          <Link href="/reports" className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Ringkasan
          </Link>
        }
      />

      <section className="grid gap-3 md:grid-cols-4">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="p-5">
            <CardDescription>Total data</CardDescription>
            <CardTitle className="text-2xl">{rows.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="p-5">
            <CardDescription>Aset aktif</CardDescription>
            <CardTitle className="text-2xl">{activeCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="p-5">
            <CardDescription>Nilai perolehan</CardDescription>
            <CardTitle className="text-2xl">{formatRupiah(totalValue)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="p-5">
            <CardDescription>{typeMetric.label}</CardDescription>
            <CardTitle className="text-2xl">{typeMetric.value}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="p-5">
            <CardDescription>Tanpa pemilik</CardDescription>
            <CardTitle className="text-2xl">{missingOwnerCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="p-5">
            <CardDescription>Tanpa pengguna</CardDescription>
            <CardTitle className="text-2xl">{missingUserCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="p-5">
            <CardDescription>Tanpa sumber dana</CardDescription>
            <CardTitle className="text-2xl">{missingFinancierCount}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <InsightPanel rows={rows} relationRows={relationRows} assetType={assetType} />

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Visualisasi Data</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {assetType === "tanah" ? (
            <>
              <ReportChartCard title="Komposisi status aset">
                <AssetStatusDonutChart rows={rows} />
              </ReportChartCard>
              <LandCharts rows={rows} />
            </>
          ) : null}
          {assetType === "bangunan" ? (
            <>
              <ReportChartCard title="Komposisi status aset">
                <AssetStatusDonutChart rows={rows} />
              </ReportChartCard>
              <ReportChartCard title="Nilai perolehan per sumber pembiayaan">
                <HorizontalBarChart rows={aggregateRelation(relationRows, "financed_by", "value")} format={formatRupiah} />
              </ReportChartCard>
              <BuildingCharts rows={rows} />
            </>
          ) : null}
          {assetType === "kendaraan" ? (
            <>
              <ReportChartCard title="Komposisi status aset">
                <AssetStatusDonutChart rows={rows} />
              </ReportChartCard>
              <VehicleCharts rows={rows} />
            </>
          ) : null}
          {assetType === "benda" ? (
            <>
              <ReportChartCard title="Komposisi status aset">
                <AssetStatusDonutChart rows={rows} />
              </ReportChartCard>
              <ItemCharts rows={rows} />
            </>
          ) : null}
        </div>
      </section>

    </main>
  );
}
