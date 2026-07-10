import Link from "next/link";
import { notFound } from "next/navigation";

import { AssetLocationForm } from "@/components/forms/asset-location-form";
import { ActionAlert } from "@/components/ui/action-alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { auditPageView } from "@/lib/audit";
import { getAssetLocation, listUnits } from "@/lib/master-data";
import { assertUnitInScope } from "@/lib/scope";
import { requireAuthenticatedScope } from "@/lib/server-guards";
import { updateAssetLocationAction } from "../../actions";

export default async function EditAssetLocationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { user, scope } = await requireAuthenticatedScope("unit.update");
  const [location, units] = await Promise.all([getAssetLocation(id), listUnits(scope)]);

  if (!location) {
    notFound();
  }

  assertUnitInScope(scope, location.unitId);

  await auditPageView(user.id, {
    entity: "asset_location",
    entityId: location.id,
    view: "edit",
    metadata: { name: location.name, unitId: location.unitId },
  });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-8">
      <ActionAlert message={error} />

      <PageHeader
        eyebrow="Master Data / Lokasi / Edit"
        title="Edit lokasi"
        description={location.name}
        actions={
          <Link href="/master-data/lokasi" className="inline-flex h-10 items-center rounded-lg bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800">
            Kembali
          </Link>
        }
      />

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="p-5">
          <CardTitle className="text-xl">Data lokasi</CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <AssetLocationForm
            action={updateAssetLocationAction}
            submitLabel="Simpan perubahan"
            units={units}
            values={{
              id: location.id,
              unitId: location.unitId,
              name: location.name,
              code: location.code,
              locationKind: location.locationKind,
              description: location.description,
              isActive: location.isActive,
            }}
          />
        </CardContent>
      </Card>
    </main>
  );
}
