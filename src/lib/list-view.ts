export type SortOption<T extends string = string> = {
  value: T;
  label: string;
};

export type ListSearchParams<TSort extends string = string> = {
  q?: string;
  sort?: TSort;
  page?: string;
  pageSize?: string;
};

export function normalizeListParams<TSort extends string>(
  params: ListSearchParams<TSort>,
  allowedSorts: readonly TSort[],
  defaultSort: TSort
) {
  const q = params.q?.trim() ?? "";
  const sort = params.sort && allowedSorts.includes(params.sort) ? params.sort : defaultSort;
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const pageSize = Math.min(100, Math.max(5, Number(params.pageSize ?? "10") || 10));

  return { q, sort, page, pageSize };
}

export function searchRows<T>(rows: T[], query: string, getSearchText: (row: T) => string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return rows;

  return rows.filter((row) => getSearchText(row).toLowerCase().includes(normalized));
}

export function sortRows<T>(rows: T[], compare: (a: T, b: T) => number) {
  return [...rows].sort(compare);
}

export function compareText(a: string | null | undefined, b: string | null | undefined) {
  return (a ?? "").localeCompare(b ?? "", "id", { numeric: true, sensitivity: "base" });
}

export function compareNumber(a: number | null | undefined, b: number | null | undefined) {
  return (a ?? 0) - (b ?? 0);
}

export function paginateRows<T>(rows: T[], page: number, pageSize: number) {
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    rows: rows.slice(start, start + pageSize),
    page: safePage,
    pageSize,
    total,
    totalPages,
    start: total === 0 ? 0 : start + 1,
    end: Math.min(start + pageSize, total),
  };
}

type ListUrlParamValue = string | number | Array<string | number> | undefined;

export function buildListUrl(pathname: string, current: Record<string, ListUrlParamValue>, overrides: Record<string, ListUrlParamValue>) {
  const params = new URLSearchParams();
  const next = { ...current, ...overrides };

  for (const [key, value] of Object.entries(next)) {
    if (value === undefined || value === "" || (key === "page" && Number(value) <= 1)) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== undefined && item !== "") {
          params.append(key, String(item));
        }
      }
      continue;
    }
    params.set(key, String(value));
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
