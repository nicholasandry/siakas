import type { SortOption } from "@/lib/list-view";

type ListToolbarProps<TSort extends string = string> = {
  q: string;
  sort: TSort;
  sortOptions: readonly SortOption<TSort>[];
  searchPlaceholder?: string;
  pageSize: number;
  hiddenFields?: Record<string, string | number | Array<string | number> | undefined>;
};

export function ListToolbar<TSort extends string>({
  q,
  sort,
  sortOptions,
  searchPlaceholder = "Cari data...",
  pageSize,
  hiddenFields = {},
}: ListToolbarProps<TSort>) {
  return (
    <form className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[minmax(220px,1fr)_220px_140px_auto]">
      {Object.entries(hiddenFields).flatMap(([key, value]) => {
        if (value === undefined || value === "") return [];
        if (Array.isArray(value)) {
          return value.map((item) => <input key={`${key}-${item}`} type="hidden" name={key} value={item} />);
        }

        return [<input key={key} type="hidden" name={key} value={value} />];
      })}
      <input
        type="search"
        name="q"
        defaultValue={q}
        placeholder={searchPlaceholder}
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
      />
      <select
        name="sort"
        defaultValue={sort}
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <select
        name="pageSize"
        defaultValue={pageSize}
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
      >
        {[10, 25, 50, 100].map((size) => (
          <option key={size} value={size}>
            {size} / halaman
          </option>
        ))}
      </select>
      <button type="submit" className="h-10 rounded-lg bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800">
        Terapkan
      </button>
    </form>
  );
}
