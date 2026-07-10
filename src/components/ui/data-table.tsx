import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type DataTableProps = {
  children: ReactNode;
  minWidth?: string;
  mobileHint?: string;
  className?: string;
};

export function DataTable({
  children,
  minWidth = "900px",
  mobileHint = "Geser ke samping untuk melihat kolom lain pada layar kecil.",
  className,
}: DataTableProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs text-slate-500 md:hidden">{mobileHint}</p>
      <div className="overflow-x-auto rounded-xl border border-slate-200 [-webkit-overflow-scrolling:touch]">
        <div style={{ minWidth }}>{children}</div>
      </div>
    </div>
  );
}

export const tableClassName = "w-full divide-y divide-slate-200 text-sm";
export const tableHeadClassName = "bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600";
export const tableBodyClassName = "divide-y divide-slate-200 bg-white";
export const tableRowClassName = "align-top transition hover:bg-slate-50/80";
export const tableHeaderCellClassName = "px-4 py-3";
export const tableCellClassName = "px-4 py-3 text-slate-700";
