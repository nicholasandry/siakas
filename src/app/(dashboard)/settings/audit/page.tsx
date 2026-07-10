import Link from "next/link";
import { Filter } from "lucide-react";

import { ActionAlert } from "@/components/ui/action-alert";
import { AuditLogFilters } from "@/components/settings/audit-log-filters";
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
import { countAuditLogs, listAuditActorOptions, listAuditLogs, auditPageView } from "@/lib/audit";
import { formatAuditAction, formatAuditEntity } from "@/lib/audit-labels";
import { normalizeListParams, type SortOption } from "@/lib/list-view";
import { requirePageAccess } from "@/lib/server-guards";

const actionClassName =
  "inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type AuditSort = "created-desc" | "created-asc" | "actor-asc" | "action-asc" | "entity-asc";

const auditSortOptions = [
  { value: "created-desc", label: "Terbaru" },
  { value: "created-asc", label: "Terlama" },
  { value: "actor-asc", label: "Aktor A-Z" },
  { value: "action-asc", label: "Aksi A-Z" },
  { value: "entity-asc", label: "Entitas A-Z" },
] as const satisfies readonly SortOption<AuditSort>[];

function formatTimestamp(value: Date) {
  return value.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function truncateJson(value: string | null, max = 80) {
  if (!value) return "-";
  const compact = value.replace(/\s+/g, " ");
  return compact.length > max ? `${compact.slice(0, max)}...` : compact;
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{
    action?: string;
    entity?: string;
    actorUserId?: string;
    dateFrom?: string;
    dateTo?: string;
    q?: string;
    sort?: AuditSort;
    page?: string;
    pageSize?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;
  const { user } = await requirePageAccess("audit.read");

  const listParams = normalizeListParams(
    params,
    auditSortOptions.map((option) => option.value),
    "created-desc"
  );
  const { q, sort, page, pageSize } = listParams;
  const action = params.action?.trim() || undefined;
  const entity = params.entity?.trim() || undefined;
  const actorUserId = params.actorUserId?.trim() || undefined;
  const dateFrom = params.dateFrom?.trim() || undefined;
  const dateTo = params.dateTo?.trim() || undefined;
  const offset = (page - 1) * pageSize;
  const filters = { action, entity, actorUserId, dateFrom, dateTo, q, sort };

  const [logs, total, actorOptions] = await Promise.all([
    listAuditLogs({ ...filters, limit: pageSize, offset }),
    countAuditLogs(filters),
    listAuditActorOptions(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  await auditPageView(user.id, {
    entity: "audit_log",
    view: "list",
    metadata: { total, page, pageSize, ...filters },
  });

  function buildFilterUrl(overrides: {
    action?: string;
    entity?: string;
    actorUserId?: string;
    dateFrom?: string;
    dateTo?: string;
    q?: string;
    sort?: string;
    pageSize?: number;
    page?: number;
  }) {
    const next = new URLSearchParams();
    const nextAction = overrides.action ?? action;
    const nextEntity = overrides.entity ?? entity;
    const nextActorUserId = overrides.actorUserId ?? actorUserId;
    const nextDateFrom = overrides.dateFrom ?? dateFrom;
    const nextDateTo = overrides.dateTo ?? dateTo;
    const nextQ = overrides.q ?? q;
    const nextSort = overrides.sort ?? sort;
    const nextPageSize = overrides.pageSize ?? pageSize;
    const nextPage = overrides.page ?? page;

    if (nextAction) next.set("action", nextAction);
    if (nextEntity) next.set("entity", nextEntity);
    if (nextActorUserId) next.set("actorUserId", nextActorUserId);
    if (nextDateFrom) next.set("dateFrom", nextDateFrom);
    if (nextDateTo) next.set("dateTo", nextDateTo);
    if (nextQ) next.set("q", nextQ);
    if (nextSort) next.set("sort", nextSort);
    if (nextPageSize !== 10) next.set("pageSize", String(nextPageSize));
    if (nextPage > 1) next.set("page", String(nextPage));

    const query = next.toString();
    return query ? `/settings/audit?${query}` : "/settings/audit";
  }

  const currentListUrl = buildFilterUrl({});

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
      <ActionAlert message={params.error} />

      <PageHeader
        eyebrow="Pengaturan / Audit"
        title="Audit log"
        description="Riwayat aktivitas sistem: login, create, update, dan delete beserta data sebelum/sesudah."
        actions={
          <Link href="/settings" className={actionClassName}>
            Kembali ke pengaturan
          </Link>
        }
      />

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="p-5">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5 text-amber-800" />
            Filter
          </CardTitle>
          <CardDescription>{total} entri cocok dengan filter saat ini.</CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <AuditLogFilters
            action={action}
            entity={entity}
            actorUserId={actorUserId}
            dateFrom={dateFrom}
            dateTo={dateTo}
            actorOptions={actorOptions}
          />
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="p-5">
          <CardTitle className="text-xl">Riwayat aktivitas</CardTitle>
          <CardDescription>
            Halaman {page} dari {totalPages}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <ListToolbar
            q={q}
            sort={sort}
            sortOptions={auditSortOptions}
            pageSize={pageSize}
            searchPlaceholder="Cari aktor, email, aksi, entitas, IP..."
            hiddenFields={{ action, entity, actorUserId, dateFrom, dateTo }}
          />
          {logs.length === 0 ? (
            <EmptyState title="Tidak ada entri audit" description="Tidak ada aktivitas yang cocok dengan filter saat ini." />
          ) : (
            <DataTable minWidth="1100px">
              <table className={tableClassName}>
                <thead className={tableHeadClassName}>
                  <tr>
                    <th className={tableHeaderCellClassName}>Waktu</th>
                    <th className={tableHeaderCellClassName}>Aktor</th>
                    <th className={tableHeaderCellClassName}>Aksi</th>
                    <th className={tableHeaderCellClassName}>Entitas</th>
                    <th className={tableHeaderCellClassName}>ID entitas</th>
                    <th className={tableHeaderCellClassName}>Before</th>
                    <th className={tableHeaderCellClassName}>After</th>
                    <th className={tableHeaderCellClassName}>IP</th>
                    <th className={tableHeaderCellClassName}>Detail</th>
                  </tr>
                </thead>
                <tbody className={tableBodyClassName}>
                  {logs.map((log) => (
                    <tr key={log.id} className={tableRowClassName}>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatTimestamp(log.createdAt)}</td>
                      <td className="px-4 py-3 text-slate-700">
                        <div className="font-medium text-slate-900">{log.actorName ?? "-"}</div>
                        <div className="text-xs text-slate-500">{log.actorEmail ?? "Sistem"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge>{formatAuditAction(log.action)}</StatusBadge>
                      </td>
                      <td className={tableCellClassName}>{formatAuditEntity(log.entity)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{log.entityId?.slice(0, 8) ?? "-"}</td>
                      <td className="max-w-[180px] px-4 py-3 font-mono text-xs text-slate-600" title={log.beforeData ?? undefined}>
                        {truncateJson(log.beforeData)}
                      </td>
                      <td className="max-w-[180px] px-4 py-3 font-mono text-xs text-slate-600" title={log.afterData ?? undefined}>
                        {truncateJson(log.afterData)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{log.ipAddress ?? "-"}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/settings/audit/${log.id}?returnTo=${encodeURIComponent(currentListUrl)}`}
                          className="text-xs font-medium text-emerald-800 hover:underline"
                        >
                          Lihat
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DataTable>
          )}

          <PaginationControls
            pathname="/settings/audit"
            q={q}
            sort={sort}
            page={page}
            pageSize={pageSize}
            total={total}
            totalPages={totalPages}
            start={total === 0 ? 0 : offset + 1}
            end={Math.min(offset + pageSize, total)}
            extraParams={{ action, entity, actorUserId, dateFrom, dateTo }}
          />
        </CardContent>
      </Card>
    </main>
  );
}
