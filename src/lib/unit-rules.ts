import {
  getUnitKindLabel,
  unitKindsUnderKeuskupan,
  unitKindsWithCategory,
  unitWorkCategoryOptions,
  getLegalParentTypeLabel,
  type UnitKind,
} from "@/lib/master-data-options";

export const KEUSKUPAN_KIND = "keuskupan" as const;

export type UnitRecord = {
  id: string;
  kind: string;
  parentId?: string | null;
  code?: string;
  name?: string;
};

export type KeuskupanUnitInfo = {
  id: string;
  name: string;
  code: string;
};

export function toKeuskupanUnitInfo(unit: UnitRecord | null | undefined): KeuskupanUnitInfo | null {
  if (!unit?.name || !unit.code) {
    return null;
  }

  return { id: unit.id, name: unit.name, code: unit.code };
}

export function findKeuskupanUnit(units: UnitRecord[]) {
  return units.find((unit) => unit.kind === KEUSKUPAN_KIND) ?? null;
}

export function findKeuskupanUnitInfo(units: UnitRecord[]) {
  return toKeuskupanUnitInfo(findKeuskupanUnit(units));
}

export function isKindUnderKeuskupan(kind: string): kind is UnitKind {
  return (unitKindsUnderKeuskupan as readonly string[]).includes(kind);
}

export function isKindWithCategory(kind: string): kind is UnitKind {
  return (unitKindsWithCategory as readonly string[]).includes(kind);
}

export function assertSingleKeuskupan(units: UnitRecord[], kind: string, unitId?: string) {
  if (kind !== KEUSKUPAN_KIND) {
    return;
  }

  const existing = findKeuskupanUnit(units);

  if (existing && existing.id !== unitId) {
    throw new Error("Hanya boleh ada satu unit dengan jenis keuskupan");
  }
}

export function assertKeuskupanImmutable(existing: UnitRecord, nextKind: string) {
  if (existing.kind === KEUSKUPAN_KIND && nextKind !== KEUSKUPAN_KIND) {
    throw new Error("Jenis unit keuskupan tidak boleh diubah");
  }
}

export function assertKeuskupanNotDeletable(unit: UnitRecord) {
  if (unit.kind === KEUSKUPAN_KIND) {
    throw new Error("Unit keuskupan tidak boleh dihapus");
  }
}

export function assertValidWorkCategory(kind: string, category: string | null) {
  if (!isKindWithCategory(kind)) {
    return;
  }

  if (!category) {
    throw new Error("Kategori unit wajib diisi untuk unit karya atau unit usaha");
  }

  const allowed = unitWorkCategoryOptions.map((item) => item.value);

  if (!allowed.includes(category as (typeof allowed)[number])) {
    throw new Error("Kategori unit tidak valid");
  }
}

export function resolveUnitParentAndCategory(input: {
  kind: string;
  parentId: string | null;
  category: string | null;
  keuskupanId: string | null;
}) {
  if (input.kind === KEUSKUPAN_KIND) {
    return { parentId: null, category: null };
  }

  if (isKindUnderKeuskupan(input.kind)) {
    if (!input.keuskupanId) {
      throw new Error("Unit keuskupan belum terdaftar. Buat unit keuskupan terlebih dahulu.");
    }

    return { parentId: input.keuskupanId, category: null };
  }

  if (isKindWithCategory(input.kind)) {
    if (!input.parentId) {
      throw new Error("Unit induk wajib dipilih untuk unit karya atau unit usaha");
    }

    assertValidWorkCategory(input.kind, input.category);
    return { parentId: input.parentId, category: input.category };
  }

  return { parentId: input.parentId, category: null };
}

export type UnitParentOption = {
  id: string;
  code: string;
  name: string;
  kind: string;
  parentId: string | null;
};

export function buildGroupedParentOptions(units: UnitParentOption[]) {
  const grouped = new Map<string, UnitParentOption[]>();

  for (const unit of units) {
    const items = grouped.get(unit.kind) ?? [];
    items.push(unit);
    grouped.set(unit.kind, items);
  }

  return [...grouped.entries()]
    .sort(([kindA], [kindB]) => getUnitKindLabel(kindA).localeCompare(getUnitKindLabel(kindB), "id"))
    .map(([kind, items]) => ({
      label: getUnitKindLabel(kind),
      options: [...items]
        .sort((a, b) => a.name.localeCompare(b.name, "id"))
        .map((unit) => ({
          value: unit.id,
          label: `${unit.name} (${unit.code})`,
          searchText: `${unit.code} ${unit.name} ${unit.kind}`,
        })),
    }));
}

export type BadanHukumOption = {
  id: string;
  name: string;
  type: string;
};

export type UnitWithLegalParent = UnitRecord & {
  legalParentType?: string | null;
  legalParentUnitId?: string | null;
  legalParentBadanHukumId?: string | null;
  legalParentLabel?: string | null;
};

