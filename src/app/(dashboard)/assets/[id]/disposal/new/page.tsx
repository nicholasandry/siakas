import Link from "next/link";
import { notFound } from "next/navigation";

import { AssetDisposalForm } from "@/components/assets/asset-disposal-form";
import { PageHeader } from "@/components/ui/page-header";
import { createAssetDisposalAction } from "@/app/(dashboard)/assets/disposals/actions";
import { auditPageView } from "@/lib/audit";
import { getActiveAssetDisposal, getAssetDisposalSnapshot } from "@/lib/asset-disposals";
import { listDisposalFormLookups } from "@/lib/asset-disposals/lookups";
import { getAssetDisposalBlockReason } from "@/lib/assets/status";
import { getLatestAssetConditionFromHistory } from "@/lib/assets/histories";
import { listUnits } from "@/lib/master-data";
import { assertAssetInScope } from "@/lib/scope";
import { requireAuthenticatedScope } from "@/lib/server-guards";

const actionClassName =
  "inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800";

function disposalBlockMessage(reason: NonNullable<ReturnType<typeof getAssetDisposalBlockReason>>) {
  if (reason === "active_disposal") {
    return "Aset ini sedang dalam proses disposal aktif.";
  }
  if (reason === "final_status") {
    return "Aset dengan status keluar inventori tidak dapat diajukan disposal lagi.";
  }
  return "Aset yang sedang dipinjamkan tidak dapat diajukan disposal. Kembalikan aset terlebih dahulu (ubah status ke Aktif atau Nonaktif).";
}

export default async function NewAssetDisposalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { user, scope } = await requireAuthenticatedScope("asset.disposal.create");

  let snapshot;
  try {
    snapshot = await getAssetDisposalSnapshot(id);
  } catch {
    notFound();
  }

  assertAssetInScope(scope, snapshot.asset);

  const active = await getActiveAssetDisposal(id);
  const blockReason = getAssetDisposalBlockReason(snapshot.asset.status, Boolean(active));

  if (blockReason === "active_disposal" && active) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
        <PageHeader eyebrow="Aset / Disposal" title="Aset sedang dalam proses disposal" description={`Status disposal aktif: ${active.status}`} />
        <Link href={`/assets/disposals/${active.id}`} className={actionClassName}>
          Buka detail disposal
        </Link>
      </main>
    );
  }

  if (blockReason) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
        <PageHeader
          eyebrow="Aset / Disposal"
          title="Disposal tidak dapat dilanjutkan"
          description={`${snapshot.asset.code} — ${snapshot.asset.name}`}
        />
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{disposalBlockMessage(blockReason)}</div>
        <Link href={`/assets/${id}`} className="inline-flex h-10 w-fit items-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700">
          Kembali ke detail aset
        </Link>
      </main>
    );
  }

  const [lookups, latestConditionFromHistory, unitRows] = await Promise.all([
    listDisposalFormLookups(),
    getLatestAssetConditionFromHistory(id),
    listUnits(),
  ]);

  await auditPageView(user.id, { entity: "asset_disposal", view: "new", entityId: id });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <PageHeader
        eyebrow="Aset / Disposal"
        title="Ajukan disposal aset"
        description={`${snapshot.asset.code} - ${snapshot.asset.name}`}
        actions={
          <Link href={`/assets/${id}`} className="inline-flex h-10 items-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700">
            Kembali
          </Link>
        }
      />
      <AssetDisposalForm
        action={createAssetDisposalAction}
        asset={{
          ...snapshot.asset,
          locationName: null,
          unitName: null,
          badanHukumName: null,
        }}
        snapshot={snapshot}
        latestConditionFromHistory={latestConditionFromHistory}
        lookups={lookups}
        units={unitRows.map((unit) => ({ id: unit.id, name: unit.name, kind: unit.kind, code: unit.code }))}
        serverError={error}
      />
    </main>
  );
}
