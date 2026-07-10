export const assetLocationKinds = ["ruang", "garasi_parkir"] as const;

export type AssetLocationKind = (typeof assetLocationKinds)[number];

export const assetLocationKindLabels: Record<AssetLocationKind, string> = {
  ruang: "Ruang penempatan (benda)",
  garasi_parkir: "Garasi / area parkir (kendaraan)",
};

export const assetLocationKindSelectOptions: ReadonlyArray<readonly [AssetLocationKind, string]> = [
  ["ruang", assetLocationKindLabels.ruang],
  ["garasi_parkir", assetLocationKindLabels.garasi_parkir],
];

export function isAssetLocationKind(value: string): value is AssetLocationKind {
  return assetLocationKinds.includes(value as AssetLocationKind);
}

export function getAssetLocationKindLabel(kind: string) {
  return isAssetLocationKind(kind) ? assetLocationKindLabels[kind] : kind;
}

export function getLocationKindForAssetType(assetType: string): AssetLocationKind | null {
  if (assetType === "benda") {
    return "ruang";
  }

  if (assetType === "kendaraan") {
    return "garasi_parkir";
  }

  return null;
}

export function filterLocationsForAssetType<T extends { id: string; locationKind?: string | null }>(
  locations: T[],
  assetType: string,
  currentLocationId?: string | null
): T[] {
  const expectedKind = getLocationKindForAssetType(assetType);
  if (!expectedKind) {
    return locations;
  }

  return locations.filter(
    (location) => location.locationKind === expectedKind || (currentLocationId && location.id === currentLocationId)
  );
}

export function assertLocationKindMatchesAssetType(locationKind: string, assetType: string) {
  const expectedKind = getLocationKindForAssetType(assetType);
  if (!expectedKind || locationKind === expectedKind) {
    return;
  }

  throw new Error(
    assetType === "kendaraan"
      ? "Lokasi yang dipilih bukan kategori garasi / area parkir"
      : "Lokasi yang dipilih bukan kategori ruang penempatan"
  );
}
