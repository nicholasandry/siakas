"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

import { cn } from "@/lib/utils";

export type SearchableSelectOption = {
  value: string;
  label: string;
  searchText?: string;
};

export type SearchableSelectGroup = {
  label: string;
  options: SearchableSelectOption[];
};

type SearchableSelectProps = {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options?: SearchableSelectOption[];
  groups?: SearchableSelectGroup[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  required?: boolean;
  emptyMessage?: string;
  className?: string;
};

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function filterOptions(options: SearchableSelectOption[], query: string) {
  if (!query) {
    return options;
  }

  const normalized = normalizeSearch(query);

  return options.filter((option) => {
    const haystack = `${option.label} ${option.searchText ?? ""}`.toLowerCase();
    return haystack.includes(normalized);
  });
}

export function SearchableSelect({
  name,
  value,
  onChange,
  options = [],
  groups,
  placeholder = "Pilih opsi",
  searchPlaceholder = "Cari...",
  disabled = false,
  required = false,
  emptyMessage = "Tidak ada opsi ditemukan",
  className,
}: SearchableSelectProps) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const flatOptions = useMemo(() => {
    if (groups) {
      return groups.flatMap((group) => group.options);
    }

    return options;
  }, [groups, options]);

  const selectedLabel = flatOptions.find((option) => option.value === value)?.label;

  const filteredGroups = useMemo(() => {
    if (groups) {
      return groups
        .map((group) => ({
          ...group,
          options: filterOptions(group.options, query),
        }))
        .filter((group) => group.options.length > 0);
    }

    return null;
  }, [groups, query]);

  const filteredOptions = useMemo(() => {
    if (groups) {
      return null;
    }

    return filterOptions(options, query);
  }, [groups, options, query]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function selectOption(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
    setQuery("");
  }

  const hasResults = filteredGroups ? filteredGroups.length > 0 : (filteredOptions?.length ?? 0) > 0;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <input type="hidden" name={name} value={value} required={required} />

      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => {
          if (!disabled) {
            setOpen((current) => !current);
          }
        }}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500",
          !selectedLabel && "text-slate-500"
        )}
      >
        <span className="truncate">{selectedLabel ?? placeholder}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-500 transition", open && "rotate-180")} />
      </button>

      {open ? (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                autoFocus
              />
            </div>
          </div>

          <div id={listboxId} role="listbox" className="max-h-64 overflow-y-auto p-1">
            {!hasResults ? (
              <p className="px-3 py-6 text-center text-sm text-slate-500">{emptyMessage}</p>
            ) : filteredGroups ? (
              filteredGroups.map((group) => (
                <div key={group.label} className="py-1">
                  <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{group.label}</p>
                  {group.options.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={option.value === value}
                      onClick={() => selectOption(option.value)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50",
                        option.value === value && "bg-emerald-50 text-emerald-900"
                      )}
                    >
                      <span className="truncate">{option.label}</span>
                      {option.value === value ? <Check className="h-4 w-4 shrink-0" /> : null}
                    </button>
                  ))}
                </div>
              ))
            ) : (
              filteredOptions?.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  onClick={() => selectOption(option.value)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50",
                    option.value === value && "bg-emerald-50 text-emerald-900"
                  )}
                >
                  <span className="truncate">{option.label}</span>
                  {option.value === value ? <Check className="h-4 w-4 shrink-0" /> : null}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
