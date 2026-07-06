import { z } from "zod";

import {
  legalParentTypeOptions,
  unitKindOptions,
  unitWorkCategoryOptions,
} from "@/lib/master-data-options";
import { optionalTrimmedString, requiredTrimmedString, valuesOf } from "@/lib/validators/zod-utils";

const unitKindValues = valuesOf(unitKindOptions);
const legalParentValues = valuesOf(legalParentTypeOptions);
const categoryValues = valuesOf(unitWorkCategoryOptions);

export const unitFormSchema = z.object({
  code: requiredTrimmedString("Kode unit wajib diisi").max(64, "Kode maksimal 64 karakter"),
  name: requiredTrimmedString("Nama unit wajib diisi").max(160, "Nama maksimal 160 karakter"),
  kind: z.enum(unitKindValues, { message: "Jenis unit tidak valid" }),
  category: optionalTrimmedString(),
  parentId: optionalTrimmedString(),
  legalParentType: optionalTrimmedString(),
  legalParentUnitId: optionalTrimmedString(),
  legalParentBadanHukumId: optionalTrimmedString(),
  legalParentLabel: optionalTrimmedString(),
  address: optionalTrimmedString(),
  responsiblePerson: optionalTrimmedString(),
  notes: optionalTrimmedString(),
});

export type UnitFormSchema = z.infer<typeof unitFormSchema>;

export function validateUnitFormCategory(kind: string, category: string | null | undefined) {
  if (kind === "unit karya" || kind === "unit usaha") {
    if (!category) {
      throw new Error("Kategori unit wajib diisi untuk unit karya atau unit usaha");
    }

    if (!categoryValues.includes(category as (typeof categoryValues)[number])) {
      throw new Error("Kategori unit tidak valid");
    }
  }
}
