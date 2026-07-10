import Link from "next/link";
import { Pencil } from "lucide-react";

import { CreateTaxGroupDialog } from "@/components/tax-master/create-tax-group-dialog";
import { ActionAlert } from "@/components/ui/action-alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DataTable,
  tableBodyClassName,
  tableCellClassName,
  tableClassName,
  tableHeadClassName,
  tableHeaderCellClassName,
  tableRowClassName,
} from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { PageHeader } from "@/components/ui/page-header";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { StatusBadge } from "@/components/ui/status-badge";
import { auditPageView } from "@/lib/audit";
import { hasPermission } from "@/lib/authz";
import { assetTypeLabels, labelFromMap } from "@/lib/formatters";
import { compareNumber, compareText, normalizeListParams, paginateRows, searchRows, sortRows, type SortOption } from "@/lib/list-view";
import { listTaxDepreciationGroups, listTaxDepreciationRules } from "@/lib/tax-master";
import { requirePageAccess } from "@/lib/server-guards";
import { createTaxGroupAction } from "./actions";

const secondaryActionClassName =
  "inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50";

type TaxGroupSort = "code-asc" | "name-asc" | "category-asc" | "life-desc" | "rate-desc";

const taxGroupSortOptions = [
  { value: "code-asc", label: "Kode A-Z" },
  { value: "name-asc", label: "Nama A-Z" },
  { value: "category-asc", label: "Kategori A-Z" },
  { value: "life-desc", label: "Masa manfaat terbesar" },
  { value: "rate-desc", label: "Tarif terbesar" },
] as const satisfies readonly SortOption<TaxGroupSort>[];

export default async function TaxMasterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; q?: string; sort?: TaxGroupSort; page?: string; pageSize?: string }>;
}) {
  const params = await searchParams;
  const { error } = params;
  const { user } = await requirePageAccess("tax-master.read");
  const canUpdate = hasPermission(user, "tax-master.update");
  const groups = await listTaxDepreciationGroups();

  const groupsWithRuleCount = await Promise.all(
    groups.map(async (group) => {
      const rules = await listTaxDepreciationRules(group.id);
      return { group, ruleCount: rules.length, activeRuleCount: rules.filter((rule) => rule.isActive).length };
    })
  );
  const { q, sort, page, pageSize } = normalizeListParams(
    params,
    taxGroupSortOptions.map((option) => option.value),
    "code-asc"
  );
  const filteredRows = searchRows(groupsWithRuleCount, q, ({ group }) =>
    [group.code, group.name, group.assetCategory, group.methodDefault, group.isActive ? "aktif" : "nonaktif"].join(" ")
  );
  const sortedRows = sortRows(filteredRows, (a, b) => {
    if (sort === "name-asc") return compareText(a.group.name, b.group.name);
    if (sort === "category-asc") return compareText(a.group.assetCategory, b.group.assetCategory) || compareText(a.group.name, b.group.name);
    if (sort === "life-desc") return compareNumber(b.group.usefulLifeYears, a.group.usefulLifeYears) || compareText(a.group.name, b.group.name);
    if (sort === "rate-desc") return compareNumber(Number(b.group.ratePercent), Number(a.group.ratePercent)) || compareText(a.group.name, b.group.name);
    return compareText(a.group.code, b.group.code);
  });
  const paginated = paginateRows(sortedRows, page, pageSize);

  await auditPageView(user.id, {
    entity: "tax_master",
    view: "list",
    metadata: { groupCount: groups.length, filteredCount: filteredRows.length, q, sort },
  });

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
      <ActionAlert message={error} />

      <PageHeader
        eyebrow="Pengaturan / Master Pajak"
        title="Master pajak dan depresiasi"
        description="Kelompok fiskal dan aturan depresiasi."
        actions={
          <>
            {canUpdate ? <CreateTaxGroupDialog action={createTaxGroupAction} /> : null}
            <Link href="/settings" className={secondaryActionClassName}>
              Kembali
            </Link>
          </>
        }
      />

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="p-5">
          <CardTitle className="text-xl">Kelompok fiskal</CardTitle>
          <CardDescription>{filteredRows.length} dari {groups.length} kelompok terdaftar.</CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <ListToolbar q={q} sort={sort} sortOptions={taxGroupSortOptions} pageSize={pageSize} searchPlaceholder="Cari kode, nama, kategori, metode..." />
          {paginated.rows.length === 0 ? (
            <EmptyState
              title={q ? "Tidak ada kelompok yang cocok" : "Belum ada kelompok fiskal"}
              description={q ? "Tidak ada hasil untuk pencarian ini." : "Data belum tersedia."}
              action={canUpdate ? <CreateTaxGroupDialog action={createTaxGroupAction} /> : null}
            />
          ) : (
            <DataTable minWidth="980px">
              <table className={tableClassName}>
                <thead className={tableHeadClassName}>
                  <tr>
                    <th className={tableHeaderCellClassName}>Kode</th>
                    <th className={tableHeaderCellClassName}>Nama</th>
                    <th className={tableHeaderCellClassName}>Kategori</th>
                    <th className={tableHeaderCellClassName}>Metode</th>
                    <th className={tableHeaderCellClassName}>Masa manfaat</th>
                    <th className={tableHeaderCellClassName}>Tarif</th>
                    <th className={tableHeaderCellClassName}>Aturan</th>
                    <th className={tableHeaderCellClassName}>Status</th>
                    {canUpdate ? <th className={tableHeaderCellClassName}>Aksi</th> : null}
                  </tr>
                </thead>
                <tbody className={tableBodyClassName}>
                  {paginated.rows.map(({ group, ruleCount, activeRuleCount }) => (
                    <tr key={group.id} className={tableRowClassName}>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">{group.code}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{group.name}</td>
                      <td className={tableCellClassName}>{labelFromMap(group.assetCategory, assetTypeLabels)}</td>
                      <td className={tableCellClassName}>{group.methodDefault}</td>
                      <td className={tableCellClassName}>{group.usefulLifeYears} th</td>
                      <td className={tableCellClassName}>{group.ratePercent}%</td>
                      <td className={tableCellClassName}>
                        {activeRuleCount}/{ruleCount} aktif
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={group.isActive ? "success" : "neutral"}>
                          {group.isActive ? "Aktif" : "Nonaktif"}
                        </StatusBadge>
                      </td>
                      {canUpdate ? (
                        <td className="px-4 py-3">
                          <Link
                            href={`/settings/tax-master/groups/${group.id}/edit`}
                            className="inline-flex items-center justify-center rounded-md border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
                            title="Detail Kelompok Fiskal"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </DataTable>
          )}
          <PaginationControls
            pathname="/settings/tax-master"
            q={q}
            sort={sort}
            page={paginated.page}
            pageSize={paginated.pageSize}
            total={paginated.total}
            totalPages={paginated.totalPages}
            start={paginated.start}
            end={paginated.end}
          />
        </CardContent>
      </Card>
    </main>
  );
}
