import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, FilePenLine, FileText, ScrollText, XCircle } from "lucide-react";

import { DataTable, tableBodyClassName, tableCellClassName, tableClassName, tableHeadClassName, tableHeaderCellClassName, tableRowClassName } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { auditPageView } from "@/lib/audit";
import { listAssetDisposals } from "@/lib/asset-disposals";
import { disposalMethodLabels, disposalReasonLabels, disposalStatusLabels } from "@/lib/asset-disposals/constants";
import { listDisposalFormLookups } from "@/lib/asset-disposals/lookups";
import { hasPermission } from "@/lib/authz";
import { assetTypeLabels, formatRupiahRp, labelFromMap } from "@/lib/formatters";
import { compareNumber, compareText, normalizeListParams, paginateRows, searchRows, sortRows, type SortOption } from "@/lib/list-view";
import { requireAuthenticatedScope } from "@/lib/server-guards";

type DisposalSort = "requested_desc" | "requested_asc" | "asset_asc" | "status_asc" | "book_value_desc" | "proceeds_desc";

const disposalSortOptions: readonly SortOption<DisposalSort>[] = [
  { value: "requested_desc", label: "Tanggal terbaru" },
  { value: "requested_asc", label: "Tanggal terlama" },
  { value: "asset_asc", label: "Aset A-Z" },
  { value: "status_asc", label: "Status A-Z" },
  { value: "book_value_desc", label: "Nilai buku terbesar" },
  { value: "proceeds_desc", label: "Jual/kompensasi terbesar" },
];

function statusTone(status: string): "success" | "neutral" | "warning" | "danger" | "info" {
  if (status === "COMPLETED" || status === "APPROVED") return "success";
  if (status === "REJECTED" || status === "CANCELLED") return "danger";
  if (status === "SUBMITTED" || status === "UNDER_REVIEW" || status === "WAITING_APPROVAL") return "warning";
  return "neutral";
}

function disposalProceeds(row: Awaited<ReturnType<typeof listAssetDisposals>>[number]) {
  const d = row.disposal;
  return d.saleNetAmount ?? d.compensationAmount ?? d.governmentCompensationAmount ?? d.insuranceClaimAmount ?? 0;
}

