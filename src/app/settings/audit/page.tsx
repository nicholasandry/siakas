import Link from "next/link";
import { Filter } from "lucide-react";

import { ActionAlert } from "@/components/ui/action-alert";
import { AuditLogFilters } from "@/components/settings/audit-log-filters";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { countAuditLogs, listAuditActorOptions, listAuditLogs, auditPageView } from "@/lib/audit";
import { formatAuditAction, formatAuditEntity } from "@/lib/audit-labels";
import { requirePageAccess } from "@/lib/server-guards";

const actionClassName =
  "inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const pageSize = 50;

function formatTimestamp(value: Date) {
  return value.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function truncateJson(value: string | null, max = 80) {
  if (!value) return "—";
  const compact = value.replace(/\s+/g, " ");
  return compact.length > max ? `${compact.slice(0, max)}…` : compact;
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
    page?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;
  const { user } = await requirePageAccess("audit.read");

  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const action = params.action?.trim() || undefined;
  const entity = params.entity?.trim() || undefined;
  const actorUserId = params.actorUserId?.trim() || undefined;
  const dateFrom = params.dateFrom?.trim() || undefined;
  const dateTo = params.dateTo?.trim() || undefined;
  const offset = (page - 1) * pageSize;
  const filters = { action, entity, actorUserId, dateFrom, dateTo };

  const [logs, total, actorOptions] = await Promise.all([
    listAuditLogs({ ...filters, limit: pageSize, offset }),
    countAuditLogs(filters),
    listAuditActorOptions(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  await auditPageView(user.id, {
    entity: "audit_log",
    view: "list",
    metadata: { total, page, ...filters },
  });

  function buildFilterUrl(overrides: {
    action?: string;
    entity?: string;
    actorUserId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
  }) {
    const next = new URLSearchParams();
    const nextAction = overrides.action ?? action;
    const nextEntity = overrides.entity ?? entity;
    const nextActorUserId = overrides.actorUserId ?? actorUserId;
    const nextDateFrom = overrides.dateFrom ?? dateFrom;
    const nextDateTo = overrides.dateTo ?? dateTo;
    const nextPage = overrides.page ?? page;

    if (nextAction) next.set("action", nextAction);
    if (nextEntity) next.set("entity", nextEntity);
    if (nextActorUserId) next.set("actorUserId", nextActorUserId);
    if (nextDateFrom) next.set("dateFrom", nextDateFrom);
    if (nextDateTo) next.set("dateTo", nextDateTo);
    if (nextPage > 1) next.set("page", String(nextPage));

    const query = next.toString();
    return query ? `/settings/audit?${query}` : "/settings/audit";
  }

  const currentListUrl = buildFilterUrl({});

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <ActionAlert message={params.error} />

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Settings / Audit</p>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">Audit log</h1>
            <p className="text-base leading-7 text-slate-600">
              Riwayat aktivitas sistem: login, create, update, dan delete beserta data sebelum/sesudah.
            </p>
          </div>
          <Link href="/settings" className={actionClassName}>
            Kembali ke pengaturan
          </Link>
        </div>
      </section>

      <Card className="border-white/70 bg-white/85 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Filter className="h-5 w-5 text-amber-800" />
            Filter
          </CardTitle>
          <CardDescription>{total} entri cocok dengan filter saat ini.</CardDescription>
        </CardHeader>
        <CardContent>
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

      <Card className="border-white/70 bg-white/85 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle className="text-2xl">Riwayat aktivitas</CardTitle>
          <CardDescription>
            Halaman {page} dari {totalPages}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
              Belum ada entri audit yang cocok.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-[1100px] w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Waktu</th>
                    <th className="px-4 py-3">Aktor</th>
                    <th className="px-4 py-3">Aksi</th>
                    <th className="px-4 py-3">Entitas</th>
                    <th className="px-4 py-3">ID entitas</th>
                    <th className="px-4 py-3">Before</th>
                    <th className="px-4 py-3">After</th>
                    <th className="px-4 py-3">IP</th>
                    <th className="px-4 py-3">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {logs.map((log) => (
                    <tr key={log.id} className="align-top hover:bg-slate-50/70">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatTimestamp(log.createdAt)}</td>
                      <td className="px-4 py-3 text-slate-700">
                        <div className="font-medium text-slate-900">{log.actorName ?? "—"}</div>
                        <div className="text-xs text-slate-500">{log.actorEmail ?? "Sistem"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                          {formatAuditAction(log.action)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{formatAuditEntity(log.entity)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{log.entityId?.slice(0, 8) ?? "—"}</td>
                      <td className="max-w-[180px] px-4 py-3 font-mono text-xs text-slate-600" title={log.beforeData ?? undefined}>
                        {truncateJson(log.beforeData)}
                      </td>
                      <td className="max-w-[180px] px-4 py-3 font-mono text-xs text-slate-600" title={log.afterData ?? undefined}>
                        {truncateJson(log.afterData)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{log.ipAddress ?? "—"}</td>
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
            </div>
          )}

          {totalPages > 1 ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              {page > 1 ? (
                <Link href={buildFilterUrl({ page: page - 1 })} className="text-sm font-medium text-emerald-800 hover:underline">
                  ← Sebelumnya
                </Link>
              ) : (
                <span />
              )}
              {page < totalPages ? (
                <Link href={buildFilterUrl({ page: page + 1 })} className="text-sm font-medium text-emerald-800 hover:underline">
                  Selanjutnya →
                </Link>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
