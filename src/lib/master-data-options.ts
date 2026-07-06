export const unitKindOptions = [
  { value: "keuskupan", label: "Keuskupan" },
  { value: "kevikepan", label: "Kevikepan" },
  { value: "kategorial", label: "Kategorial" },
  { value: "paroki", label: "Paroki" },
  { value: "unit karya", label: "Unit karya" },
  { value: "unit usaha", label: "Unit usaha" },
] as const;

export type UnitKind = (typeof unitKindOptions)[number]["value"];

export const unitKindsUnderKeuskupan: UnitKind[] = ["kevikepan", "kategorial", "paroki"];

export const unitKindsWithCategory: UnitKind[] = ["unit karya", "unit usaha"];

/** Kategori wajib untuk unit karya / unit usaha */
export const unitWorkCategoryOptions = [
  { value: "kesehatan", label: "Kesehatan" },
  { value: "koperasi", label: "Koperasi" },
  { value: "lainnya", label: "Lainnya" },
  { value: "pendidikan", label: "Pendidikan" },
  { value: "percetakan/penerbitan", label: "Percetakan/penerbitan" },
  { value: "pertanian/perkebunan", label: "Pertanian/perkebunan" },
  { value: "penyewaan aset", label: "Penyewaan aset" },
  { value: "rumah bina", label: "Rumah bina" },
  { value: "seminari/formasi", label: "Seminari/formasi" },
  { value: "sosial", label: "Sosial" },
  { value: "sosial-karitatif", label: "Sosial-karitatif" },
] as const;

export function sortOptionsByLabel<T extends { label: string }>(options: T[]): T[] {
  return [...options].sort((a, b) => a.label.localeCompare(b.label, "id"));
}

export const unitKindOptionsSorted = sortOptionsByLabel([...unitKindOptions]);

export const unitWorkCategoryOptionsSorted = sortOptionsByLabel([...unitWorkCategoryOptions]);

export const legalParentTypeOptions = [
  { value: "langsung_keuskupan", label: "Langsung Keuskupan" },
  { value: "langsung_kevikepan", label: "Langsung Kevikepan" },
  { value: "langsung_paroki", label: "Langsung Paroki" },
  { value: "yayasan", label: "Yayasan" },
  { value: "pt", label: "PT" },
  { value: "cv", label: "CV" },
  { value: "koperasi", label: "Koperasi" },
  { value: "belum_jelas", label: "Belum Jelas" },
  { value: "lainnya", label: "Lainnya" },
] as const;

export type LegalParentType = (typeof legalParentTypeOptions)[number]["value"];

export const legalParentTypeOptionsSorted = sortOptionsByLabel([...legalParentTypeOptions]);

export function getLegalParentTypeLabel(type: string | null | undefined) {
  return legalParentTypeOptions.find((item) => item.value === type)?.label ?? type ?? "-";
}

export function getUnitKindLabel(kind: string) {
  return unitKindOptions.find((item) => item.value === kind)?.label ?? kind;
}

export const badanHukumTypeOptions = [
  { value: "yayasan", label: "Yayasan" },
  { value: "pt", label: "PT" },
  { value: "cv", label: "CV" },
  { value: "koperasi", label: "Koperasi" },
  { value: "lainnya", label: "Lainnya" },
] as const;

export const badanHukumFieldOptions = [
  { value: "pendidikan", label: "Pendidikan" },
  { value: "sosial", label: "Sosial" },
  { value: "kesehatan", label: "Kesehatan" },
  { value: "rumah bina", label: "Rumah bina" },
] as const;

export const badanHukumStatusOptions = [
  { value: "aktif", label: "Aktif" },
  { value: "nonaktif", label: "Nonaktif" },
  { value: "dalam pembubaran", label: "Dalam pembubaran" },
  { value: "dibubarkan", label: "Dibubarkan" },
] as const;
