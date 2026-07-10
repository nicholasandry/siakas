import Link from "next/link";
import { notFound } from "next/navigation";

import { AssetHistoryTimeline } from "@/components/assets/asset-history-timeline";
import { PageHeader } from "@/components/ui/page-header";
import { auditPageView } from "@/lib/audit";
import { getAsset } from "@/lib/assets";
import { getAssetHistoryDisplayPage } from "@/lib/assets/histories";
import { ASSET_HISTORY_PAGE_SIZE, parseAssetHistoryFilter } from "@/lib/assets/histories.shared";
import { assertAssetInScope } from "@/lib/scope";
import { requireAuthenticatedScope } from "@/lib/server-guards";

const actionClassName =
  "inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50";

export default async function AssetHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ filter?: string; page?: string; pageSize?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const { user, scope } = await requireAuthenticatedScope("asset.read");

  const asset = await getAsset(id);
  if (!asset) {
    notFound();
  }

  assertAssetInScope(scope, asset);

  const filter = parseAssetHistoryFilter(query.filter);
  const page = Math.max(1, Number(query.page ?? "1") || 1);
  const pageSize = Math.min(100, Math.max(5, Number(query.pageSize ?? String(ASSET_HISTORY_PAGE_SIZE)) || ASSET_HISTORY_PAGE_SIZE));

  const { filterCounts, displayEntries, pagination } = await getAssetHistoryDisplayPage(id, filter, page, pageSize);
  const exportHref =
    filter === "all" ? `/assets/${id}/history/export` : `/assets/${id}/history/export?filter=${filter}`;

  await auditPageView(user.id, {
    entity: "asset",
    entityId: asset.id,
    view: "history",
    metadata: { code: asset.code, name: asset.name, filter, page: pagination.page },
  });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
      <PageHeader
        eyebrow="Aset / Riwayat"
        title="Riwayat perubahan operasional"
        description={`${asset.code} — ${asset.name}. Audit status, kondisi fisik, peminjaman, penempatan unit/lokasi, dan dampak disposal terhadap status aset.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={exportHref} className={actionClassName}>
              Ekspor CSV
            </Link>
            <Link href={`/assets/${id}`} className={actionClassName}>
              Kembali ke detail
            </Link>
          </div>
        }
      />

      <AssetHistoryTimeline
        assetId={id}
        mode="full"
        filter={filter}
        filterCounts={filterCounts}
        displayEntries={displayEntries}
        pagination={pagination}
      />
    </main>
  );
}
