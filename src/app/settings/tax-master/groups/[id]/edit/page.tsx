import Link from "next/link";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";

import { TaxGroupForm } from "@/components/forms/tax-group-form";
import { TaxRuleForm } from "@/components/forms/tax-rule-form";
import { TaxRuleEditDialog } from "@/components/tax-master/tax-rule-edit-dialog";
import { ActionAlert } from "@/components/ui/action-alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auditPageView } from "@/lib/audit";
import { hasPermission } from "@/lib/authz";
import { countTaxGroupReferences, getTaxDepreciationGroup, listTaxDepreciationRules } from "@/lib/tax-master";
import { requirePageAccess } from "@/lib/server-guards";
import {
  createTaxRuleAction,
  deactivateTaxGroupAction,
  deactivateTaxRuleAction,
  updateTaxGroupAction,
  updateTaxRuleAction,
} from "@/app/settings/tax-master/actions";

const secondaryActionClassName =
  "inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50";

export default async function TaxGroupEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { user } = await requirePageAccess("tax-master.read");
  const canUpdate = hasPermission(user, "tax-master.update");
  const group = await getTaxDepreciationGroup(id);

  if (!group) {
    notFound();
  }

  const [rules, references] = await Promise.all([listTaxDepreciationRules(id), countTaxGroupReferences(id)]);

  await auditPageView(user.id, {
    entity: "tax_depreciation_group",
    entityId: group.id,
    view: "edit",
    metadata: { code: group.code, ruleCount: rules.length },
  });

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <ActionAlert message={error} />

      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-3">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Settings / Master Pajak / Edit</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">{group.name}</h1>
          <p className="text-base leading-7 text-slate-600">
            {group.code} · {group.assetCategory} · {references} aset memakai kelompok ini
          </p>
        </div>
        <Link href="/settings/tax-master" className={secondaryActionClassName}>
          Kembali ke daftar
        </Link>
      </section>

      <Card className="border-white/70 bg-white/85 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle className="text-2xl">Data kelompok</CardTitle>
          <CardDescription>Kode kelompok tidak dapat diubah setelah dibuat.</CardDescription>
        </CardHeader>
        <CardContent>
          {canUpdate ? (
            <TaxGroupForm
              action={updateTaxGroupAction}
              submitLabel="Simpan kelompok"
              values={{
                id: group.id,
                code: group.code,
                name: group.name,
                assetCategory: group.assetCategory,
                methodDefault: group.methodDefault,
                usefulLifeYears: group.usefulLifeYears,
                ratePercent: group.ratePercent,
                isDepreciable: group.isDepreciable,
                effectiveFrom: group.effectiveFrom,
                effectiveTo: group.effectiveTo,
                isActive: group.isActive,
                notes: group.notes,
              }}
            />
          ) : (
            <p className="text-sm text-slate-600">Anda hanya memiliki akses baca.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-white/70 bg-white/85 shadow-sm backdrop-blur">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-2xl">Aturan per tahun</CardTitle>
            <CardDescription>Tambahkan aturan baru untuk perubahan regulasi tanpa mengubah histori aset.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {canUpdate ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4">
              <h3 className="mb-4 text-sm font-semibold text-slate-900">Tambah aturan baru</h3>
              <TaxRuleForm action={createTaxRuleAction} submitLabel="Tambah aturan" groupId={group.id} />
            </div>
          ) : null}

          {rules.length === 0 ? (
            <p className="text-sm text-slate-600">Belum ada aturan untuk kelompok ini.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-[900px] w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Tahun</th>
                    <th className="px-4 py-3">Metode</th>
                    <th className="px-4 py-3">Masa manfaat</th>
                    <th className="px-4 py-3">Tarif</th>
                    <th className="px-4 py-3">Regulasi</th>
                    <th className="px-4 py-3">Status</th>
                    {canUpdate ? <th className="px-4 py-3">Aksi</th> : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {rules.map((rule) => (
                    <tr key={rule.id}>
                      <td className="px-4 py-3 font-medium">{rule.taxYear}</td>
                      <td className="px-4 py-3">{rule.method}</td>
                      <td className="px-4 py-3">{rule.usefulLifeYears} th</td>
                      <td className="px-4 py-3">{rule.ratePercent}%</td>
                      <td className="px-4 py-3">{rule.sourceRegulation}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            rule.isActive ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {rule.isActive ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      {canUpdate ? (
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <TaxRuleEditDialog action={updateTaxRuleAction} groupId={group.id} rule={rule} />
                            {rule.isActive ? (
                              <form action={deactivateTaxRuleAction}>
                                <input type="hidden" name="id" value={rule.id} />
                                <input type="hidden" name="groupId" value={group.id} />
                                <button
                                  type="submit"
                                  className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Nonaktifkan
                                </button>
                              </form>
                            ) : null}
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {canUpdate && group.isActive ? (
        <Card className="border-rose-200 bg-rose-50/40">
          <CardHeader>
            <CardTitle className="text-lg text-rose-900">Nonaktifkan kelompok</CardTitle>
            <CardDescription>
              Kelompok yang sudah dipakai aset hanya dinonaktifkan (tidak dihapus) agar histori tetap konsisten.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={deactivateTaxGroupAction}>
              <input type="hidden" name="id" value={group.id} />
              <button
                type="submit"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-rose-300 px-5 text-sm font-medium text-rose-800 hover:bg-rose-100"
              >
                <Trash2 className="h-4 w-4" />
                Nonaktifkan kelompok
              </button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
