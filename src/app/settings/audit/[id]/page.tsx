import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auditPageView, getAuditLogById } from "@/lib/audit";
import { formatAuditAction, formatAuditEntity } from "@/lib/audit-labels";
import { requirePageAccess } from "@/lib/server-guards";

const actionClassName =
  "inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-medium text-white transition-colors hover:bg-slate-800";

function formatTimestamp(value: Date) {
  return value.toLocaleString("id-ID", {
    dateStyle: "full",
    timeStyle: "medium",
  });
}

function formatJsonBlock(value: string | null) {
  if (!value) {
    return "—";
  }

  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

export default async function AuditLogDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { id } = await params;
  const { returnTo } = await searchParams;
  const { user } = await requirePageAccess("audit.read");
  const log = await getAuditLogById(id);

  if (!log) {
    notFound();
  }

  await auditPageView(user.id, {
    entity: "audit_log",
    entityId: log.id,
    view: "detail",
    metadata: { action: log.action, targetEntity: log.entity },
  });

  const backHref = returnTo && returnTo.startsWith("/settings/audit") ? returnTo : "/settings/audit";

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Settings / Audit / Detail</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">Detail audit</h1>
          <p className="text-sm text-slate-600">{formatTimestamp(log.createdAt)}</p>
        </div>
        <Link href={backHref} className={actionClassName}>
          Kembali ke daftar
        </Link>
      </section>

      <Card className="border-white/70 bg-white/85 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle className="text-xl">Ringkasan</CardTitle>
          <CardDescription>ID entri: {log.id}</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Aktor</dt>
              <dd className="mt-1 text-sm text-slate-900">{log.actorName ?? "Sistem"}</dd>
              <dd className="text-xs text-slate-500">{log.actorEmail ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Aksi</dt>
              <dd className="mt-1 text-sm text-slate-900">{formatAuditAction(log.action)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Entitas</dt>
              <dd className="mt-1 text-sm text-slate-900">{formatAuditEntity(log.entity)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">ID entitas</dt>
              <dd className="mt-1 font-mono text-xs text-slate-700">{log.entityId ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Alamat IP</dt>
              <dd className="mt-1 text-sm text-slate-900">{log.ipAddress ?? "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">User agent</dt>
              <dd className="mt-1 break-all text-sm text-slate-700">{log.userAgent ?? "—"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-white/70 bg-white/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg">Before data</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-[480px] overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
              {formatJsonBlock(log.beforeData)}
            </pre>
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-white/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg">After data</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-[480px] overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
              {formatJsonBlock(log.afterData)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
