export const assetVehicleCategories = [
  {
    code: "KND-R2",
    label: "Kendaraan Operasional - Sepeda, Sepeda Motor, dan Sejenisnya",
    depreciationGroupCode: "vehicle-knd-r2",
    depreciationGroupName: "Kendaraan Kelompok 1 - Sepeda, Sepeda Motor, dan Sejenisnya",
    depreciationGroupLabel: "Kelompok 1",
    usefulLifeYears: 4,
    ratePercent: "25",
    examples: ["sepeda angin", "sepeda listrik", "sepeda motor", "motor listrik", "becak", "kendaraan roda dua operasional lainnya"],
  },
  {
    code: "KND-R4",
    label: "Kendaraan Operasional - Mobil, Pickup, Minibus, dan Sejenisnya",
    depreciationGroupCode: "vehicle-knd-r4",
    depreciationGroupName: "Kendaraan Kelompok 2 - Mobil, Pickup, Minibus, dan Sejenisnya",
    depreciationGroupLabel: "Kelompok 2",
    usefulLifeYears: 8,
    ratePercent: "12.5",
    examples: ["mobil operasional", "pickup", "minibus", "van", "truk kecil", "bus", "speed boat", "kendaraan roda empat atau lebih lainnya"],
  },
] as const;

export type AssetVehicleCategoryCode = (typeof assetVehicleCategories)[number]["code"];

export const assetVehicleCategoryOptions = assetVehicleCategories.map((category) => [category.code, category.label] as const);

export const assetVehicleCategoryLabels = Object.fromEntries(
  assetVehicleCategories.map((category) => [category.code, category.label])
) as Record<string, string>;

export const assetVehicleCategoryByCode = Object.fromEntries(
  assetVehicleCategories.map((category) => [category.code, category])
) as Record<AssetVehicleCategoryCode, (typeof assetVehicleCategories)[number]>;

export function getAssetVehicleCategory(code: string | null | undefined) {
  if (!code) return null;
  return assetVehicleCategoryByCode[code as AssetVehicleCategoryCode] ?? null;
}
