import Link from "next/link";
import { AlertCircle, Clock3, Filter, Info } from "lucide-react";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { taxAssetDepreciation, taxDepreciationGroups } from "@/db/schema";
import { auditPageView } from "@/lib/audit";
import { assetTypeLabels, formatRupiah, labelFromMap } from "@/lib/formatters";
import { listAssetReportBaseRows } from "@/lib/reports";
import { requireAuthenticatedScope } from "@/lib/server-guards";

type DepreciationPageProps = {
  searchParams?: Promise<{
    year?: string;
    level?: string;
    type?: string;
    status?: string;
    acquisitionYear?: string;
  }>;
};

type DepreciationRecord = {
  assetId: string;
  depreciationGroupId: string;
  taxYear: number;
  acquisitionValue: string;
  annualDepreciation: string;
  accumulatedDepreciation: string;
  bookValue: string;
  status: string;
  groupName: string | null;
  groupCode: string | null;
};

function numberValue(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function yearValue(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getFullYear();
}

function depreciationRate(assetType: string) {
  if (assetType === "tanah") return 0;
  if (assetType === "bangunan") return 0.05;
  return 0.25;
}

function fallbackGroup(assetType: string) {
  if (assetType === "tanah") return "Tidak disusutkan";
  if (assetType === "bangunan") return "Bangunan - Garis Lurus";
  if (assetType === "kendaraan") return "Kendaraan - Garis Lurus";
  return "Benda - Garis Lurus";
}

function formatCompact(value: number) {
  return formatRupiah(value);
}

function SelectFilter({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="space-y-2">
      <span className="block text-xs font-bold uppercase text-slate-400">{label}</span>
      <select
        name={name}
        defaultValue={value}
        className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatCard({
  label,
  value,
  description,
  tone = "slate",
}: {
  label: string;
  value: string;
  description: string;
  tone?: "slate" | "rose" | "emerald";
}) {
  const toneClass = {
    slate: "text-slate-950",
    rose: "text-rose-700",
    emerald: "text-emerald-700",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
      <p className={`mt-3 text-2xl font-black tracking-tight ${toneClass[tone]}`}>{value}</p>
      <p className="mt-3 text-sm text-slate-500">{description}</p>
    </div>
  );
}

export default async function DepreciationPage({ searchParams }: DepreciationPageProps) {
  const params = await searchParams;
  const currentYear = new Date().getFullYear();
  const selectedYear = Number(params?.year ?? currentYear) || currentYear;
  const selectedLevel = params?.level ?? "all";
  const selectedType = params?.type ?? "all";
  const selectedStatus = params?.status ?? "all";
  const selectedAcquisitionYear = params?.acquisitionYear ?? "all";

  const { user, scope } = await requireAuthenticatedScope("asset.read");
  const assets = await listAssetReportBaseRows(scope);
  const assetIds = assets.map((asset) => asset.id);
  const depreciationRows: DepreciationRecord[] =
    assetIds.length > 0
      ? ((await db
          .select({
            assetId: taxAssetDepreciation.assetId,
            depreciationGroupId: taxAssetDepreciation.depreciationGroupId,
            taxYear: taxAssetDepreciation.taxYear,
            acquisitionValue: taxAssetDepreciation.acquisitionValue,
            annualDepreciation: taxAssetDepreciation.annualDepreciation,
            accumulatedDepreciation: taxAssetDepreciation.accumulatedDepreciation,
            bookValue: taxAssetDepreciation.bookValue,
            status: taxAssetDepreciation.status,
            groupName: taxDepreciationGroups.name,
            groupCode: taxDepreciationGroups.code,
          })
          .from(taxAssetDepreciation)
          .leftJoin(taxDepreciationGroups, eq(taxAssetDepreciation.depreciationGroupId, taxDepreciationGroups.id))
          .where(and(eq(taxAssetDepreciation.taxYear, selectedYear), inArray(taxAssetDepreciation.assetId, assetIds)))) as DepreciationRecord[])
      : [];

  await auditPageView(user.id, {
    entity: "asset",
    view: "depreciation",
    metadata: { year: selectedYear, count: assets.length },
  });

  const depreciationByAsset = new Map(depreciationRows.map((row) => [row.assetId, row]));
  const acquisitionYears = [...new Set(assets.map((asset) => yearValue(asset.acquisitionDate)).filter((year): year is number => Boolean(year)))]
    .sort((a, b) => b - a)
    .map((year) => ({ value: String(year), label: String(year) }));

  const rows = assets
    .filter((asset) => selectedLevel === "all" || asset.ownershipLevel === selectedLevel)
    .filter((asset) => selectedType === "all" || asset.assetType === selectedType)
    .filter((asset) => selectedStatus === "all" || (depreciationByAsset.get(asset.id)?.status ?? "simulasi") === selectedStatus)
    .filter((asset) => selectedAcquisitionYear === "all" || String(yearValue(asset.acquisitionDate)) === selectedAcquisitionYear)
    .map((asset) => {
      const record = depreciationByAsset.get(asset.id);
      const acquisitionValue = numberValue(record?.acquisitionValue ?? asset.acquisitionValue);
      const acquiredYear = yearValue(asset.acquisitionDate) ?? selectedYear;
      const elapsedYears = Math.max(0, selectedYear - acquiredYear + 1);
      const annualDepreciation = record ? numberValue(record.annualDepreciation) : acquisitionValue * depreciationRate(asset.assetType);
      const accumulatedDepreciation = record ? numberValue(record.accumulatedDepreciation) : Math.min(acquisitionValue, annualDepreciation * elapsedYears);
      const bookValue = record ? numberValue(record.bookValue) : Math.max(0, acquisitionValue - accumulatedDepreciation);

      return {
        ...asset,
        acquisitionYear: acquiredYear,
        acquisitionValue,
        annualDepreciation,
        accumulatedDepreciation,
        bookValue,
        groupName: record?.groupName ?? fallbackGroup(asset.assetType),
        depreciationStatus: record?.status ?? (asset.assetType === "tanah" ? "bebas_depresiasi" : "simulasi"),
        hasRule: Boolean(record),
      };
    });

  const totalAcquisition = rows.reduce((sum, row) => sum + row.acquisitionValue, 0);
  const totalAccumulated = rows.reduce((sum, row) => sum + row.accumulatedDepreciation, 0);
  const totalBookValue = rows.reduce((sum, row) => sum + row.bookValue, 0);
  const noRuleCount = rows.filter((row) => !row.hasRule || row.depreciationStatus === "bebas_depresiasi").length;
  const yearLinks = Array.from({ length: 9 }, (_, index) => currentYear - 4 + index);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
      <section className="overflow-hidden rounded-xl bg-gradient-to-br from-orange-600 via-orange-700 to-amber-700 text-white shadow-sm">
        <div className="grid gap-8 p-6 lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-wide">
              <Clock3 className="h-4 w-4" />
              Simulasi & Kalkulasi Depresiasi Akhir Tahun
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">Depresiasi untuk Tahun {selectedYear}</h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-orange-50">
              Pilih tahun laporan untuk mensimulasikan nilai penyusutan historis. Sistem menghitung akumulasi penyusutan serta nilai buku bersih untuk kategori aset yang relevan.
            </p>
          </div>
          <div className="rounded-xl bg-white/10 p-4 ring-1 ring-white/10">
            <p className="text-xs font-black uppercase tracking-wide text-orange-50">Tahun depresiasi akhir tahun:</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {yearLinks.map((year) => (
                <Link
                  key={year}
                  href={`/depreciation?year=${year}`}
                  className={`rounded-lg px-4 py-2 text-sm font-black transition ${
                    year === selectedYear ? "bg-white text-orange-700 shadow-sm" : "bg-black/10 text-white hover:bg-white/15"
                  }`}
                >
                  {year}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
        <div className="flex gap-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div className="text-sm leading-6">
            <p className="font-bold">Hukum & Kebijakan Finansial Keuskupan (PGDP):</p>
            <p>
              Aset tanah tidak dikenakan depresiasi/penyusutan. Aset bangunan bersejarah cagar budaya juga dapat dibebaskan dari depresiasi finansial guna menjaga keaslian nilai taksiran sejarahnya.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <StatCard label={`Total perolehan (${selectedYear})`} value={formatCompact(totalAcquisition)} description="Nilai historis aset yang dimiliki" />
        <StatCard label="Akumulasi penyusutan" value={formatCompact(totalAccumulated)} description={`Total depresiasi hingga ${selectedYear}`} tone="rose" />
        <StatCard label="Nilai buku bersih (NBV)" value={formatCompact(totalBookValue)} description={`Sisa nilai buku di akhir ${selectedYear}`} tone="emerald" />
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
          <p className="text-xs font-bold uppercase text-rose-700">Aset belum aturan</p>
          <p className="mt-3 text-2xl font-black text-rose-950">{noRuleCount} <span className="text-base font-medium">Aset</span></p>
          <p className="mt-3 text-sm font-semibold text-rose-600">Bebas depresiasi / belum ada record</p>
        </div>
      </section>

      <form className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <input type="hidden" name="year" value={selectedYear} />
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <Filter className="h-5 w-5 text-orange-600" />
          <h2 className="text-base font-black uppercase tracking-wide text-slate-800">Filter Laporan Depresiasi</h2>
          <button className="ml-auto rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700">Terapkan</button>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <SelectFilter label="Tingkatan organisasi" name="level" value={selectedLevel} options={[{ value: "all", label: "Semua Tingkat" }, { value: "keuskupan", label: "Keuskupan" }, { value: "badan_hukum", label: "Badan hukum" }]} />
          <SelectFilter label="Jenis kategori aset" name="type" value={selectedType} options={[{ value: "all", label: "Semua Jenis" }, ...Object.entries(assetTypeLabels).map(([value, label]) => ({ value, label }))]} />
          <SelectFilter label="Status aturan depresiasi" name="status" value={selectedStatus} options={[{ value: "all", label: "Semua Status" }, { value: "active", label: "Aktif" }, { value: "simulasi", label: "Simulasi" }, { value: "bebas_depresiasi", label: "Bebas depresiasi" }]} />
          <SelectFilter label="Tahun perolehan" name="acquisitionYear" value={selectedAcquisitionYear} options={[{ value: "all", label: "Semua Tahun" }, ...acquisitionYears]} />
        </div>
      </form>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
          <h2 className="font-black text-slate-900">Daftar Aset & rincian penyusutan per-item pada akhir tahun <span className="text-orange-700">{selectedYear}</span></h2>
          <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{rows.length} Aset Terdaftar & Diperoleh</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
              <tr>
                <th className="px-5 py-4">Nama Item</th>
                <th className="px-5 py-4">Tahun Perolehan</th>
                <th className="px-5 py-4">Kelompok Depresiasi</th>
                <th className="px-5 py-4 text-right">Nilai Perolehan</th>
                <th className="px-5 py-4 text-right text-rose-700">Penyusutan THN Ini</th>
                <th className="px-5 py-4 text-right">Akumulasi</th>
                <th className="px-5 py-4 text-right text-emerald-700">Nilai Buku Bersih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                    Belum ada data aset sesuai filter.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-950">{row.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{row.code} · {labelFromMap(row.assetType, assetTypeLabels)}</p>
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-700">{row.acquisitionYear}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-bold ${row.hasRule ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        {row.groupName}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-slate-700">{formatRupiah(row.acquisitionValue)}</td>
                    <td className="px-5 py-4 text-right font-bold text-rose-700">{formatRupiah(row.annualDepreciation)}</td>
                    <td className="px-5 py-4 text-right font-semibold text-slate-700">{formatRupiah(row.accumulatedDepreciation)}</td>
                    <td className="px-5 py-4 text-right font-black text-emerald-700">{formatRupiah(row.bookValue)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {depreciationRows.length === 0 ? (
        <section className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          Data detail depresiasi tahun {selectedYear} belum ditemukan, sehingga angka ditampilkan sebagai simulasi berbasis jenis aset dan nilai perolehan.
        </section>
      ) : null}
    </main>
  );
}
