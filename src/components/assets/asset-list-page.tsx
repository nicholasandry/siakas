import Link from "next/link";
import { Eye, Pencil, Trash2, ExternalLink } from "lucide-react";

import { AssetQuickPlacementButton } from "@/components/assets/asset-quick-placement-dialog";
import { AssetQuickUpdateButton } from "@/components/assets/asset-quick-update-dialog";
import { StartAssetDisposalButton } from "@/components/assets/start-asset-disposal-button";
import { ActionAlert } from "@/components/ui/action-alert";
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
import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown";
import { PageHeader } from "@/components/ui/page-header";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auditPageView } from "@/lib/audit";
import { isInactiveAssetStatus } from "@/lib/assets/status";
import { listActiveAssetDisposalsByAssetIds } from "@/lib/asset-disposals";
import { listAssetLookups, listAssets } from "@/lib/assets";
import { canStartAssetDisposalFromAssetStatus } from "@/lib/assets/status";
import { hasPermission } from "@/lib/authz";
import { assetTypeConfigs, type AssetType } from "@/lib/asset-types";
import { assetStatusLabels, assetTypeLabels, labelFromMap } from "@/lib/formatters";
import { compareText, normalizeListParams, paginateRows, searchRows, sortRows, type SortOption } from "@/lib/list-view";
import { requireAuthenticatedScope } from "@/lib/server-guards";

type AssetListPageProps = {
  error?: string;
  assetType?: AssetType;
  searchParams?: {
    q?: string;
    sort?: string;
    page?: string;
    pageSize?: string;
    unitId?: string | string[];
  };
};

type AssetSort = "code-asc" | "name-asc" | "type-asc" | "status-asc";

const assetSortOptions = [
  { value: "code-asc", label: "Kode A-Z" },
  { value: "name-asc", label: "Nama A-Z" },
  { value: "type-asc", label: "Jenis A-Z" },
  { value: "status-asc", label: "Status A-Z" },
] as const satisfies readonly SortOption<AssetSort>[];

function normalizeSelectedUnitIds(value: string | string[] | undefined, allowedUnitIds: Set<string>) {
  const raw = Array.isArray(value) ? value : value ? [value] : [];
  return [...new Set(raw.filter((unitId) => allowedUnitIds.has(unitId)))];
}

function unitFilterLabel(unit: { id: string; name: string; code?: string | null; unitName?: string | null }) {
  return unit.code ? `${unit.code} - ${unit.name}` : unit.name;
}

