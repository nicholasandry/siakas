"use client";

import Link from "next/link";

import { FormSelect } from "@/components/ui/form-select";
import { auditActionOptions, auditEntityOptions } from "@/lib/audit-labels";

type ActorOption = {
  id: string;
  name: string;
  email: string;
};

type AuditLogFiltersProps = {
  action?: string;
  entity?: string;
  actorUserId?: string;
  dateFrom?: string;
  dateTo?: string;
  actorOptions: ActorOption[];
};

export function AuditLogFilters({ action, entity, actorUserId, dateFrom, dateTo, actorOptions }: AuditLogFiltersProps) {
  const hasFilters = Boolean(action || entity || actorUserId || dateFrom || dateTo);

  return (
    <form method="get" className="flex flex-wrap items-end gap-3">
      <FormSelect
        name="action"
        label="Aksi"
        defaultValue={action ?? ""}
        placeholder="Semua"
        emptyOptionLabel="Semua"
        options={auditActionOptions.map((item) => ({ value: item.value, label: item.label, searchText: item.label }))}
        labelClassName="space-y-1 text-sm font-medium text-slate-700"
        className="min-w-[10rem]"
      />
      <FormSelect
        name="entity"
        label="Entitas"
        defaultValue={entity ?? ""}
        placeholder="Semua"
        emptyOptionLabel="Semua"
        options={auditEntityOptions.map((item) => ({ value: item.value, label: item.label, searchText: item.label }))}
        labelClassName="space-y-1 text-sm font-medium text-slate-700"
        className="min-w-[12rem]"
      />
      <FormSelect
        name="actorUserId"
        label="Pengguna"
        defaultValue={actorUserId ?? ""}
        placeholder="Semua"
        emptyOptionLabel="Semua"
        options={actorOptions.map((item) => ({
          value: item.id,
          label: `${item.name} (${item.email})`,
          searchText: `${item.name} ${item.email}`,
        }))}
        labelClassName="space-y-1 text-sm font-medium text-slate-700"
        className="min-w-[12rem]"
      />
      <label className="space-y-1 text-sm font-medium text-slate-700">
        <span>Dari tanggal</span>
        <input
          type="date"
          name="dateFrom"
          defaultValue={dateFrom ?? ""}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
        />
      </label>
      <label className="space-y-1 text-sm font-medium text-slate-700">
        <span>Sampai tanggal</span>
        <input
          type="date"
          name="dateTo"
          defaultValue={dateTo ?? ""}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
        />
      </label>
      <button
        type="submit"
        className="inline-flex h-10 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-medium text-white hover:bg-slate-800"
      >
        Terapkan
      </button>
      {hasFilters ? (
        <Link href="/settings/audit" className="inline-flex h-10 items-center text-sm font-medium text-slate-600 hover:text-slate-900">
          Reset filter
        </Link>
      ) : null}
    </form>
  );
}