export default async function AssetDisposalsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: DisposalSort; page?: string; pageSize?: string; status?: string; reason?: string; method?: string }>;
}) {
  const params = await searchParams;
  const { user, scope } = await requireAuthenticatedScope("asset.disposal.view");
  const [rows, lookups] = await Promise.all([listAssetDisposals(scope), listDisposalFormLookups()]);
  const { q, sort, page, pageSize } = normalizeListParams(params, disposalSortOptions.map((option) => option.value), "requested_desc");
  const status = params.status ?? "";
  const reason = params.reason ?? "";
  const method = params.method ?? "";
  const canEditDisposal = hasPermission(user, "asset.disposal.edit");
  const reasonLabels = { ...disposalReasonLabels, ...Object.fromEntries(lookups.disposalReasonTypes.map((item) => [item.code, item.label])) };
  const methodLabels = { ...disposalMethodLabels, ...Object.fromEntries(lookups.disposalMethods.map((item) => [item.code, item.label])) };
  const activeCount = rows.filter((row) => ["SUBMITTED", "UNDER_REVIEW", "WAITING_APPROVAL", "APPROVED"].includes(row.disposal.status)).length;
  const draftCount = rows.filter((row) => row.disposal.status === "DRAFT").length;
  const completedCount = rows.filter((row) => row.disposal.status === "COMPLETED").length;
  const rejectedCount = rows.filter((row) => ["REJECTED", "CANCELLED"].includes(row.disposal.status)).length;
  const totalBookValue = rows.reduce((total, row) => total + (row.disposal.bookValueAtDisposal ?? 0), 0);
  const filteredRows = searchRows(
    rows.filter((row) => {
      const d = row.disposal;
      if (status && d.status !== status) return false;
      if (reason && d.disposalReasonType !== reason) return false;
      if (method && d.disposalMethod !== method) return false;
      return true;
    }),
    q,
    (row) => [
      row.assetCode,
      row.assetName,
      row.assetType,
      row.unitName,
      row.badanHukumName,
      row.disposal.status,
      labelFromMap(row.disposal.status, disposalStatusLabels),
      row.disposal.disposalReasonType,
      labelFromMap(row.disposal.disposalReasonType, reasonLabels),
      row.disposal.disposalMethod,
      labelFromMap(row.disposal.disposalMethod, methodLabels),
      row.disposal.requestedAt,
      row.disposal.effectiveDisposalDate,
    ].join(" ")
  );
  const sortedRows = sortRows(filteredRows, (a, b) => {
    if (sort === "requested_asc") return compareText(a.disposal.requestedAt, b.disposal.requestedAt);
    if (sort === "asset_asc") return compareText(a.assetCode, b.assetCode) || compareText(a.assetName, b.assetName);
    if (sort === "status_asc") return compareText(a.disposal.status, b.disposal.status);
    if (sort === "book_value_desc") return compareNumber(b.disposal.bookValueAtDisposal, a.disposal.bookValueAtDisposal);
    if (sort === "proceeds_desc") return compareNumber(disposalProceeds(b), disposalProceeds(a));
    return compareText(b.disposal.requestedAt, a.disposal.requestedAt);
  });
  const paginated = paginateRows(sortedRows, page, pageSize);
  await auditPageView(user.id, { entity: "asset_disposal", view: "list", metadata: { count: rows.length } });

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
      <PageHeader eyebrow="Aset" title="Disposal / Penghapusan Aset" description="Daftar pengajuan disposal aset untuk audit, workflow, dan laporan." />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Total pengajuan", value: rows.length, helper: formatRupiahRp(totalBookValue), icon: ScrollText, tone: "bg-slate-950 text-white" },
          { label: "Dalam proses", value: activeCount, helper: "Butuh tindak lanjut", icon: Clock3, tone: "bg-amber-50 text-amber-800" },
          { label: "Draft", value: draftCount, helper: "Belum diajukan", icon: FileText, tone: "bg-slate-100 text-slate-700" },
          { label: "Selesai", value: completedCount, helper: "Sudah final", icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-800" },
          { label: "Ditolak/Batal", value: rejectedCount, helper: "Tidak dilanjutkan", icon: XCircle, tone: "bg-rose-50 text-rose-800" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{item.value}</p>
                </div>
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.tone}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 truncate text-xs text-slate-500">{item.helper}</p>
            </div>
          );
        })}
      </section>

      {rows.length === 0 ? (
        <EmptyState title="Belum ada disposal aset" description="Pengajuan disposal dibuat dari halaman detail aset." />
      ) : (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <form className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[minmax(220px,1fr)_minmax(150px,190px)_minmax(150px,190px)_minmax(150px,190px)_minmax(150px,180px)_minmax(120px,150px)]">
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Cari aset, organisasi, alasan, cara, status..."
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
            />
            <select name="status" defaultValue={status} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20">
              <option value="">Semua status</option>
              {Object.entries(disposalStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select name="reason" defaultValue={reason} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20">
              <option value="">Semua alasan</option>
              {lookups.disposalReasonTypes.map((item) => <option key={item.code} value={item.code}>{item.label || labelFromMap(item.code, disposalReasonLabels)}</option>)}
            </select>
            <select name="method" defaultValue={method} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20">
              <option value="">Semua cara</option>
              {lookups.disposalMethods.map((item) => <option key={item.code} value={item.code}>{item.label || labelFromMap(item.code, disposalMethodLabels)}</option>)}
            </select>
            <select name="sort" defaultValue={sort} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20">
              {disposalSortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select name="pageSize" defaultValue={pageSize} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20">
              {[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size} / halaman</option>)}
            </select>
            <button type="submit" className="h-10 rounded-lg bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800 sm:col-span-2 lg:col-span-3 xl:col-span-6">Terapkan</button>
          </form>

          {paginated.rows.length === 0 ? (
            <EmptyState title="Data tidak ditemukan" description="Coba ubah kata kunci, filter, atau urutan data." />
          ) : (
            <>
              <DataTable minWidth="1180px">
                <table className={tableClassName}>
                  <thead className={tableHeadClassName}>
                    <tr>
                      <th className={tableHeaderCellClassName}>Tanggal</th>
                      <th className={tableHeaderCellClassName}>Aset</th>
                      <th className={tableHeaderCellClassName}>Organisasi</th>
                      <th className={tableHeaderCellClassName}>Disposal</th>
                      <th className={`${tableHeaderCellClassName} text-right`}>Nilai buku</th>
                      <th className={`${tableHeaderCellClassName} text-right`}>Jual/Kompensasi</th>
                      <th className={`${tableHeaderCellClassName} text-right`}>Selisih</th>
                      <th className={tableHeaderCellClassName}>Status</th>
                      <th className={`${tableHeaderCellClassName} text-right`}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody className={tableBodyClassName}>
                    {paginated.rows.map((row) => {
                      const d = row.disposal;
                      const proceeds = disposalProceeds(row);
                      const differenceTone = (d.disposalGainLossAmount ?? 0) > 0 ? "text-emerald-700" : (d.disposalGainLossAmount ?? 0) < 0 ? "text-rose-700" : "text-slate-700";
                      return (
                        <tr key={d.id} className={tableRowClassName}>
                          <td className="px-4 py-4 text-slate-700">
                            <div className="font-medium text-slate-900">{d.requestedAt}</div>
                            <div className="mt-1 text-xs text-slate-500">Efektif {d.effectiveDisposalDate}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="font-semibold text-slate-950">{row.assetCode}</div>
                            <div className="mt-1 max-w-64 truncate text-sm text-slate-600">{row.assetName}</div>
                            <div className="mt-2">
                              <StatusBadge tone="info">{labelFromMap(row.assetType, assetTypeLabels)}</StatusBadge>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-slate-700">
                            <div className="max-w-48 truncate">{row.unitName ?? row.badanHukumName ?? "-"}</div>
                            <div className="mt-1 text-xs text-slate-500">Pemilik aset</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="font-medium text-slate-900">{labelFromMap(d.disposalReasonType, reasonLabels)}</div>
                            <div className="mt-2">
                              <StatusBadge>{labelFromMap(d.disposalMethod, methodLabels)}</StatusBadge>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right font-medium text-slate-900">{formatRupiahRp(d.bookValueAtDisposal)}</td>
                          <td className="px-4 py-4 text-right text-slate-700">{formatRupiahRp(proceeds)}</td>
                          <td className={`px-4 py-4 text-right font-medium ${differenceTone}`}>{formatRupiahRp(d.disposalGainLossAmount)}</td>
                          <td className="px-4 py-4"><StatusBadge tone={statusTone(d.status)}>{labelFromMap(d.status, disposalStatusLabels)}</StatusBadge></td>
                          <td className="px-4 py-4 text-right">
                             <div className="flex justify-end gap-2">
                               {canEditDisposal && d.status === "DRAFT" ? (
                                 <Link
                                   href={`/assets/disposals/${d.id}/edit`}
                                   className="inline-flex items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 p-1.5 text-emerald-800 hover:bg-emerald-100 shadow-sm"
                                   title="Edit Disposal"
                                 >
                                   <FilePenLine className="h-4 w-4" />
                                 </Link>
                               ) : null}
                               <Link
                                 href={`/assets/disposals/${d.id}`}
                                 className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white p-1.5 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
                                 title="Detail Disposal"
                               >
                                 <ArrowRight className="h-4 w-4" />
                               </Link>
                             </div>
                           </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </DataTable>
              <PaginationControls
                pathname="/assets/disposals"
                q={q}
                sort={sort}
                page={paginated.page}
                pageSize={paginated.pageSize}
                total={paginated.total}
                totalPages={paginated.totalPages}
                start={paginated.start}
                end={paginated.end}
                extraParams={{ status, reason, method }}
              />
            </>
          )}
        </section>
      )}
    </main>
  );
}
