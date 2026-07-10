"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import { useMemo, useRef, useState } from "react";

type MultiSelectOption = {
  value: string;
  label: string;
};

type MultiSelectDropdownProps = {
  name: string;
  options: MultiSelectOption[];
  selectedValues?: string[];
  placeholder?: string;
  searchPlaceholder?: string;
};

export function MultiSelectDropdown({
  name,
  options,
  selectedValues = [],
  placeholder = "Pilih opsi",
  searchPlaceholder = "Cari...",
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(() => new Set(selectedValues));
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;

    return options.filter((option) => option.label.toLowerCase().includes(normalized));
  }, [options, query]);

  const selectedLabels = options.filter((option) => selected.has(option.value)).map((option) => option.label);
  const summary =
    selectedLabels.length === 0
      ? placeholder
      : selectedLabels.length <= 2
        ? selectedLabels.join(", ")
        : `${selectedLabels.slice(0, 2).join(", ")} +${selectedLabels.length - 2}`;

  function toggleValue(value: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }

      return next;
    });
  }

  return (
    <div className="relative">
      {[...selected].map((value) => (
        <input key={value} type="hidden" name={name} value={value} />
      ))}

      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 text-left text-sm text-slate-900 outline-none transition hover:bg-slate-50 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
      >
        <span className={selectedLabels.length === 0 ? "truncate text-slate-500" : "truncate"}>{summary}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-8 min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
              placeholder={searchPlaceholder}
            />
          </div>

          <div className="max-h-64 overflow-y-auto p-1">
            {filteredOptions.length === 0 ? <p className="px-3 py-2 text-sm text-slate-500">Tidak ada unit.</p> : null}
            {filteredOptions.map((option) => {
              const checked = selected.has(option.value);

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleValue(option.value)}
                  className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      checked ? "border-slate-950 bg-slate-950 text-white" : "border-slate-300 bg-white"
                    }`}
                  >
                    {checked ? <Check className="h-3 w-3" /> : null}
                  </span>
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>

          {selected.size > 0 ? (
            <div className="border-t border-slate-100 p-2">
              <button type="button" onClick={() => setSelected(new Set())} className="h-8 rounded-lg px-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                Hapus pilihan unit
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
