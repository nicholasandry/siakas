import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";

import { CreateUnitDialog } from "@/components/master-data/create-unit-dialog";
import { ConfirmDeleteForm } from "@/components/ui/confirm-delete-form";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { ActionAlert } from "@/components/ui/action-alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auditPageView } from "@/lib/audit";
import { createUnitAction, deleteUnitAction } from "./actions";
import { hasPermission } from "@/lib/authz";
import { listBadanHukums, listUnits } from "@/lib/master-data";
import { requireAuthenticatedScope } from "@/lib/server-guards";
import { findKeuskupanUnitInfo, formatLegalParentDisplay, KEUSKUPAN_KIND } from "@/lib/unit-rules";

const secondaryActionClassName =
  "inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function truncate(value: string | null | undefined, max = 40) {
  if (!value) return "-";
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

export default async function UnitsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { user, scope } = await requireAuthenticatedScope("unit.read");
  const [units, allUnits, allBadanHukums] = await Promise.all([
    listUnits(scope),
    listUnits({ type: "all" }),
    listBadanHukums({ type: "all" }),
  ]);
  const keuskupanUnit = findKeuskupanUnitInfo(allUnits);
  const parentOptions = allUnits.map((unit) => ({
    id: unit.id,
    code: unit.code,
    name: unit.name,
    kind: unit.kind,
    parentId: unit.parentId,
  }));
  const badanHukumOptions = allBadanHukums.map((item) => ({ id: item.id, name: item.name, type: item.type }));
  const canCreate = hasPermission(user, "unit.create");
  const canUpdate = hasPermission(user, "unit.update");
  const canDelete = hasPermission(user, "unit.delete");

  await auditPageView(user.id, {
    entity: "unit",
    view: "list",
    metadata: { count: units.length },
  });

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <ActionAlert message={error} />

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Master Data / Unit</p>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">Daftar Unit</h1>
            <p className="text-base leading-7 text-slate-600">
              Kelola keuskupan, kevikepan, kategorial, paroki, unit karya, dan unit usaha.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canCreate ? (
              <CreateUnitDialog
                action={createUnitAction}
                parentOptions={parentOptions}
                badanHukumOptions={badanHukumOptions}
                keuskupanUnit={keuskupanUnit}
              />
            ) : null}
            <Link href="/master-data" className={secondaryActionClassName}>
              Kembali
            </Link>
          </div>
        </div>
      </section>

      <Card className="border-white/70 bg-white/85 shadow-glow backdrop-blur">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-2xl">Daftar unit</CardTitle>
            <CardDescription>{units.length} unit dalam scope akses Anda.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {units.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center">
              <p className="text-sm text-slate-600">Belum ada unit dalam scope ini.</p>
              {canCreate ? (
                <div className="mt-4 flex justify-center">
                  <CreateUnitDialog
                    action={createUnitAction}
                    parentOptions={parentOptions}
                    badanHukumOptions={badanHukumOptions}
                    keuskupanUnit={keuskupanUnit}
                  />
                </div>
              ) : null}
            </div>
          ) : (
            <ResponsiveTable>
              <table className="min-w-[920px] w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Kode</th>
                    <th className="px-4 py-3">Nama</th>
                    <th className="px-4 py-3">Jenis</th>
                    <th className="px-4 py-3">Kategori</th>
                    <th className="px-4 py-3">Unit induk</th>
                    <th className="px-4 py-3">Induk hukum</th>
                    <th className="px-4 py-3">Penanggung jawab</th>
                    <th className="px-4 py-3">Alamat</th>
                    {(canUpdate || canDelete) && <th className="px-4 py-3">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {units.map((unit) => {
                    const parentName = allUnits.find((candidate) => candidate.id === unit.parentId)?.name ?? "-";
                    const legalParentDisplay = formatLegalParentDisplay(unit, parentOptions, badanHukumOptions);

                    return (
                      <tr key={unit.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 font-medium text-slate-900">{unit.code}</td>
                        <td className="px-4 py-3 text-slate-700">{unit.name}</td>
                        <td className="px-4 py-3 text-slate-700">{unit.kind}</td>
                        <td className="px-4 py-3 text-slate-700">{unit.category ?? "-"}</td>
                        <td className="px-4 py-3 text-slate-700">{parentName}</td>
                        <td className="px-4 py-3 text-slate-700">{legalParentDisplay}</td>
                        <td className="px-4 py-3 text-slate-700">{unit.responsiblePerson ?? "-"}</td>
                        <td className="px-4 py-3 text-slate-700">{truncate(unit.address)}</td>
                        {(canUpdate || canDelete) && (
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              {canUpdate ? (
                                <Link
                                  href={`/master-data/units/${unit.id}/edit`}
                                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  Edit
                                </Link>
                              ) : null}
                              {canDelete && unit.kind !== KEUSKUPAN_KIND ? (
                                <ConfirmDeleteForm
                                  action={deleteUnitAction}
                                  confirmMessage={`Hapus unit "${unit.name}"? Tindakan ini tidak dapat dibatalkan.`}
                                >
                                  <input type="hidden" name="id" value={unit.id} />
                                  <button
                                    type="submit"
                                    className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Hapus
                                  </button>
                                </ConfirmDeleteForm>
                              ) : null}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ResponsiveTable>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