const LEGAL_PARENT_UNIT_KIND: Record<string, string> = {
  langsung_kevikepan: "kevikepan",
  langsung_paroki: "paroki",
};

const LEGAL_PARENT_BADAN_TYPE: Record<string, string> = {
  yayasan: "yayasan",
  pt: "pt",
  cv: "cv",
  koperasi: "koperasi",
};

export function buildUnitRefLegalParentOptions(units: UnitParentOption[], unitKind: string) {
  return units
    .filter((unit) => unit.kind === unitKind)
    .sort((a, b) => a.name.localeCompare(b.name, "id"))
    .map((unit) => ({
      value: unit.id,
      label: `${unit.name} (${unit.code})`,
      searchText: `${unit.code} ${unit.name}`,
    }));
}

export function buildBadanHukumLegalParentOptions(badanHukums: BadanHukumOption[], type: string) {
  return badanHukums
    .filter((item) => item.type === type)
    .sort((a, b) => a.name.localeCompare(b.name, "id"))
    .map((item) => ({
      value: item.id,
      label: item.name,
      searchText: `${item.name} ${item.type}`,
    }));
}

export function resolveLegalParent(input: {
  kind: string;
  legalParentType: string | null;
  legalParentUnitId: string | null;
  legalParentBadanHukumId: string | null;
  legalParentLabel: string | null;
}) {
  if (input.kind === KEUSKUPAN_KIND) {
    return {
      legalParentType: "langsung_keuskupan",
      legalParentUnitId: null,
      legalParentBadanHukumId: null,
      legalParentLabel: null,
    };
  }

  if (!input.legalParentType) {
    throw new Error("Induk hukum wajib dipilih");
  }

  const type = input.legalParentType;

  if (type === "langsung_keuskupan") {
    return {
      legalParentType: type,
      legalParentUnitId: null,
      legalParentBadanHukumId: null,
      legalParentLabel: null,
    };
  }

  if (type === "langsung_kevikepan" || type === "langsung_paroki") {
    if (!input.legalParentUnitId) {
      throw new Error("Pilih unit untuk induk hukum");
    }

    return {
      legalParentType: type,
      legalParentUnitId: input.legalParentUnitId,
      legalParentBadanHukumId: null,
      legalParentLabel: null,
    };
  }

  if (type === "yayasan" || type === "pt" || type === "cv" || type === "koperasi") {
    if (!input.legalParentBadanHukumId) {
      throw new Error("Pilih badan hukum untuk induk hukum");
    }

    return {
      legalParentType: type,
      legalParentUnitId: null,
      legalParentBadanHukumId: input.legalParentBadanHukumId,
      legalParentLabel: null,
    };
  }

  if (type === "belum_jelas" || type === "lainnya") {
    return {
      legalParentType: type,
      legalParentUnitId: null,
      legalParentBadanHukumId: null,
      legalParentLabel: input.legalParentLabel?.trim() || null,
    };
  }

  throw new Error("Induk hukum tidak valid");
}

export function assertLegalParentReferences(
  units: UnitParentOption[],
  badanHukums: BadanHukumOption[],
  legalParent: {
    legalParentType: string;
    legalParentUnitId: string | null;
    legalParentBadanHukumId: string | null;
  }
) {
  const expectedUnitKind = LEGAL_PARENT_UNIT_KIND[legalParent.legalParentType];

  if (expectedUnitKind && legalParent.legalParentUnitId) {
    const unit = units.find((item) => item.id === legalParent.legalParentUnitId);

    if (!unit || unit.kind !== expectedUnitKind) {
      throw new Error("Unit induk hukum tidak valid");
    }
  }

  const expectedBadanType = LEGAL_PARENT_BADAN_TYPE[legalParent.legalParentType];

  if (expectedBadanType && legalParent.legalParentBadanHukumId) {
    const badanHukum = badanHukums.find((item) => item.id === legalParent.legalParentBadanHukumId);

    if (!badanHukum || badanHukum.type !== expectedBadanType) {
      throw new Error("Badan hukum induk hukum tidak valid");
    }
  }
}

export function formatLegalParentDisplay(
  unit: UnitWithLegalParent,
  units: UnitParentOption[],
  badanHukums: BadanHukumOption[]
) {
  if (!unit.legalParentType) {
    return "-";
  }

  const typeLabel = getLegalParentTypeLabel(unit.legalParentType);

  if (unit.legalParentUnitId) {
    const refUnit = units.find((item) => item.id === unit.legalParentUnitId);
    return refUnit ? `${typeLabel} — ${refUnit.name}` : typeLabel;
  }

  if (unit.legalParentBadanHukumId) {
    const refBadan = badanHukums.find((item) => item.id === unit.legalParentBadanHukumId);
    return refBadan ? `${typeLabel} — ${refBadan.name}` : typeLabel;
  }

  if (unit.legalParentLabel) {
    return `${typeLabel} — ${unit.legalParentLabel}`;
  }

  return typeLabel;
}
