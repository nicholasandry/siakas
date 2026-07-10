import Link from "next/link";

import type { AssetDashboardData } from "@/lib/asset-dashboard/asset-dashboard.types";
import { assetStatusLabels, assetTypeLabels, labelFromMap } from "@/lib/formatters";

type AssetDashboardFiltersProps = {
  data: AssetDashboardData;
};

const dimensionOptions = [
  { value: "ownedBy", label: "Dimiliki oleh" },
  { value: "financedBy", label: "Dibiayai oleh" },
  { value: "usedBy", label: "Dipakai oleh" },
  { value: "inputter", label: "Diinput oleh" },
  { value: "all", label: "Semua dimensi" },
];

const statusOptions = ["active", "on_loan", "in_maintenance", "expired_still_used", "under_disposal", "inactive", "lost"];

function yearOptions() {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 20 }, (_, index) => currentYear - index);
}

export function AssetDashboardFilters({ data }: AssetDashboardFiltersProps) {
  return (
    <form className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3 xl:grid-cols-6">
      <label className="space-y-2 text-sm font-medium text-slate-700 xl:col-span-2">
        <span>Organisasi</span>
        <select name="organizationId" defaultValue={data.params.organizationId} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">
          {data.organizationOptions.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.code ? `${unit.code} - ${unit.name}` : unit.name}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-2 text-sm font-medium text-slate-700">
        <span>Scope</span>
        <select name="scope" defaultValue={data.params.scope} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">
          <option value="direct">Direct</option>
          <option value="descendant">Descendant</option>
        </select>
      </label>
      <label className="space-y-2 text-sm font-medium text-slate-700">
        <span>Dimensi</span>
        <select name="dimension" defaultValue={data.params.dimension} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">
          {dimensionOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-2 text-sm font-medium text-slate-700">
        <span>Jenis aset</span>
        <select name="assetType" defaultValue={data.params.assetType ?? ""} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">
          <option value="">Semua</option>
          {Object.entries(assetTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-2 text-sm font-medium text-slate-700">
        <span>Tahun</span>
        <select name="acquisitionYear" defaultValue={data.params.acquisitionYear ?? ""} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">
          <option value="">Semua</option>
          {yearOptions().map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-2 text-sm font-medium text-slate-700">
        <span>Status</span>
        <select name="status" defaultValue={data.params.status ?? ""} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">
          <option value="">Semua</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {labelFromMap(status, assetStatusLabels)}
            </option>
          ))}
        </select>
      </label>
      <div className="flex gap-2 md:col-span-3 xl:col-span-6">
        <button type="submit" className="h-10 rounded-lg bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800">
          Terapkan
        </button>
        <Link href="/dashboard" className="inline-flex h-10 items-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Reset
        </Link>
      </div>
    </form>
  );
}
