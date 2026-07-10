import { z } from "zod";

import { isBuildingCondition, isItemCondition, isVehicleCondition, landConditionMaxLength } from "@/lib/assets/condition-options";
import { hasHistoryValueChanged } from "@/lib/assets/histories.helpers";
import {
  assertManuallyEditableAssetStatus,
  isManuallyEditableAssetStatus,
  normalizeLegacyAssetStatus,
  resolveLoanedTo,
} from "@/lib/assets/status";
import { optionalTrimmedString, requiredTrimmedString } from "@/lib/validators/zod-utils";

export const assetQuickUpdateSchema = z
  .object({
    assetId: requiredTrimmedString("Aset wajib dipilih"),
    assetType: z.enum(["tanah", "bangunan", "kendaraan", "benda"], { message: "Jenis aset tidak valid" }),
    status: optionalTrimmedString(),
    currentStatus: optionalTrimmedString(),
    currentLoanedTo: optionalTrimmedString(),
    currentCondition: optionalTrimmedString(),
    condition: optionalTrimmedString(),
    statusNote: optionalTrimmedString(),
    conditionNote: optionalTrimmedString(),
  })
  .superRefine((data, ctx) => {
    const currentStatus = normalizeLegacyAssetStatus(data.currentStatus ?? "active");
    const nextStatus = normalizeLegacyAssetStatus(data.status ?? currentStatus);
    const nextLoanedTo = resolveLoanedTo({
      nextStatus,
      previousStatus: currentStatus,
      statusNote: data.statusNote,
      currentLoanedTo: data.currentLoanedTo,
    });

    const statusChanged = hasHistoryValueChanged(currentStatus, nextStatus);
    const conditionChanged = data.condition !== undefined && hasHistoryValueChanged(data.currentCondition, data.condition);
    const loanChanged = hasHistoryValueChanged(data.currentLoanedTo, nextLoanedTo);

    if (!statusChanged && !conditionChanged && !loanChanged) {
      ctx.addIssue({
        code: "custom",
        message: "Ubah status operasional, kondisi fisik, atau peminjam terlebih dahulu",
        path: ["status"],
      });
    }

    if (data.status && !isManuallyEditableAssetStatus(data.status)) {
      ctx.addIssue({
        code: "custom",
        message: "Status ini hanya dapat diubah melalui proses Disposal",
        path: ["status"],
      });
    }

    if (nextStatus === "on_loan" && currentStatus !== "on_loan" && !data.statusNote?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Catatan peminjam wajib diisi untuk status dipinjamkan",
        path: ["statusNote"],
      });
    }

    if (data.assetType === "bangunan" && data.condition && !isBuildingCondition(data.condition)) {
      ctx.addIssue({ code: "custom", message: "Kondisi bangunan tidak valid", path: ["condition"] });
    }

    if (data.assetType === "kendaraan" && data.condition && !isVehicleCondition(data.condition)) {
      ctx.addIssue({ code: "custom", message: "Kondisi kendaraan tidak valid", path: ["condition"] });
    }

    if (data.assetType === "benda" && data.condition && !isItemCondition(data.condition)) {
      ctx.addIssue({ code: "custom", message: "Kondisi benda tidak valid", path: ["condition"] });
    }

    if (data.assetType === "tanah" && data.condition && data.condition.length > landConditionMaxLength) {
      ctx.addIssue({
        code: "custom",
        message: `Kondisi fisik tanah maksimal ${landConditionMaxLength} karakter`,
        path: ["condition"],
      });
    }
  });

export function assertQuickUpdateStatus(code: string) {
  assertManuallyEditableAssetStatus(code);
}
