import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";

import { CreateBadanHukumDialog } from "@/components/master-data/create-badan-hukum-dialog";
import { ConfirmDeleteForm } from "@/components/ui/confirm-delete-form";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { ActionAlert } from "@/components/ui/action-alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auditPageView } from "@/lib/audit";
import { createBadanHukumAction, deleteBadanHukumAction } from "./actions";
import { hasPermission } from "@/lib/authz";
import { listBadanHukums } from "@/lib/master-data";
import { requireAuthenticatedScope } from "@/lib/server-guards";

const secondaryActionClassName =
  "inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function formatDate(value: string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("id-ID");
}

export default async function BadanHukumPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { user, scope } = await requireAuthenticatedScope("badan-hukum.read");
  const badanHukums = await listBadanHukums(scope);
  const canCreate = hasPermission(user, "badan-hukum.create");
  const canUpdate = hasPermission(user, "badan-hukum.update");
  const canDelete = hasPermission(user, "badan-hukum.delete");

  await auditPageView(user.id, {
    entity: "badan_hukum",
    view: "list",
    metadata: { count: badanHukums.length },
  });

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <ActionAlert message={error} />

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Master Data / Badan Hukum</p>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">Daftar Badan Hukum</h1>
            <p className="text-base leading-7 text-slate-600">Kelola yayasan, PT, CV, koperasi, dan badan hukum lain.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canCreate ? <CreateBadanHukumDialog action={createBadanHukumAction} /> : null}
            <Link href="/master-data" className={secondaryActionClassName}>
              Kembali
            </Link>
          </div>
        </div>
      </section>

      <Card className="border-white/70 bg-white/85 shadow-glow backdrop-blur">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-2xl">Daftar badan hukum</CardTitle>
            <CardDescription>{badanHukums.length} data dalam scope akses Anda.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {badanHukums.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center">
              <p className="text-sm text-slate-600">Belum ada badan hukum dalam scope ini.</p>
              {canCreate ? (
                <div className="mt-4 flex justify-center">
                  <CreateBadanHukumDialog action={createBadanHukumAction} />
                </div>
              ) : null}
            </div>
          ) : (
            <ResponsiveTable>
              <table className="min-w-[980px] w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Nama</th>
                    <th className="px-4 py-3">Jenis</th>
                    <th className="px-4 py-3">Bidang</th>
                    <th className="px-4 py-3">SK Kemenkumham</th>
                    <th className="px-4 py-3">Tgl pendirian</th>
                    <th className="px-4 py-3">Pembina/Pengurus</th>
                    <th className="px-4 py-3">Status</th>
                    {(canUpdate || canDelete) && <th className="px-4 py-3">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {badanHukums.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                      <td className="px-4 py-3 text-slate-700">{item.type}</td>
                      <td className="px-4 py-3 text-slate-700">{item.field}</td>
                      <td className="px-4 py-3 text-slate-700">{item.kemenkumhamNumber ?? "-"}</td>
                      <td className="px-4 py-3 text-slate-700">{formatDate(item.establishedAt)}</td>
                      <td className="px-4 py-3 text-slate-700">{item.representative ?? "-"}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                          {item.status ?? "-"}
                        </span>
                      </td>
                      {(canUpdate || canDelete) && (
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {canUpdate ? (
                              <Link
                                href={`/master-data/badan-hukum/${item.id}/edit`}
                                className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </Link>
                            ) : null}
                            {canDelete ? (
                              <ConfirmDeleteForm
                                action={deleteBadanHukumAction}
                                confirmMessage={`Hapus badan hukum "${item.name}"?`}
                              >
                                <input type="hidden" name="id" value={item.id} />
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
                  ))}
                </tbody>
              </table>
            </ResponsiveTable>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
