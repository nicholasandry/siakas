import Link from "next/link";

import { AssetForm } from "@/components/forms/asset-form";
import { ActionAlert } from "@/components/ui/action-alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auditPageView } from "@/lib/audit";
import { createAssetAction } from "../actions";
import { listAssetLookups } from "@/lib/assets";
import { requireAuthenticatedScope } from "@/lib/server-guards";

const actionClassName =
  "inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const assetTypes = [
  { type: "tanah", title: "Tanah" },
  { type: "bangunan", title: "Bangunan" },
  { type: "kendaraan", title: "Kendaraan" },
  { type: "benda", title: "Benda" },
] as const;

export default async function NewAssetPage({ searchParams }: { searchParams: Promise<{ type?: string; error?: string }> }) {
  const { type, error } = await searchParams;
  const { user, scope } = await requireAuthenticatedScope("asset.create");
  const assetType = (assetTypes.find((item) => item.type === type)?.type ?? "tanah") as (typeof assetTypes)[number]["type"];
  const lookups = await listAssetLookups(scope);

  await auditPageView(user.id, {
    entity: "asset",
    view: "create",
    metadata: { assetType },
  });

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <ActionAlert message={error} />

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Assets / Baru</p>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">Buat aset baru</h1>
            <p className="text-base leading-7 text-slate-600">
              Isi data per tab — umum, detail jenis aset, relasi organisasi, lalu lampiran &amp; depresiasi.
            </p>
          </div>
          <Link href="/assets" className={actionClassName}>
            Kembali ke daftar
          </Link>
        </div>
      </section>

      <Card className="border-slate-200/80 bg-white/80 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle className="text-2xl">Form aset baru</CardTitle>
          <CardDescription>Gunakan tab di bawah untuk berpindah antar bagian tanpa scroll panjang.</CardDescription>
        </CardHeader>
        <CardContent>
          <AssetForm action={createAssetAction} submitLabel="Simpan aset" assetType={assetType} lookups={lookups} depreciationPreview={null} />
        </CardContent>
      </Card>
    </main>
  );
}
