export const assetBuildingCategories = [
  {
    code: "permanent",
    label: "Bangunan Permanen",
    depreciationGroupCode: "building-permanent",
    usefulLifeYears: 20,
    buildingTypes: [
      "gereja/rumah ibadah utama",
      "kapel/stasi",
      "pastoran/wisma pastur",
      "sekolah/pendidikan",
      "kantor sekretariat/kuria",
      "aula paroki/serbaguna",
      "klinik/rumah sakit",
      "panti asuhan/sosial",
      "rumah tinggal karyawan",
      "gedung komersial/sewaan",
      "lainnya",
    ],
  },
  {
    code: "non_permanent",
    label: "Bangunan Tidak Permanen",
    depreciationGroupCode: "building-nonpermanent",
    usefulLifeYears: 10,
    buildingTypes: ["gazebo", "bangunan bahan kayu"],
  },
] as const;

export type AssetBuildingCategoryCode = (typeof assetBuildingCategories)[number]["code"];

export const assetBuildingCategoryOptions = assetBuildingCategories.map((category) => [category.code, category.label] as const);

export const assetBuildingCategoryLabels = Object.fromEntries(
  assetBuildingCategories.map((category) => [category.code, category.label])
) as Record<string, string>;

export const assetBuildingCategoryByCode = Object.fromEntries(
  assetBuildingCategories.map((category) => [category.code, category])
) as Record<AssetBuildingCategoryCode, (typeof assetBuildingCategories)[number]>;

export function getAssetBuildingCategory(code: string | null | undefined) {
  if (!code) return null;
  return assetBuildingCategoryByCode[code as AssetBuildingCategoryCode] ?? null;
}
