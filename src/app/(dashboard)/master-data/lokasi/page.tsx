import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";

import { CreateAssetLocationDialog } from "@/components/master-data/create-asset-location-dialog";
import { ActionAlert } from "@/components/ui/action-alert";
import { ConfirmDeleteForm } from "@/components/ui/confirm-delete-form";
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
import { getAssetLocationKindLabel } from "@/lib/assets/location-kind";
import { auditPageView } from "@/lib/audit";
import { hasPermission } from "@/lib/authz";
import { compareText, normalizeListParams, paginateRows, searchRows, sortRows, type SortOption } from "@/lib/list-view";
import { listAssetLocations, listUnits } from "@/lib/master-data";
import { requireAuthenticatedScope } from "@/lib/server-guards";
import { createAssetLocationAction, deleteAssetLocationAction } from "./actions";

type LocationSort = "name-asc" | "unit-asc" | "code-asc" | "status-asc";

const locationSortOptions = [
  { value: "name-asc", label: "Nama A-Z" },
  { value: "unit-asc", label: "Unit A-Z" },
  { value: "code-asc", label: "Kode A-Z" },
  { value: "status-asc", label: "Status A-Z" },
] as const satisfies readonly SortOption<LocationSort>[];

function truncate(value: string | null | undefined, max = 52) {
  if (!value) return "-";
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

export default async function AssetLocationsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; q?: string; sort?: LocationSort; page?: string; pageSize?: string }>;
}) {
  const params = await searchParams;
  const { user, scope } = await requireAuthenticatedScope("unit.read");
  const [locations, units] = await Promise.all([listAssetLocations(scope), listUnits(scope)]);
  const canCreate = hasPermission(user, "unit.create");
  const canUpdate = hasPermission(user, "unit.update");
  const canDelete = hasPermission(user, "unit.delete");
  const { q, sort, page, pageSize } = normalizeListParams(
    params,
    locationSortOptions.map((option) => option.value),
    "name-asc"
  );
  const filteredRows = searchRows(locations, q, (location) =>
    [location.name, location.code, location.unitName, location.unitCode, location.description, getAssetLocationKindLabel(location.locationKind), location.isActive ? "aktif" : "nonaktif"]
      .filter(Boolean)
      .join(" ")
  );
  const sortedRows = sortRows(filteredRows, (a, b) => {
    if (sort === "unit-asc") return compareText(a.unitName, b.unitName) || compareText(a.name, b.name);
    if (sort === "code-asc") return compareText(a.code, b.code) || compareText(a.name, b.name);
    if (sort === "status-asc") return compareText(String(a.isActive), String(b.isActive)) || compareText(a.name, b.name);
    return compareText(a.name, b.name);
  });
  const paginated = paginateRows(sortedRows, page, pageSize);

  await auditPageView(user.id, {
    entity: "asset_location",
    view: "list",
    metadata: { count: locations.length, filteredCount: filteredRows.length, q, sort },
  });

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
      <ActionAlert message={params.error} />

      <PageHeader
        eyebrow="Master Data / Lokasi"
        title="Master lokasi"
        description="Daftar ruangan atau lokasi aset per unit."
        actions={
          <>
            {canCreate ? <CreateAssetLocationDialog action={createAssetLocationAction} units={units} /> : null}
            <Link href="/master-data" className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Kembali
            </Link>
          </>
        }
      />

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="p-5">
          <CardTitle className="text-xl">Daftar lokasi</CardTitle>
          <CardDescription>{filteredRows.length} dari {locations.length} lokasi dalam scope akses Anda.</CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <ListToolbar q={q} sort={sort} sortOptions={locationSortOptions} pageSize={pageSize} searchPlaceholder="Cari nama, kode, unit..." />
          {paginated.rows.length === 0 ? (
            <EmptyState
              title={q ? "Tidak ada lokasi yang cocok" : "Belum ada lokasi"}
              description={q ? "Tidak ada hasil untuk pencarian ini." : "Tambahkan ruangan atau lokasi aset untuk unit Anda."}
              action={canCreate ? <CreateAssetLocationDialog action={createAssetLocationAction} units={units} /> : null}
            />
          ) : (
            <DataTable minWidth="860px">
              <table className={tableClassName}>
                <thead className={tableHeadClassName}>
                  <tr>
                    <th className={tableHeaderCellClassName}>Nama</th>
                    <th className={tableHeaderCellClassName}>Kode</th>
                    <th className={tableHeaderCellClassName}>Unit</th>
                    <th className={tableHeaderCellClassName}>Kategori</th>
                    <th className={tableHeaderCellClassName}>Keterangan</th>
                    <th className={tableHeaderCellClassName}>Status</th>
                    {(canUpdate || canDelete) && <th className={tableHeaderCellClassName}>Aksi</th>}
                  </tr>
                </thead>
                <tbody className={tableBodyClassName}>
                  {paginated.rows.map((location) => (
                    <tr key={location.id} className={tableRowClassName}>
                      <td className="px-4 py-3 font-medium text-slate-900">{location.name}</td>
                      <td className={tableCellClassName}>{location.code ?? "-"}</td>
                      <td className={tableCellClassName}>{location.unitName ?? "-"}</td>
                      <td className={tableCellClassName}>{getAssetLocationKindLabel(location.locationKind)}</td>
                      <td className={tableCellClassName}>{truncate(location.description)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={location.isActive ? "success" : "neutral"}>{location.isActive ? "Aktif" : "Nonaktif"}</StatusBadge>
                      </td>
                      {(canUpdate || canDelete) ? (
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {canUpdate ? (
                              <Link
                                href={`/master-data/lokasi/${location.id}/edit`}
                                className="inline-flex items-center justify-center rounded-md border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
                                title="Edit Lokasi"
                              >
                                <Pencil className="h-4 w-4" />
                              </Link>
                            ) : null}
                            {canDelete ? (
                              <ConfirmDeleteForm action={deleteAssetLocationAction} confirmMessage={`Hapus lokasi "${location.name}"? Aset yang memakai lokasi ini akan dikosongkan.`}>
                                <input type="hidden" name="id" value={location.id} />
                                <button
                                  type="submit"
                                  className="inline-flex items-center justify-center rounded-md border border-rose-200 p-1.5 text-rose-700 hover:bg-rose-50 hover:text-rose-900 shadow-sm"
                                  title="Hapus Lokasi"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </ConfirmDeleteForm>
                            ) : null}
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </DataTable>
          )}
          <PaginationControls
            pathname="/master-data/lokasi"
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
