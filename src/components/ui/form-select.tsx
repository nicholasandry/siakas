"use client";

import { useState, type ReactNode } from "react";

import { FormFieldError } from "@/components/ui/form-field-error";
import { FieldHelper, RequiredMark } from "@/components/ui/form-ux";
import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/searchable-select";

export const FORM_SELECT_SEARCHABLE_THRESHOLD = 4;

type FormSelectProps = {
  name: string;
  label?: ReactNode;
  options: SearchableSelectOption[];
  defaultValue?: string | number | null;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  required?: boolean;
  disabled?: boolean;
  emptyMessage?: string;
  helperText?: ReactNode;
  error?: string | null;
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
  value: controlledValue,
  onChange,
  placeholder = "Pilih",
  searchPlaceholder,
  required = false,
  disabled = false,
  emptyMessage = "Tidak ada opsi ditemukan",
  helperText,
  error,
  className,
  labelClassName = "space-y-2 text-sm font-medium text-slate-700",
  includeEmptyOption = true,
  emptyOptionLabel,
}: FormSelectProps) {
  const initialValue = defaultValue == null ? "" : String(defaultValue);
  const [internalValue, setInternalValue] = useState(initialValue);
  const value = controlledValue ?? internalValue;
  const setValue = (nextValue: string) => {
    if (controlledValue === undefined) {
      setInternalValue(nextValue);
    }
    onChange?.(nextValue);
  };
  const field = (
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
  );

  if (!label) {
    return field;
  }

  return (
    <label className={labelClassName}>
      <span>{label} {required ? <RequiredMark /> : null}</span>
      {field}
      <FieldHelper>{helperText}</FieldHelper>
      <FormFieldError message={error} />
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
  items: Array<{ id: string; name: string; code?: string | null; email?: string; assetType?: string; unitName?: string | null; unitCode?: string | null }>,
  formatLabel?: (item: { id: string; name: string; code?: string | null; email?: string; assetType?: string; unitName?: string | null; unitCode?: string | null }) => string
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
        searchText: `${item.id} ${item.code ?? ""} ${item.name} ${item.email ?? ""} ${item.assetType ?? ""} ${item.unitName ?? ""} ${item.unitCode ?? ""}`,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, "id"));
}
