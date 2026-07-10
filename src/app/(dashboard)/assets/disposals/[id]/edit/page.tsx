import Link from "next/link";

import { updateAssetDisposalAction } from "@/app/(dashboard)/assets/disposals/actions";
import { AssetDisposalForm } from "@/components/assets/asset-disposal-form";
import { PageHeader } from "@/components/ui/page-header";
import { auditPageView } from "@/lib/audit";
import { getAssetDisposalById } from "@/lib/asset-disposals";
import { listDisposalFormLookups } from "@/lib/asset-disposals/lookups";
import { getLatestAssetConditionFromHistory } from "@/lib/assets/histories";
import { listUnits } from "@/lib/master-data";
import { assertAssetInScope } from "@/lib/scope";
import { requireAuthenticatedScope } from "@/lib/server-guards";

type FormDefaultValue = string | number | boolean | null | undefined;

function toFormDefaultValues(values: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]): [string, FormDefaultValue] => {
      if (value instanceof Date) return [key, value.toISOString()];
      if (Array.isArray(value)) return [key, value.join(",")];
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null || value === undefined) {
        return [key, value];
      }

      return [key, String(value)];
    })
  );
}

export default async function EditAssetDisposalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { user, scope } = await requireAuthenticatedScope("asset.disposal.edit");
  const row = await getAssetDisposalById(id);

  if (!row) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
        <PageHeader eyebrow="Aset / Disposal" title="Disposal tidak ditemukan" />
      </main>
    );
  }

  const [lookups, latestConditionFromHistory, unitRows] = await Promise.all([
    listDisposalFormLookups(),
    getLatestAssetConditionFromHistory(row.asset.id),
    listUnits(),
  ]);

  assertAssetInScope(scope, row.asset);

  if (row.disposal.status !== "DRAFT") {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
        <PageHeader
          eyebrow="Aset / Disposal"
          title="Disposal tidak dapat diedit"
          description="Hanya disposal berstatus Draft yang dapat diubah."
          actions={<Link href={`/assets/disposals/${id}`} className="inline-flex h-10 items-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700">Kembali</Link>}
        />
      </main>
    );
  }

  await auditPageView(user.id, { entity: "asset_disposal", view: "edit", entityId: id });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <PageHeader
        eyebrow="Aset / Disposal"
        title="Edit draft disposal"
        description={`${row.asset.code} - ${row.asset.name}`}
        actions={<Link href={`/assets/disposals/${id}`} className="inline-flex h-10 items-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700">Kembali</Link>}
      />
      <AssetDisposalForm
        action={updateAssetDisposalAction}
        asset={{
          ...row.asset,
          acquisitionValue: row.asset.acquisitionValue?.toString() ?? null,
          locationName: row.locationName,
          unitName: row.unitName,
          badanHukumName: row.badanHukumName,
        }}
        snapshot={{
          acquisitionValue: row.disposal.acquisitionValue,
          accumulatedDepreciationValue: row.disposal.accumulatedDepreciationValue,
          bookValueAtDisposal: row.disposal.bookValueAtDisposal,
        }}
        latestConditionFromHistory={latestConditionFromHistory}
        lookups={lookups}
        units={unitRows.map((unit) => ({ id: unit.id, name: unit.name, kind: unit.kind, code: unit.code }))}
        defaultValues={{
          ...toFormDefaultValues(row.disposal),
          donationRecipientKind:
            row.disposal.donationRecipientKind ??
            (row.disposal.recipientUnitId ? "INTERNAL_UNIT" : row.disposal.recipientName ? "EXTERNAL_PARTY" : "INTERNAL_UNIT"),
          recipientUnitId: row.disposal.recipientUnitId ?? "",
        }}
        serverError={error}
        submitLabel="Simpan perubahan draft"
      />
    </main>
  );
}
