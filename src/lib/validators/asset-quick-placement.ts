import { z } from "zod";

import { hasPlacementHistoryValueChanged } from "@/lib/assets/histories.helpers";
import { requiresPlacementLocation, usesMasterDataPlacementLocation } from "@/lib/assets/placement";
import { normalizeLegacyAssetStatus } from "@/lib/assets/status";
import { optionalTrimmedString, requiredTrimmedString } from "@/lib/validators/zod-utils";

export const assetQuickPlacementSchema = z
  .object({
    assetId: requiredTrimmedString("Aset wajib dipilih"),
    assetType: z.enum(["kendaraan", "benda"], { message: "Jenis aset tidak valid untuk pindah lokasi" }),
    currentLocationId: optionalTrimmedString(),
    currentStatus: optionalTrimmedString(),
    locationId: requiredTrimmedString("Lokasi tujuan wajib dipilih"),
    placementNote: optionalTrimmedString(),
  })
  .superRefine((data, ctx) => {
    if (!usesMasterDataPlacementLocation(data.assetType)) {
      ctx.addIssue({
        code: "custom",
        message: "Hanya benda dan kendaraan yang dapat dipindahkan lokasinya dari daftar aset",
        path: ["assetType"],
      });
    }

    const status = normalizeLegacyAssetStatus(data.currentStatus ?? "active");
    if (requiresPlacementLocation(data.assetType, status) && !data.locationId.trim()) {
      ctx.addIssue({
        code: "custom",
        message:
          data.assetType === "kendaraan"
            ? "Garasi / area parkir wajib dipilih untuk kendaraan aktif"
            : "Ruang penempatan wajib dipilih untuk benda aktif",
        path: ["locationId"],
      });
    }

    if (
      !hasPlacementHistoryValueChanged(
        { locationId: data.currentLocationId },
        { locationId: data.locationId }
      )
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Pilih lokasi tujuan yang berbeda dari lokasi saat ini",
        path: ["locationId"],
      });
    }
  });
