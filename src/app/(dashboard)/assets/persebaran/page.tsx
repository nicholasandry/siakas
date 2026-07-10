import Link from "next/link";

import { AssetDistributionMap } from "@/components/maps/asset-distribution-map";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { auditPageView } from "@/lib/audit";
import { listAssetMapPoints } from "@/lib/asset-map";
import { listAssetLookups } from "@/lib/assets";
import { assetTypeLabels } from "@/lib/formatters";
import { requireAuthenticatedScope } from "@/lib/server-guards";

const actionClassName =
  "inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function normalizeAssetType(value: string | undefined) {
  if (value === "tanah" || value === "bangunan") {
    return value;
  }

  return "all";
}

function normalizeUnitId(value: string | undefined, allowedUnitIds: Set<string>) {
  if (!value || !allowedUnitIds.has(value)) {
    return "";
  }

  return value;
}

export default async function AssetDistributionPage({ searchParams }: { searchParams: Promise<{ assetType?: string; unitId?: string }> }) {
  const params = await searchParams;
  const { user, scope } = await requireAuthenticatedScope("asset.read");
  const lookups = await listAssetLookups(scope);
  const allowedUnitIds = new Set(lookups.units.map((unit) => unit.id));
  const selectedAssetType = normalizeAssetType(params.assetType);
  const selectedUnitId = normalizeUnitId(params.unitId, allowedUnitIds);
  const points = await listAssetMapPoints(scope, {
    assetType: selectedAssetType,
    unitId: selectedUnitId || null,
  });

  const landCount = points.filter((point) => point.assetType === "tanah").length;
  const buildingCount = points.filter((point) => point.assetType === "bangunan").length;
  const selectedUnit = lookups.units.find((unit) => unit.id === selectedUnitId) ?? null;

  await auditPageView(user.id, {
    entity: "asset",
    view: "distribution-map",
    metadata: { count: points.length, landCount, buildingCount, assetType: selectedAssetType, unitId: selectedUnitId || null },
  });

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
      <PageHeader
        eyebrow="Aset / Persebaran"
        title="Persebaran Aset"
        description="Peta aset tanah dan bangunan dalam scope Anda. Hover pin untuk melihat nama aset, lalu klik untuk membuka detailnya."
        actions={<Link href="/assets" className={actionClassName}>Kembali ke daftar</Link>}
      />

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="p-5 pb-2">
            <CardDescription>Total titik</CardDescription>
            <CardTitle className="text-3xl font-semibold tabular-nums">{points.length}</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0 text-sm text-slate-600">Aset yang punya koordinat valid.</CardContent>
        </Card>
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="p-5 pb-2">
            <CardDescription>Tanah</CardDescription>
            <CardTitle className="text-3xl font-semibold tabular-nums">{landCount}</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0 text-sm text-slate-600">Pin hijau toska untuk aset tanah.</CardContent>
        </Card>
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="p-5 pb-2">
            <CardDescription>Bangunan</CardDescription>
            <CardTitle className="text-3xl font-semibold tabular-nums">{buildingCount}</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0 text-sm text-slate-600">Pin biru untuk aset bangunan.</CardContent>
        </Card>
      </section>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-xl">Filter persebaran</CardTitle>
          <CardDescription>Filter ini berlaku pada aset yang tampil di peta sesuai scope akses Anda.</CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <form className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 md:grid-cols-[minmax(220px,240px)_minmax(260px,1fr)_auto] md:items-end">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Jenis aset</span>
              <select
                name="assetType"
                defaultValue={selectedAssetType}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-950/20"
              >
                <option value="all">Semua jenis</option>
                <option value="tanah">{assetTypeLabels.tanah}</option>
                <option value="bangunan">{assetTypeLabels.bangunan}</option>
              </select>
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Unit</span>
              <select
                name="unitId"
                defaultValue={selectedUnitId}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-950/20"
              >
                <option value="">Semua unit</option>
                {lookups.units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.code ? `${unit.code} - ${unit.name}` : unit.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-wrap gap-2">
              <button type="submit" className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800">
                Terapkan
              </button>
              <Link href="/assets/persebaran" className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Reset
              </Link>
            </div>
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-800">Tanah</span>
            <span className="rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-800">Bangunan</span>
            <span>Hanya aset dalam scope dan yang memiliki koordinat yang ditampilkan.</span>
            {selectedAssetType !== "all" ? <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">Filter jenis: {assetTypeLabels[selectedAssetType]}</span> : null}
            {selectedUnit ? <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">Filter unit: {selectedUnit.code ? `${selectedUnit.code} - ${selectedUnit.name}` : selectedUnit.name}</span> : null}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-xl">Peta persebaran</CardTitle>
          <CardDescription>Hover pin untuk nama aset. Klik pin untuk membuka popup detail lalu lanjut ke halaman aset.</CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <AssetDistributionMap points={points} />
        </CardContent>
      </Card>
    </main>
  );
}