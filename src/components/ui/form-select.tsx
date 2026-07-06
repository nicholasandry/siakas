"use client";

import { useState, type ReactNode } from "react";

import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/searchable-select";
import { cn } from "@/lib/utils";

export const FORM_SELECT_SEARCHABLE_THRESHOLD = 4;

const nativeSelectClassName =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";

type FormSelectProps = {
  name: string;
  label?: ReactNode;
  options: SearchableSelectOption[];
  defaultValue?: string | number | null;
  placeholder?: string;
  searchPlaceholder?: string;
  required?: boolean;
  disabled?: boolean;
  emptyMessage?: string;
  className?: string;
  labelClassName?: string;
  includeEmptyOption?: boolean;
  emptyOptionLabel?: string;
};

export function FormSelect({
  name,
  label,
  options,
  defaultValue = "",
  placeholder = "Pilih",
  searchPlaceholder,
  required = false,
  disabled = false,
  emptyMessage = "Tidak ada opsi ditemukan",
  className,
  labelClassName = "space-y-2 text-sm font-medium text-slate-700",
  includeEmptyOption = true,
  emptyOptionLabel,
}: FormSelectProps) {
  const initialValue = defaultValue == null ? "" : String(defaultValue);
  const [value, setValue] = useState(initialValue);
  const useSearchable = options.length > FORM_SELECT_SEARCHABLE_THRESHOLD;

  const field = useSearchable ? (
    <SearchableSelect
      name={name}
      value={value}
      onChange={setValue}
      options={
        includeEmptyOption
          ? [{ value: "", label: emptyOptionLabel ?? placeholder, searchText: emptyOptionLabel ?? placeholder }, ...options]
          : options
      }
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder ?? "Cari..."}
      required={required}
      disabled={disabled}
      emptyMessage={emptyMessage}
      className={className}
    />
  ) : (
    <select
      name={name}
      defaultValue={initialValue}
      className={cn(nativeSelectClassName, className)}
      required={required}
      disabled={disabled}
    >
      {includeEmptyOption ? <option value="">{emptyOptionLabel ?? placeholder}</option> : null}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );

  if (!label) {
    return field;
  }

  return (
    <label className={labelClassName}>
      <span>{label}</span>
      {field}
    </label>
  );
}

export function pairsToSelectOptions(options: ReadonlyArray<string[] | readonly [string, string]>): SearchableSelectOption[] {
  return [...options]
    .map((entry) => {
      const [value, text] = entry;
      return {
        value,
        label: text,
        searchText: `${value} ${text}`,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, "id"));
}

export function lookupToSelectOptions(
  items: Array<{ id: string; name: string; code?: string; email?: string; assetType?: string }>,
  formatLabel?: (item: { id: string; name: string; code?: string; email?: string; assetType?: string }) => string
): SearchableSelectOption[] {
  return [...items]
    .map((item) => {
      const label = formatLabel
        ? formatLabel(item)
        : item.code
          ? `${item.code} - ${item.name}`
          : item.name;

      return {
        value: item.id,
        label,
        searchText: `${item.id} ${item.code ?? ""} ${item.name} ${item.email ?? ""} ${item.assetType ?? ""}`,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, "id"));
}
