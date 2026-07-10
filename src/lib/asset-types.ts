export const assetTypeConfigs = [
  { type: "tanah", label: "Tanah", description: "Tanah" },
  { type: "bangunan", label: "Bangunan", description: "Bangunan" },
  { type: "kendaraan", label: "Kendaraan", description: "Kendaraan" },
  { type: "benda", label: "Benda", description: "Benda" },
] as const;

export type AssetType = (typeof assetTypeConfigs)[number]["type"];

export function getAssetTypeConfig(type: string | undefined) {
  return assetTypeConfigs.find((item) => item.type === type);
}

export function isAssetType(type: string | undefined): type is AssetType {
  return Boolean(getAssetTypeConfig(type));
}
