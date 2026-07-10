import type { PhysicalCondition } from "@/lib/asset-disposals/constants";
import { labelAssetCondition } from "@/lib/assets/condition-options";

export function mapAssetConditionToDisposalPhysicalCondition(condition: string | null | undefined): PhysicalCondition {
  const normalized = condition?.toLowerCase().trim() ?? "";

  if (!normalized) {
    return "GOOD";
  }

  if (normalized.includes("tidak layak")) {
    return "TOTAL_LOSS";
  }

  if (normalized.includes("rusak berat")) {
    return "HEAVY_DAMAGE";
  }

  if (normalized.includes("rusak ringan")) {
    return "LIGHT_DAMAGE";
  }

  if (normalized === "rusak" || normalized.includes("rusak")) {
    return "MEDIUM_DAMAGE";
  }

  if (normalized.includes("hilang") || normalized.includes("lost")) {
    return "LOST";
  }

  if (normalized.includes("cukup")) {
    return "LIGHT_DAMAGE";
  }

  return "GOOD";
}

export function describeDisposalPhysicalConditionSource(condition: string | null | undefined) {
  const label = labelAssetCondition(condition, "Belum diisi");
  return `Diambil otomatis dari kondisi fisik terakhir di riwayat aset: ${label}.`;
}
