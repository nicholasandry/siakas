import { z } from "zod";

import { badanHukumFieldOptions, badanHukumStatusOptions, badanHukumTypeOptions } from "@/lib/master-data-options";
import { optionalTrimmedString, requiredTrimmedString, valuesOf } from "@/lib/validators/zod-utils";

const typeValues = valuesOf(badanHukumTypeOptions);
const fieldValues = valuesOf(badanHukumFieldOptions);
const statusValues = valuesOf(badanHukumStatusOptions);

export const badanHukumFormSchema = z.object({
  name: requiredTrimmedString("Nama badan hukum wajib diisi").max(160, "Nama maksimal 160 karakter"),
  type: z.enum(typeValues, { message: "Jenis badan hukum tidak valid" }),
  field: z.enum(fieldValues, { message: "Bidang tidak valid" }),
  legalBasis: optionalTrimmedString(),
  kemenkumhamNumber: optionalTrimmedString(),
  establishedAt: optionalTrimmedString(),
  representative: optionalTrimmedString(),
  status: z.enum(statusValues, { message: "Status tidak valid" }).optional().default("aktif"),
  notes: optionalTrimmedString(),
});

export type BadanHukumFormSchema = z.infer<typeof badanHukumFormSchema>;
