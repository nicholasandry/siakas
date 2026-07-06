import { notFound } from "next/navigation";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UnitForm } from "@/components/forms/unit-form";
import { auditPageView } from "@/lib/audit";
import { updateUnitAction, deleteUnitAction } from "../../actions";
import { hasPermission } from "@/lib/authz";
import { getUnit, listBadanHukums, listUnits } from "@/lib/master-data";
import { assertUnitInScope } from "@/lib/scope";
import { requireAuthenticatedScope } from "@/lib/server-guards";
import { findKeuskupanUnitInfo, KEUSKUPAN_KIND } from "@/lib/unit-rules";

const actionClassName =
  "inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

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
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Master Data / Unit</p>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">Edit unit</h1>
            <p className="text-base leading-7 text-slate-600">
              Perbarui data unit dan pastikan parent tidak menimbulkan looping.
            </p>
          </div>
          <Link href="/master-data/units" className={actionClassName}>
            Kembali
          </Link>
        </div>
      </section>

      <Card className="border-white/70 bg-white/85 shadow-glow backdrop-blur">
        <CardHeader>
          <CardTitle className="text-2xl">Form unit</CardTitle>
          <CardDescription>
            {unit.code} — {unit.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                  className="rounded-full border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
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