export async function AssetListPage({ error, assetType, searchParams = {} }: AssetListPageProps) {
  const { user, scope } = await requireAuthenticatedScope("asset.read");
  const [assets, lookups] = await Promise.all([listAssets(scope, assetType), listAssetLookups(scope)]);
  const canCreate = hasPermission(user, "asset.create");
  const canUpdate = hasPermission(user, "asset.update");
  const canViewDisposal = hasPermission(user, "asset.disposal.view");
  const canCreateDisposal = hasPermission(user, "asset.disposal.create");
  const currentType = assetTypeConfigs.find((item) => item.type === assetType);
  const allowedUnitIds = new Set(lookups.units.map((unit) => unit.id));
  const selectedUnitIds = normalizeSelectedUnitIds(searchParams.unitId, allowedUnitIds);
  const selectedUnitIdSet = new Set(selectedUnitIds);
  const unitFilteredAssets =
    selectedUnitIdSet.size > 0 ? assets.filter((asset) => asset.unitId && selectedUnitIdSet.has(asset.unitId)) : assets;
  const { q, sort, page, pageSize } = normalizeListParams(
    searchParams,
    assetSortOptions.map((option) => option.value),
    "code-asc"
  );
  const filteredAssets = searchRows(unitFilteredAssets, q, (asset) =>
    [asset.code, asset.name, asset.assetType, asset.unitName, asset.badanHukumName, asset.locationName, asset.status].filter(Boolean).join(" ")
  );
  const sortedAssets = sortRows(filteredAssets, (a, b) => {
    if (sort === "name-asc") return compareText(a.name, b.name);
    if (sort === "type-asc") return compareText(a.assetType, b.assetType) || compareText(a.name, b.name);
    if (sort === "status-asc") return compareText(a.status, b.status) || compareText(a.name, b.name);
    return compareText(a.code, b.code);
  });
  const paginated = paginateRows(sortedAssets, page, pageSize);
  const activeDisposalsByAssetId = await listActiveAssetDisposalsByAssetIds(paginated.rows.map((asset) => asset.id));
  const pathname = assetType ? `/assets/${assetType}` : "/assets";

  await auditPageView(user.id, {
    entity: "asset",
    view: assetType ? `list-${assetType}` : "list",
    metadata: { count: assets.length, filteredCount: filteredAssets.length, assetType, q, sort, unitIds: selectedUnitIds },
  });

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
      <ActionAlert message={error} />

      <PageHeader
        eyebrow={assetType ? `Aset / ${currentType?.label}` : "Aset"}
        title={assetType ? `Daftar aset ${currentType?.label.toLowerCase()}` : "Registrasi aset"}
        description={assetType ? undefined : "Daftar aset"}
        actions={
          <>
            {assetType ? (
              <Link
                href="/assets"
                className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Semua aset
              </Link>
            ) : null}
            {canCreate && assetType ? (
              <Link
                href={`/assets/${assetType}/new`}
                className="inline-flex h-10 items-center rounded-lg bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800"
              >
                Tambah {currentType?.label}
              </Link>
            ) : null}
          </>
        }
      />

      {!assetType && canCreate ? (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {assetTypeConfigs.map((item) => (
            <Card key={item.type} className="border-slate-200 bg-white shadow-sm">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-base">{item.label}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 p-5 pt-0">
                <Link
                  href={`/assets/${item.type}`}
                  className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Lihat daftar
                </Link>
                <Link
                  href={`/assets/${item.type}/new`}
                  className="inline-flex h-9 items-center rounded-lg bg-slate-950 px-3 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Tambah
                </Link>
              </CardContent>
            </Card>
          ))}
        </section>
      ) : null}

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="p-5">
          <CardTitle className="text-xl">{assetType ? `Daftar ${currentType?.label}` : "Daftar aset"}</CardTitle>
          <CardDescription>{filteredAssets.length} dari {assets.length} aset terdata.</CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <ListToolbar
            q={q}
            sort={sort}
            sortOptions={assetSortOptions}
            pageSize={pageSize}
            searchPlaceholder="Cari kode, nama, unit, lokasi..."
            hiddenFields={{ unitId: selectedUnitIds }}
          />
          {lookups.units.length > 0 ? (
            <form className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-[minmax(260px,1fr)_auto_auto] md:items-end">
              <input type="hidden" name="q" value={q} />
              <input type="hidden" name="sort" value={sort} />
              <input type="hidden" name="pageSize" value={pageSize} />
              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>Filter unit</span>
                <MultiSelectDropdown
                  name="unitId"
                  options={lookups.units.map((unit) => ({ value: unit.id, label: unitFilterLabel(unit) }))}
                  selectedValues={selectedUnitIds}
                  placeholder="Semua unit"
                  searchPlaceholder="Cari unit..."
                />
              </label>
              {selectedUnitIds.length > 0 ? (
                <Link
                  href={pathname}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Reset unit
                </Link>
              ) : (
                <span className="hidden md:block" />
              )}
              <button type="submit" className="h-10 rounded-lg bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800">
                Terapkan
              </button>
              <div className="text-xs text-slate-600 md:col-span-3">
                Pilih paroki saja untuk aset paroki, unit saja untuk aset unit, atau keduanya untuk menampilkan semua pilihan.
              </div>
            </form>
          ) : null}
          {paginated.rows.length === 0 ? (
            <EmptyState
              title={q ? "Tidak ada aset yang cocok" : assetType ? `Belum ada aset ${currentType?.label.toLowerCase()}` : "Belum ada aset"}
              description={q ? "Tidak ada hasil untuk pencarian ini." : "Data belum tersedia."}
              action={
                canCreate ? (
                  <Link
                    href={assetType ? `/assets/${assetType}/new` : "/assets/tanah/new"}
                    className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Tambah aset
                  </Link>
                ) : null
              }
            />
          ) : (
            <DataTable minWidth="880px">
              <table className={tableClassName}>
                <thead className={tableHeadClassName}>
                  <tr>
                    <th className={tableHeaderCellClassName}>Kode</th>
                    <th className={tableHeaderCellClassName}>Nama</th>
                    {!assetType ? <th className={tableHeaderCellClassName}>Jenis</th> : null}
                    <th className={tableHeaderCellClassName}>Unit</th>
                    <th className={tableHeaderCellClassName}>Lokasi</th>
                    <th className={tableHeaderCellClassName}>Badan hukum</th>
                    <th className={tableHeaderCellClassName}>Status</th>
                    <th className={tableHeaderCellClassName}>Aksi</th>
                  </tr>
                </thead>
                <tbody className={tableBodyClassName}>
                  {paginated.rows.map((asset) => {
                    const activeDisposalId = activeDisposalsByAssetId.get(asset.id);

                    return (
                    <tr key={asset.id} className={tableRowClassName}>
                      <td className="px-4 py-3 font-medium text-slate-900">{asset.code}</td>
                      <td className={tableCellClassName}>{asset.name}</td>
                      {!assetType ? <td className={tableCellClassName}>{labelFromMap(asset.assetType, assetTypeLabels)}</td> : null}
                      <td className={tableCellClassName}>{asset.unitName ?? "-"}</td>
                      <td className={tableCellClassName}>{asset.locationName ?? "-"}</td>
                      <td className={tableCellClassName}>{asset.badanHukumName ?? "-"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={asset.status === "active" ? "success" : isInactiveAssetStatus(asset.status) ? "warning" : "neutral"}>
                          {labelFromMap(asset.status, assetStatusLabels)}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/assets/${asset.id}`}
                            className="inline-flex items-center justify-center rounded-md border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                            title="Detail Aset"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          {canUpdate ? (
                            <>
                              <AssetQuickUpdateButton
                                asset={{
                                  id: asset.id,
                                  code: asset.code,
                                  name: asset.name,
                                  assetType: asset.assetType,
                                  status: asset.status,
                                  condition: asset.condition,
                                  loanedTo: asset.loanedTo,
                                }}
                                formAssetStatuses={lookups.formAssetStatuses}
                                returnPath={`${pathname}?${new URLSearchParams({
                                  ...(q ? { q } : {}),
                                  ...(sort ? { sort } : {}),
                                  page: String(paginated.page),
                                  pageSize: String(paginated.pageSize),
                                  ...Object.fromEntries(selectedUnitIds.map((unitId) => ["unitId", unitId])),
                                }).toString()}`}
                              />
                              <AssetQuickPlacementButton
                                asset={{
                                  id: asset.id,
                                  code: asset.code,
                                  name: asset.name,
                                  assetType: asset.assetType,
                                  ownershipLevel: asset.ownershipLevel,
                                  status: asset.status,
                                  unitId: asset.unitId,
                                  locationId: asset.locationId,
                                }}
                                locations={lookups.locations}
                                returnPath={`${pathname}?${new URLSearchParams({
                                  ...(q ? { q } : {}),
                                  ...(sort ? { sort } : {}),
                                  page: String(paginated.page),
                                  pageSize: String(paginated.pageSize),
                                  ...Object.fromEntries(selectedUnitIds.map((unitId) => ["unitId", unitId])),
                                }).toString()}`}
                              />
                              <Link
                                href={`/assets/${asset.id}/edit`}
                                className="inline-flex items-center justify-center rounded-md border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                                title="Edit Aset"
                              >
                                <Pencil className="h-4 w-4" />
                              </Link>
                            </>
                          ) : null}
                          {canViewDisposal && activeDisposalId ? (
                            <Link
                              href={`/assets/disposals/${activeDisposalId}`}
                              className="inline-flex items-center justify-center rounded-md border border-amber-200 bg-white p-1.5 text-amber-700 hover:bg-amber-50 hover:text-amber-900"
                              title="Buka Disposal"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          ) : null}
                          {canCreateDisposal && canStartAssetDisposalFromAssetStatus(asset.status, Boolean(activeDisposalId)) ? (
                            <StartAssetDisposalButton
                              assetId={asset.id}
                              assetName={asset.name}
                              assetStatus={asset.status}
                              className="inline-flex items-center justify-center rounded-md border border-rose-200 p-1.5 text-rose-700 hover:bg-rose-50 hover:text-rose-900"
                              title="Hapus Aset"
                            >
                              <Trash2 className="h-4 w-4" />
                            </StartAssetDisposalButton>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </DataTable>
          )}
          <PaginationControls
            pathname={pathname}
            q={q}
            sort={sort}
            page={paginated.page}
            pageSize={paginated.pageSize}
            total={paginated.total}
            totalPages={paginated.totalPages}
            start={paginated.start}
            end={paginated.end}
            extraParams={{ unitId: selectedUnitIds }}
          />
        </CardContent>
      </Card>
    </main>
  );
}
