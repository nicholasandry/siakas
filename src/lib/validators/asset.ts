import { z } from "zod";

import { optionalTrimmedString, requiredTrimmedString } from "@/lib/validators/zod-utils";

const assetTypeValues = ["tanah", "bangunan", "kendaraan", "benda"] as const;
const ownershipValues = ["keuskupan", "badan_hukum"] as const;
const assetStatusValues = ["active", "inactive", "archived"] as const;

export const assetCommonSchema = z
  .object({
    code: requiredTrimmedString("Kode aset wajib diisi").max(64, "Kode maksimal 64 karakter"),
    name: requiredTrimmedString("Nama aset wajib diisi").max(160, "Nama maksimal 160 karakter"),
    assetType: z.enum(assetTypeValues, { message: "Jenis aset tidak valid" }),
    ownershipLevel: z.enum(ownershipValues, { message: "Level kepemilikan tidak valid" }),
    unitId: optionalTrimmedString(),
    badanHukumId: optionalTrimmedString(),
    acquisitionDate: optionalTrimmedString(),
    acquisitionValue: optionalTrimmedString(),
    legalStatus: optionalTrimmedString(),
    ownerName: optionalTrimmedString(),
    condition: optionalTrimmedString(),
    status: z.enum(assetStatusValues, { message: "Status aset tidak valid" }).optional().default("active"),
    notes: optionalTrimmedString(),
    depreciationGroupId: optionalTrimmedString(),
  })
  .superRefine((data, ctx) => {
    if (data.ownershipLevel === "keuskupan" && !data.unitId) {
      ctx.addIssue({ code: "custom", message: "Unit pengelola wajib dipilih", path: ["unitId"] });
    }

    if (data.ownershipLevel === "badan_hukum" && !data.badanHukumId) {
      ctx.addIssue({ code: "custom", message: "Badan hukum wajib dipilih", path: ["badanHukumId"] });
    }

    if (data.acquisitionValue) {
      const parsed = Number(data.acquisitionValue);

      if (!Number.isFinite(parsed) || parsed < 0) {
        ctx.addIssue({ code: "custom", message: "Nilai perolehan tidak valid", path: ["acquisitionValue"] });
      }
    }
  });

export type AssetCommonSchema = z.infer<typeof assetCommonSchema>;
