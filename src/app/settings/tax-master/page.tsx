import Link from "next/link";
import { Pencil } from "lucide-react";

import { CreateTaxGroupDialog } from "@/components/tax-master/create-tax-group-dialog";
import { ActionAlert } from "@/components/ui/action-alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auditPageView } from "@/lib/audit";
import { hasPermission } from "@/lib/authz";
import { listTaxDepreciationGroups, listTaxDepreciationRules } from "@/lib/tax-master";
import { requirePageAccess } from "@/lib/server-guards";
import { createTaxGroupAction } from "./actions";

const secondaryActionClassName =
  "inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50";

const categoryLabels: Record<string, string> = {
  tanah: "Tanah",
  bangunan: "Bangunan",
  kendaraan: "Kendaraan",
  benda: "Benda",
};

export default async function TaxMasterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { user } = await requirePageAccess("tax-master.read");
  const canUpdate = hasPermission(user, "tax-master.update");
  const groups = await listTaxDepreciationGroups();

  const groupsWithRuleCount = await Promise.all(
    groups.map(async (group) => {
      const rules = await listTaxDepreciationRules(group.id);
      return { group, ruleCount: rules.length, activeRuleCount: rules.filter((rule) => rule.isActive).length };
    })
  );

  await auditPageView(user.id, {
    entity: "tax_master",
    view: "list",
    metadata: { groupCount: groups.length },
  });

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <ActionAlert message={error} />

      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-3">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Settings / Master Pajak</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">Master pajak & depresiasi</h1>
          <p className="text-base leading-7 text-slate-600">
            Kelola kelompok fiskal dan aturan depresiasi per tahun. Perubahan regulasi tidak menimpa histori aset yang sudah ada.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canUpdate ? <CreateTaxGroupDialog action={createTaxGroupAction} /> : null}
          <Link href="/settings" className={secondaryActionClassName}>
            Kembali
          </Link>
        </div>
      </section>

      <Card className="border-white/70 bg-white/85 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle className="text-2xl">Kelompok fiskal</CardTitle>
          <CardDescription>{groups.length} kelompok terdaftar.</CardDescription>
        </CardHeader>
        <CardContent>
          {groupsWithRuleCount.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center text-sm text-slate-600">
              Belum ada kelompok fiskal. Jalankan seed atau tambah kelompok baru.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-[980px] w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Kode</th>
                    <th className="px-4 py-3">Nama</th>
                    <th className="px-4 py-3">Kategori</th>
                    <th className="px-4 py-3">Metode</th>
                    <th className="px-4 py-3">Masa manfaat</th>
                    <th className="px-4 py-3">Tarif</th>
                    <th className="px-4 py-3">Aturan</th>
                    <th className="px-4 py-3">Status</th>
                    {canUpdate ? <th className="px-4 py-3">Aksi</th> : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {groupsWithRuleCount.map(({ group, ruleCount, activeRuleCount }) => (
                    <tr key={group.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">{group.code}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{group.name}</td>
                      <td className="px-4 py-3">{categoryLabels[group.assetCategory] ?? group.assetCategory}</td>
                      <td className="px-4 py-3">{group.methodDefault}</td>
                      <td className="px-4 py-3">{group.usefulLifeYears} th</td>
                      <td className="px-4 py-3">{group.ratePercent}%</td>
                      <td className="px-4 py-3">
                        {activeRuleCount}/{ruleCount} aktif
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            group.isActive ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {group.isActive ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      {canUpdate ? (
                        <td className="px-4 py-3">
                          <Link
                            href={`/settings/tax-master/groups/${group.id}/edit`}
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Kelola
                          </Link>
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
    </main>
  );
}
