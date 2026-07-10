import Link from "next/link";

import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auditPageView } from "@/lib/audit";
import { assetTypeConfigs } from "@/lib/asset-types";
import { isActiveOperationalAssetStatus, isInactiveAssetStatus } from "@/lib/assets/status";
import { assetStatusLabels, assetTypeLabels, formatRupiah, labelFromMap } from "@/lib/formatters";
import { listAssetRelationshipReportRows, listAssetReportBaseRows, type AssetRelationshipReportRow, type AssetRelationReportType } from "@/lib/reports";
import { requireAuthenticatedScope } from "@/lib/server-guards";

function numberValue(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isNaN(parsed) ? 0 : parsed;
}

const relationLabels: Record<AssetRelationReportType, string> = {
  financed_by: "Dibiayai oleh",
  owned_by: "Dimiliki oleh",
  used_by: "Dipakai oleh",
  inputted_by: "Diinput oleh",
};

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

export default async function ReportsPage() {
  const { user, scope } = await requireAuthenticatedScope("asset.read");
  const [rows, relationRows] = await Promise.all([
    listAssetReportBaseRows(scope),
    listAssetRelationshipReportRows(scope),
  ]);

  await auditPageView(user.id, {
    entity: "asset",
    view: "reports",
    metadata: { count: rows.length },
  });

  const totalValue = rows.reduce((sum, row) => sum + numberValue(row.acquisitionValue), 0);
  const activeCount = rows.filter((row) => isActiveOperationalAssetStatus(row.status)).length;
  const attentionCount = rows.filter((row) =>
    [row.legalStatus, row.condition, row.status].some((value) => String(value ?? "").toLowerCase().includes("sengketa") || String(value ?? "").toLowerCase().includes("rusak"))
  ).length;

  const countsByType = new Map(assetTypeConfigs.map((item) => [item.type, rows.filter((row) => row.assetType === item.type)]));
  const countsByStatus = Object.entries(assetStatusLabels).map(([status, label]) => ({
    status,
    label,
    count: rows.filter((row) => row.status === status).length,
  }));
  const missingOwnerCount = rows.filter((row) => !relationRows.some((relation) => relation.assetId === row.id && relation.relationType === "owned_by")).length;
  const missingUserCount = rows.filter((row) => !relationRows.some((relation) => relation.assetId === row.id && relation.relationType === "used_by")).length;
  const missingFinancierCount = rows.filter((row) => !relationRows.some((relation) => relation.assetId === row.id && relation.relationType === "financed_by")).length;
  const largestType = assetTypeConfigs
    .map((item) => {
      const typeRows = countsByType.get(item.type) ?? [];
      return {
        label: labelFromMap(item.type, assetTypeLabels),
        count: typeRows.length,
        value: typeRows.reduce((sum, row) => sum + numberValue(row.acquisitionValue), 0),
      };
    })
    .sort((a, b) => b.value - a.value)[0];
  const relationIssueCount = missingOwnerCount + missingUserCount + missingFinancierCount;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
      <PageHeader eyebrow="Laporan" title="Reporting aset" />

      <section className="grid gap-3 md:grid-cols-3">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="p-5">
            <CardDescription>Total aset</CardDescription>
            <CardTitle className="text-2xl">{rows.length}</CardTitle>
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
            <CardDescription>Perlu perhatian</CardDescription>
            <CardTitle className="text-2xl">{attentionCount}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="p-5">
          <CardTitle className="text-xl">Insight &amp; kesimpulan portofolio</CardTitle>
          <CardDescription>
            {rows.length === 0
              ? "Belum ada aset untuk dianalisis."
              : `${largestType?.label ?? "Aset"} menjadi kontributor nilai terbesar dengan ${formatRupiah(largestType?.value ?? 0)}. ${relationIssueCount} relasi pemilik, pengguna, atau sumber dana masih perlu dilengkapi agar laporan lebih siap untuk audit dan pengambilan keputusan.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 p-5 pt-0 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            {activeCount} dari {rows.length} aset berada dalam status aktif, sehingga portofolio masih dominan digunakan secara operasional.
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            {attentionCount > 0 ? `${attentionCount} aset perlu perhatian karena status legal, kondisi, atau status aset mengandung indikasi sengketa/rusak.` : "Tidak ada indikasi sengketa atau kerusakan dari field status/kondisi yang tersedia."}
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            Kesimpulan: lengkapi relasi organisasi terlebih dahulu, lalu gunakan laporan per jenis aset untuk memprioritaskan legalitas, lokasi, pajak, dan dokumen bukti.
          </div>
        </CardContent>
      </Card>

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

      <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="p-5">
            <CardTitle className="text-xl">Laporan per jenis aset</CardTitle>
            <CardDescription>{activeCount} aset aktif dari {rows.length} aset.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 p-5 pt-0 md:grid-cols-2">
            {assetTypeConfigs.map((item) => {
              const typeRows = countsByType.get(item.type) ?? [];
              const value = typeRows.reduce((sum, row) => sum + numberValue(row.acquisitionValue), 0);

              return (
                <Link
                  key={item.type}
                  href={`/reports/${item.type}`}
                  className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-emerald-300 hover:bg-emerald-50/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-slate-950">{labelFromMap(item.type, assetTypeLabels)}</p>
                      <p className="mt-1 text-sm text-slate-600">{typeRows.length} aset</p>
                    </div>
                    <StatusBadge tone="neutral">{formatRupiah(value)}</StatusBadge>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="p-5">
            <CardTitle className="text-xl">Status aset</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-5 pt-0">
            {countsByStatus.map((item) => (
              <div key={item.status} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                <span className="text-sm font-medium text-slate-700">{item.label}</span>
                <StatusBadge tone={item.status === "active" ? "success" : isInactiveAssetStatus(item.status) ? "warning" : "neutral"}>
                  {item.count}
                </StatusBadge>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <BarList title="Nilai aset berdasarkan sumber pembiayaan" rows={aggregateRelation(relationRows, "financed_by", "value")} format="money" />
        <BarList title="Jumlah aset berdasarkan pemilik" rows={aggregateRelation(relationRows, "owned_by")} />
        <BarList title="Jumlah aset berdasarkan pengguna" rows={aggregateRelation(relationRows, "used_by")} />
        <BarList title="Jumlah input berdasarkan pencatat" rows={aggregateRelation(relationRows, "inputted_by")} />
      </section>
    </main>
  );
}
