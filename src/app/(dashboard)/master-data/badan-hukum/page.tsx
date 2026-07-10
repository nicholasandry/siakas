import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";

import { CreateBadanHukumDialog } from "@/components/master-data/create-badan-hukum-dialog";
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
import { StatusBadge } from "@/components/ui/status-badge";
import { ActionAlert } from "@/components/ui/action-alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auditPageView } from "@/lib/audit";
import { createBadanHukumAction, deleteBadanHukumAction } from "./actions";
import { hasPermission } from "@/lib/authz";
import { compareText, normalizeListParams, paginateRows, searchRows, sortRows, type SortOption } from "@/lib/list-view";
import { listBadanHukums } from "@/lib/master-data";
import { requireAuthenticatedScope } from "@/lib/server-guards";

const secondaryActionClassName =
  "inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function formatDate(value: string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("id-ID");
}

type BadanHukumSort = "name-asc" | "type-asc" | "field-asc" | "status-asc";

const badanHukumSortOptions = [
  { value: "name-asc", label: "Nama A-Z" },
  { value: "type-asc", label: "Jenis A-Z" },
  { value: "field-asc", label: "Bidang A-Z" },
  { value: "status-asc", label: "Status A-Z" },
] as const satisfies readonly SortOption<BadanHukumSort>[];

export default async function BadanHukumPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; q?: string; sort?: BadanHukumSort; page?: string; pageSize?: string }>;
}) {
  const params = await searchParams;
  const { error } = params;
  const { user, scope } = await requireAuthenticatedScope("badan-hukum.read");
  const badanHukums = await listBadanHukums(scope);
  const canCreate = hasPermission(user, "badan-hukum.create");
  const canUpdate = hasPermission(user, "badan-hukum.update");
  const canDelete = hasPermission(user, "badan-hukum.delete");
  const { q, sort, page, pageSize } = normalizeListParams(
    params,
    badanHukumSortOptions.map((option) => option.value),
    "name-asc"
  );
  const filteredRows = searchRows(badanHukums, q, (item) =>
    [item.name, item.type, item.field, item.kemenkumhamNumber, item.representative, item.status].filter(Boolean).join(" ")
  );
  const sortedRows = sortRows(filteredRows, (a, b) => {
    if (sort === "type-asc") return compareText(a.type, b.type) || compareText(a.name, b.name);
    if (sort === "field-asc") return compareText(a.field, b.field) || compareText(a.name, b.name);
    if (sort === "status-asc") return compareText(a.status, b.status) || compareText(a.name, b.name);
    return compareText(a.name, b.name);
  });
  const paginated = paginateRows(sortedRows, page, pageSize);

  await auditPageView(user.id, {
    entity: "badan_hukum",
    view: "list",
    metadata: { count: badanHukums.length, filteredCount: filteredRows.length, q, sort },
  });

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
      <ActionAlert message={error} />

      <PageHeader
        eyebrow="Master Data / Badan Hukum"
        title="Daftar badan hukum"
        description="Data badan hukum."
        actions={
          <>
            {canCreate ? <CreateBadanHukumDialog action={createBadanHukumAction} /> : null}
            <Link href="/master-data" className={secondaryActionClassName}>
              Kembali
            </Link>
          </>
        }
      />

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xl">Daftar badan hukum</CardTitle>
            <CardDescription>{filteredRows.length} dari {badanHukums.length} data dalam scope akses Anda.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <ListToolbar q={q} sort={sort} sortOptions={badanHukumSortOptions} pageSize={pageSize} searchPlaceholder="Cari nama, jenis, bidang, SK..." />
          {paginated.rows.length === 0 ? (
            <EmptyState
              title={q ? "Tidak ada badan hukum yang cocok" : "Belum ada badan hukum"}
              description={q ? "Tidak ada hasil untuk pencarian ini." : "Data belum tersedia."}
              action={canCreate ? <CreateBadanHukumDialog action={createBadanHukumAction} /> : null}
            />
          ) : (
            <DataTable minWidth="980px">
              <table className={tableClassName}>
                <thead className={tableHeadClassName}>
                  <tr>
                    <th className={tableHeaderCellClassName}>Nama</th>
                    <th className={tableHeaderCellClassName}>Jenis</th>
                    <th className={tableHeaderCellClassName}>Bidang</th>
                    <th className={tableHeaderCellClassName}>SK Kemenkumham</th>
                    <th className={tableHeaderCellClassName}>Tgl pendirian</th>
                    <th className={tableHeaderCellClassName}>Pembina/Pengurus</th>
                    <th className={tableHeaderCellClassName}>Status</th>
                    {(canUpdate || canDelete) && <th className={tableHeaderCellClassName}>Aksi</th>}
                  </tr>
                </thead>
                <tbody className={tableBodyClassName}>
                  {paginated.rows.map((item) => (
                    <tr key={item.id} className={tableRowClassName}>
                      <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                      <td className={tableCellClassName}>{item.type}</td>
                      <td className={tableCellClassName}>{item.field}</td>
                      <td className={tableCellClassName}>{item.kemenkumhamNumber ?? "-"}</td>
                      <td className={tableCellClassName}>{formatDate(item.establishedAt)}</td>
                      <td className={tableCellClassName}>{item.representative ?? "-"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge>{item.status ?? "-"}</StatusBadge>
                      </td>
                      {(canUpdate || canDelete) && (
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {canUpdate ? (
                              <Link
                                href={`/master-data/badan-hukum/${item.id}/edit`}
                                className="inline-flex items-center justify-center rounded-md border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
                                title="Edit Badan Hukum"
                              >
                                <Pencil className="h-4 w-4" />
                              </Link>
                            ) : null}
                            {canDelete ? (
                              <ConfirmDeleteForm action={deleteBadanHukumAction} confirmMessage={`Hapus badan hukum "${item.name}"?`}>
                                <input type="hidden" name="id" value={item.id} />
                                <button
                                  type="submit"
                                  className="inline-flex items-center justify-center rounded-md border border-rose-200 p-1.5 text-rose-700 hover:bg-rose-50 hover:text-rose-900 shadow-sm"
                                  title="Hapus Badan Hukum"
                                >
                                  <Trash2 className="h-4 w-4" />
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
            </DataTable>
          )}
          <PaginationControls
            pathname="/master-data/badan-hukum"
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
