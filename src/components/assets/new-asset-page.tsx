import Link from "next/link";

import { AssetForm } from "@/components/forms/asset-form";
import { ActionAlert } from "@/components/ui/action-alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { auditPageView } from "@/lib/audit";
import { createAssetAction } from "@/app/(dashboard)/assets/actions";
import { listAssetLookups } from "@/lib/assets";
import { assetTypeConfigs, type AssetType } from "@/lib/asset-types";
import { requireAuthenticatedScope } from "@/lib/server-guards";

type NewAssetPageProps = {
  assetType: AssetType;
  error?: string;
};

const actionClassName =
  "inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export async function NewAssetPage({ assetType, error }: NewAssetPageProps) {
  const { user, scope } = await requireAuthenticatedScope("asset.create");
  const lookups = await listAssetLookups(scope);
  const currentType = assetTypeConfigs.find((item) => item.type === assetType);

  await auditPageView(user.id, {
    entity: "asset",
    view: `create-${assetType}`,
    metadata: { assetType },
  });

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
      <ActionAlert message={error} />

      <PageHeader
        eyebrow={`Aset / ${currentType?.label} / Baru`}
        title={`Tambah aset ${currentType?.label.toLowerCase()}`}
        actions={
          <Link href={`/assets/${assetType}`} className={actionClassName}>
            Kembali ke daftar {currentType?.label}
          </Link>
        }
      />

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="p-5">
          <CardTitle className="text-xl">Form {currentType?.label}</CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <AssetForm action={createAssetAction} submitLabel="Simpan aset" assetType={assetType} lookups={lookups} depreciationPreview={null} />
        </CardContent>
      </Card>
    </main>
  );
}
