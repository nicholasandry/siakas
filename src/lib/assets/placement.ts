import { normalizeLegacyAssetStatus } from "@/lib/assets/status";

export const movablePlacementAssetTypes = ["benda", "kendaraan"] as const;

export type MovablePlacementAssetType = (typeof movablePlacementAssetTypes)[number];

export function usesMasterDataPlacementLocation(assetType: string): assetType is MovablePlacementAssetType {
  return movablePlacementAssetTypes.includes(assetType as MovablePlacementAssetType);
}

export function getPlacementLocationFieldLabel(assetType: string) {
  if (assetType === "kendaraan") {
    return "Garasi / area parkir";
  }

  if (assetType === "benda") {
    return "Ruang penempatan";
  }

  return "Lokasi";
}

export function requiresPlacementLocation(assetType: string, status: string | null | undefined) {
  return usesMasterDataPlacementLocation(assetType) && normalizeLegacyAssetStatus(status) === "active";
}

export function needsPlacementLocationReminder(input: {
  assetType: string;
  ownershipLevel: string;
  status: string;
  locationId: string | null | undefined;
}) {
  return (
    input.ownershipLevel === "keuskupan" &&
    requiresPlacementLocation(input.assetType, input.status) &&
    !input.locationId
  );
}
