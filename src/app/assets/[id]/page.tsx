import { notFound } from "next/navigation";
import Link from "next/link";

import { AssetDetailView } from "@/components/assets/asset-detail-view";
import { auditPageView } from "@/lib/audit";
import {
  getAsset,
  getAssetAttachmentRows,
  getAssetDetailRows,
  getAssetOrganizationRows,
  listAssetLookups,
} from "@/lib/assets";
import { assertAssetInScope } from "@/lib/scope";
import { requireAuthenticatedScope } from "@/lib/server-guards";

const actionClassName =
  "inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, scope } = await requireAuthenticatedScope("asset.read");
  const [asset, detail, organizations, attachments, lookups] = await Promise.all([
    getAsset(id),
    getAssetDetailRows(id),
    getAssetOrganizationRows(id),
    getAssetAttachmentRows(id),
    listAssetLookups({ type: "all" }),
  ]);

  if (!asset) {
    notFound();
  }

  assertAssetInScope(scope, asset);

  await auditPageView(user.id, {
    entity: "asset",
    entityId: asset.id,
    view: "detail",
    metadata: { code: asset.code, name: asset.name, assetType: asset.assetType },
  });

  const unitName = lookups.units.find((item) => item.id === asset.unitId)?.name ?? null;
  const badanHukumName = lookups.badanHukums.find((item) => item.id === asset.badanHukumId)?.name ?? null;
  const landNameById = new Map(lookups.landAssets.map((item) => [item.id, item.name]));
  const relatedLandNames = detail.buildingLandIds.map((landId) => landNameById.get(landId) ?? landId);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl space-y-3">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Assets / Detail</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">Detail aset</h1>
          <p className="text-base leading-7 text-slate-600">
            Ringkasan lengkap data umum, detail jenis, relasi, Coretax, depresiasi, dan lampiran.
          </p>
        </div>
        <Link href="/assets" className={actionClassName}>
          Kembali ke daftar
        </Link>
      </section>

      <AssetDetailView
        user={user}
        asset={{
          id: asset.id,
          code: asset.code,
          name: asset.name,
          assetType: asset.assetType,
          ownershipLevel: asset.ownershipLevel,
          acquisitionDate: asset.acquisitionDate,
          acquisitionValue: asset.acquisitionValue,
          legalStatus: asset.legalStatus,
          ownerName: asset.ownerName,
          condition: asset.condition,
          status: asset.status,
          notes: asset.notes,
          unitName: unitName ?? null,
          badanHukumName: badanHukumName ?? null,
        }}
        detail={detail}
        organizations={organizations}
        attachments={attachments}
        relatedLandNames={relatedLandNames}
      />
    </main>
  );
}
