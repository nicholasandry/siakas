import { z } from "zod";

import {
  buildingConditions,
  isBuildingCondition,
  isItemCondition,
  isVehicleCondition,
  itemConditions,
  landConditionMaxLength,
  vehicleConditions,
} from "@/lib/assets/condition-options";
import { requiresPlacementLocation, usesMasterDataPlacementLocation } from "@/lib/assets/placement";
import { normalizeLegacyAssetStatus } from "@/lib/assets/status";
import { optionalTrimmedString, requiredTrimmedString } from "@/lib/validators/zod-utils";

const assetTypeValues = ["tanah", "bangunan", "kendaraan", "benda"] as const;
const ownershipValues = ["keuskupan", "badan_hukum"] as const;

function refineAssetCondition(
  data: {
    assetType: (typeof assetTypeValues)[number];
    condition: string | null;
    vehicleCondition: string | null;
  },
  ctx: z.RefinementCtx
) {
  if (data.assetType === "bangunan" && data.condition !== null && !isBuildingCondition(data.condition)) {
    ctx.addIssue({
      code: "custom",
      message: `Kondisi bangunan tidak valid. Pilih salah satu: ${buildingConditions.join(", ")}`,
      path: ["condition"],
    });
  }

  if (data.assetType === "benda" && data.condition !== null && !isItemCondition(data.condition)) {
    ctx.addIssue({
      code: "custom",
      message: `Kondisi benda tidak valid. Pilih salah satu: ${itemConditions.join(", ")}`,
      path: ["condition"],
    });
  }

  if (data.assetType === "kendaraan" && data.vehicleCondition !== null && !isVehicleCondition(data.vehicleCondition)) {
    ctx.addIssue({
      code: "custom",
      message: `Kondisi kendaraan tidak valid. Pilih salah satu: ${vehicleConditions.join(", ")}`,
      path: ["vehicleCondition"],
    });
  }

  if (data.assetType === "tanah" && data.condition !== null && data.condition.length > landConditionMaxLength) {
    ctx.addIssue({
      code: "custom",
      message: `Kondisi fisik tanah maksimal ${landConditionMaxLength} karakter`,
      path: ["condition"],
    });
  }
}

export const assetCommonSchema = z
  .object({
    code: requiredTrimmedString("Kode aset wajib diisi").max(64, "Kode maksimal 64 karakter"),
    name: requiredTrimmedString("Nama aset wajib diisi").max(160, "Nama maksimal 160 karakter"),
    assetType: z.enum(assetTypeValues, { message: "Jenis aset tidak valid" }),
    ownershipLevel: z.enum(ownershipValues, { message: "Level kepemilikan tidak valid" }),
    unitId: optionalTrimmedString(),
    badanHukumId: optionalTrimmedString(),
    locationId: optionalTrimmedString(),
    acquisitionDate: optionalTrimmedString(),
    acquisitionValue: optionalTrimmedString(),
    legalStatus: optionalTrimmedString(),
    ownerName: optionalTrimmedString(),
    condition: optionalTrimmedString(),
    vehicleCondition: optionalTrimmedString(),
    status: optionalTrimmedString().default("active"),
    currentStatus: optionalTrimmedString(),
    statusNote: optionalTrimmedString(),
    conditionNote: optionalTrimmedString(),
    notes: optionalTrimmedString(),
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

    refineAssetCondition(data, ctx);

    const nextStatus = normalizeLegacyAssetStatus(data.status);
    const currentStatus = normalizeLegacyAssetStatus(data.currentStatus || "active");

    if (nextStatus === "on_loan" && nextStatus !== currentStatus && !data.statusNote) {
      ctx.addIssue({
        code: "custom",
        message: "Catatan peminjam wajib diisi untuk status dipinjamkan",
        path: ["statusNote"],
      });
    }

    if (
      data.ownershipLevel === "keuskupan" &&
      requiresPlacementLocation(data.assetType, nextStatus) &&
      !data.locationId?.trim()
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          data.assetType === "kendaraan"
            ? "Garasi / area parkir wajib dipilih untuk kendaraan aktif"
            : "Ruang penempatan wajib dipilih untuk benda aktif",
        path: ["locationId"],
      });
    }

    if (usesMasterDataPlacementLocation(data.assetType) && data.ownershipLevel !== "keuskupan" && data.locationId?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Penempatan master lokasi hanya berlaku untuk aset unit keuskupan",
        path: ["locationId"],
      });
    }
  });

export type AssetCommonSchema = z.infer<typeof assetCommonSchema>;
