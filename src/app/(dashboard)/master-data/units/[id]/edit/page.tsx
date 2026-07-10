import { notFound } from "next/navigation";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UnitForm } from "@/components/forms/unit-form";
import { PageHeader } from "@/components/ui/page-header";
import { auditPageView } from "@/lib/audit";
import { updateUnitAction, deleteUnitAction } from "../../actions";
import { hasPermission } from "@/lib/authz";
import { getUnit, listBadanHukums, listUnits } from "@/lib/master-data";
import { assertUnitInScope } from "@/lib/scope";
import { requireAuthenticatedScope } from "@/lib/server-guards";
import { findKeuskupanUnitInfo, KEUSKUPAN_KIND } from "@/lib/unit-rules";

const actionClassName =
  "inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default async function EditUnitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, scope } = await requireAuthenticatedScope("unit.update");
  const [unit, allUnits, allBadanHukums] = await Promise.all([
    getUnit(id),
    listUnits({ type: "all" }),
    listBadanHukums({ type: "all" }),
  ]);

  if (!unit) {
    notFound();
  }

  assertUnitInScope(scope, unit.id);

  await auditPageView(user.id, {
    entity: "unit",
    entityId: unit.id,
    view: "edit",
    metadata: { code: unit.code, name: unit.name },
  });

  const parentOptions = allUnits.map((unit) => ({
    id: unit.id,
    code: unit.code,
    name: unit.name,
    kind: unit.kind,
    parentId: unit.parentId,
  }));

  const badanHukumOptions = allBadanHukums.map((item) => ({ id: item.id, name: item.name, type: item.type }));
  const keuskupanUnit = findKeuskupanUnitInfo(allUnits);
  const canDelete = hasPermission(user, "unit.delete") && unit.kind !== KEUSKUPAN_KIND;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
      <PageHeader
        eyebrow="Master Data / Unit"
        title="Edit unit"
        description={`${unit.code} - ${unit.name}`}
        actions={
          <Link href="/master-data/units" className={actionClassName}>
            Kembali
          </Link>
        }
      />

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="p-5">
          <CardTitle className="text-xl">Form unit</CardTitle>
          <CardDescription>
            {unit.code} — {unit.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <UnitForm
            action={updateUnitAction}
            submitLabel="Simpan perubahan"
            values={{
              id: unit.id,
              code: unit.code,
              name: unit.name,
              kind: unit.kind,
              category: unit.category,
              parentId: unit.parentId,
              legalParentType: unit.legalParentType,
              legalParentUnitId: unit.legalParentUnitId,
              legalParentBadanHukumId: unit.legalParentBadanHukumId,
              legalParentLabel: unit.legalParentLabel,
              address: unit.address,
              responsiblePerson: unit.responsiblePerson,
              notes: unit.notes,
            }}
            parentOptions={parentOptions}
            badanHukumOptions={badanHukumOptions}
            keuskupanUnit={keuskupanUnit}
          />
          {canDelete ? (
            <div className="mt-6 border-t border-slate-200 pt-6">
              <form action={deleteUnitAction} className="flex items-center gap-3">
                <input type="hidden" name="id" value={unit.id} />
                <button
                  type="submit"
                  className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
                >
                  Hapus unit
                </button>
              </form>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
