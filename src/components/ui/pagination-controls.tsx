import Link from "next/link";

import { buildListUrl } from "@/lib/list-view";

type PaginationControlsProps = {
  pathname: string;
  q: string;
  sort: string;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  start: number;
  end: number;
  extraParams?: Record<string, string | number | Array<string | number> | undefined>;
};

export function PaginationControls({ pathname, q, sort, page, pageSize, total, totalPages, start, end, extraParams = {} }: PaginationControlsProps) {
  const current = { ...extraParams, q, sort, pageSize };

  return (
    <div className="mt-4 flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
      <p>
        Menampilkan {start}-{end} dari {total} data
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link
            href={buildListUrl(pathname, current, { page: page - 1 })}
            className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
          >
            Sebelumnya
          </Link>
        ) : null}
        <span className="rounded-lg bg-slate-100 px-3 py-1.5 font-medium text-slate-700">
          {page}/{totalPages}
        </span>
        {page < totalPages ? (
          <Link
            href={buildListUrl(pathname, current, { page: page + 1 })}
            className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
          >
            Selanjutnya
          </Link>
        ) : null}
      </div>
    </div>
  );
}
