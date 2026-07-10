import { notFound } from "next/navigation";
import Link from "next/link";

import { AssetDetailView } from "@/components/assets/asset-detail-view";
import { PageHeader } from "@/components/ui/page-header";
import { auditPageView } from "@/lib/audit";
import {
  getAsset,
  getAssetAttachmentRows,
  getAssetDetailRows,
  getAssetOrganizationRows,
  listAssetLookups,
} from "@/lib/assets";
import { getAssetHistoryDetailBundle } from "@/lib/assets/histories";
import { getAssetDisposalsByAssetId } from "@/lib/asset-disposals";
import { assertAssetInScope } from "@/lib/scope";
import { requireAuthenticatedScope } from "@/lib/server-guards";

const actionClassName =
  "inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, scope } = await requireAuthenticatedScope("asset.read");
  const [asset, detail, organizations, attachments, lookups, disposals, historyBundle] = await Promise.all([
    getAsset(id),
    getAssetDetailRows(id),
    getAssetOrganizationRows(id),
    getAssetAttachmentRows(id),
    listAssetLookups({ type: "all" }),
    getAssetDisposalsByAssetId(id),
    getAssetHistoryDetailBundle(id, { excludeFilters: ["disposal"] }),
  ]);
  const { filterCounts, historyItemsByFilter } = historyBundle;

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
  const locationName = lookups.locations.find((item) => item.id === asset.locationId)?.name ?? null;
  const landNameById = new Map(lookups.landAssets.map((item) => [item.id, item.name]));
  const relatedLandNames = detail.buildingLandIds.map((landId) => landNameById.get(landId) ?? landId);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
      <PageHeader
        eyebrow="Aset / Detail"
        title="Detail aset"
        description="Ringkasan lengkap data umum, detail jenis, relasi, Coretax, depresiasi, dan lampiran."
        actions={
          <Link href="/assets" className={actionClassName}>
            Kembali ke daftar
          </Link>
        }
      />

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
          loanedTo: asset.loanedTo,
          notes: asset.notes,
          unitName: unitName ?? null,
          badanHukumName: badanHukumName ?? null,
          locationName,
          unitId: asset.unitId,
          locationId: asset.locationId,
        }}
        detail={detail}
        organizations={organizations}
        attachments={attachments}
        disposals={disposals}
        historyItemsByFilter={historyItemsByFilter}
        historyFilterCounts={filterCounts}
        relatedLandNames={relatedLandNames}
        locations={lookups.locations}
      />
    </main>
  );
}
