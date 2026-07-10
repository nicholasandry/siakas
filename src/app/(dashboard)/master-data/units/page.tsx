import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";

import { CreateUnitDialog } from "@/components/master-data/create-unit-dialog";
import { ConfirmDeleteForm } from "@/components/ui/confirm-delete-form";
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
import { ActionAlert } from "@/components/ui/action-alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auditPageView } from "@/lib/audit";
import { createUnitAction, deleteUnitAction } from "./actions";
import { hasPermission } from "@/lib/authz";
import { listBadanHukums, listUnits } from "@/lib/master-data";
import { compareText, normalizeListParams, paginateRows, searchRows, sortRows, type SortOption } from "@/lib/list-view";
import { requireAuthenticatedScope } from "@/lib/server-guards";
import { findKeuskupanUnitInfo, formatLegalParentDisplay, KEUSKUPAN_KIND } from "@/lib/unit-rules";

const secondaryActionClassName =
  "inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function truncate(value: string | null | undefined, max = 40) {
  if (!value) return "-";
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

type UnitSort = "code-asc" | "name-asc" | "kind-asc" | "category-asc";

const unitSortOptions = [
  { value: "code-asc", label: "Kode A-Z" },
  { value: "name-asc", label: "Nama A-Z" },
  { value: "kind-asc", label: "Jenis A-Z" },
  { value: "category-asc", label: "Kategori A-Z" },
] as const satisfies readonly SortOption<UnitSort>[];

export default async function UnitsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; q?: string; sort?: UnitSort; page?: string; pageSize?: string }>;
}) {
  const params = await searchParams;
  const { error } = params;
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
  const { q, sort, page, pageSize } = normalizeListParams(
    params,
    unitSortOptions.map((option) => option.value),
    "code-asc"
  );
  const rowContexts = units.map((unit) => {
    const parentName = allUnits.find((candidate) => candidate.id === unit.parentId)?.name ?? "-";
    const legalParentDisplay = formatLegalParentDisplay(unit, parentOptions, badanHukumOptions);
    return { unit, parentName, legalParentDisplay };
  });
  const filteredRows = searchRows(rowContexts, q, ({ unit, parentName, legalParentDisplay }) =>
    [unit.code, unit.name, unit.kind, unit.category, parentName, legalParentDisplay, unit.responsiblePerson, unit.address].filter(Boolean).join(" ")
  );
  const sortedRows = sortRows(filteredRows, (a, b) => {
    if (sort === "name-asc") return compareText(a.unit.name, b.unit.name);
    if (sort === "kind-asc") return compareText(a.unit.kind, b.unit.kind) || compareText(a.unit.name, b.unit.name);
    if (sort === "category-asc") return compareText(a.unit.category, b.unit.category) || compareText(a.unit.name, b.unit.name);
    return compareText(a.unit.code, b.unit.code);
  });
  const paginated = paginateRows(sortedRows, page, pageSize);

  await auditPageView(user.id, {
    entity: "unit",
    view: "list",
    metadata: { count: units.length, filteredCount: filteredRows.length, q, sort },
  });

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
      <ActionAlert message={error} />

      <PageHeader
        eyebrow="Master Data / Unit"
        title="Daftar unit"
        description="Struktur unit."
        actions={
          <>
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
          </>
        }
      />

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xl">Daftar unit</CardTitle>
            <CardDescription>{filteredRows.length} dari {units.length} unit dalam scope akses Anda.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <ListToolbar q={q} sort={sort} sortOptions={unitSortOptions} pageSize={pageSize} searchPlaceholder="Cari kode, nama, jenis, penanggung jawab..." />
          {paginated.rows.length === 0 ? (
            <EmptyState
              title={q ? "Tidak ada unit yang cocok" : "Belum ada unit"}
              description={q ? "Tidak ada hasil untuk pencarian ini." : "Data belum tersedia."}
              action={
                canCreate ? (
                  <CreateUnitDialog
                    action={createUnitAction}
                    parentOptions={parentOptions}
                    badanHukumOptions={badanHukumOptions}
                    keuskupanUnit={keuskupanUnit}
                  />
                ) : null
              }
            />
          ) : (
            <DataTable minWidth="920px">
              <table className={tableClassName}>
                <thead className={tableHeadClassName}>
                  <tr>
                    <th className={tableHeaderCellClassName}>Kode</th>
                    <th className={tableHeaderCellClassName}>Nama</th>
                    <th className={tableHeaderCellClassName}>Jenis</th>
                    <th className={tableHeaderCellClassName}>Kategori</th>
                    <th className={tableHeaderCellClassName}>Unit induk</th>
                    <th className={tableHeaderCellClassName}>Induk hukum</th>
                    <th className={tableHeaderCellClassName}>Penanggung jawab</th>
                    <th className={tableHeaderCellClassName}>Alamat</th>
                    {(canUpdate || canDelete) && <th className={tableHeaderCellClassName}>Aksi</th>}
                  </tr>
                </thead>
                <tbody className={tableBodyClassName}>
                  {paginated.rows.map(({ unit, parentName, legalParentDisplay }) => {

                    return (
                      <tr key={unit.id} className={tableRowClassName}>
                        <td className="px-4 py-3 font-medium text-slate-900">{unit.code}</td>
                        <td className={tableCellClassName}>{unit.name}</td>
                        <td className={tableCellClassName}>{unit.kind}</td>
                        <td className={tableCellClassName}>{unit.category ?? "-"}</td>
                        <td className={tableCellClassName}>{parentName}</td>
                        <td className={tableCellClassName}>{legalParentDisplay}</td>
                        <td className={tableCellClassName}>{unit.responsiblePerson ?? "-"}</td>
                        <td className={tableCellClassName}>{truncate(unit.address)}</td>
                        {(canUpdate || canDelete) && (
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              {canUpdate ? (
                                <Link
                                  href={`/master-data/units/${unit.id}/edit`}
                                  className="inline-flex items-center justify-center rounded-md border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
                                  title="Edit Unit"
                                >
                                  <Pencil className="h-4 w-4" />
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
                                    className="inline-flex items-center justify-center rounded-md border border-rose-200 p-1.5 text-rose-700 hover:bg-rose-50 hover:text-rose-900 shadow-sm"
                                    title="Hapus Unit"
                                  >
                                    <Trash2 className="h-4 w-4" />
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
            </DataTable>
          )}
          <PaginationControls
            pathname="/master-data/units"
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
