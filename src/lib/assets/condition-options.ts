export const landConditionMaxLength = 64;

export const buildingConditions = [
  "sangat baik/terawat",
  "dalam proses renovasi",
  "rusak ringan",
  "rusak berat",
  "tidak layak pakai",
] as const;

export const vehicleConditions = [
  "sangat baik",
  "baik",
  "cukup",
  "rusak ringan",
  "rusak berat",
  "tidak layak pakai",
] as const;

export const itemConditions = ["baru", "sangat baik", "baik", "cukup", "rusak", "tidak layak pakai"] as const;

export type BuildingCondition = (typeof buildingConditions)[number];
export type VehicleCondition = (typeof vehicleConditions)[number];
export type ItemCondition = (typeof itemConditions)[number];

export const buildingConditionLabels: Record<BuildingCondition, string> = {
  "sangat baik/terawat": "Sangat baik / terawat",
  "dalam proses renovasi": "Dalam proses renovasi",
  "rusak ringan": "Rusak ringan",
  "rusak berat": "Rusak berat",
  "tidak layak pakai": "Tidak layak pakai",
};

export const vehicleConditionLabels: Record<VehicleCondition, string> = {
  "sangat baik": "Sangat baik",
  baik: "Baik",
  cukup: "Cukup",
  "rusak ringan": "Rusak ringan",
  "rusak berat": "Rusak berat",
  "tidak layak pakai": "Tidak layak pakai",
};

export const itemConditionLabels: Record<ItemCondition, string> = {
  baru: "Baru",
  "sangat baik": "Sangat baik",
  baik: "Baik",
  cukup: "Cukup",
  rusak: "Rusak",
  "tidak layak pakai": "Tidak layak pakai",
};

type SelectPair = readonly [string, string];

function toSelectPairs<const T extends readonly string[]>(
  values: T,
  labels: Record<T[number], string>
): ReadonlyArray<SelectPair> {
  return values.map((value) => [value, labels[value as T[number]]] as const);
}

export const buildingConditionSelectPairs = toSelectPairs(buildingConditions, buildingConditionLabels);
export const vehicleConditionSelectPairs = toSelectPairs(vehicleConditions, vehicleConditionLabels);
export const itemConditionSelectPairs = toSelectPairs(itemConditions, itemConditionLabels);

const assetConditionLabelMap: Record<string, string> = {
  ...buildingConditionLabels,
  ...vehicleConditionLabels,
  ...itemConditionLabels,
};

export function labelAssetCondition(value: string | null | undefined, fallback = value ?? "-") {
  if (!value) {
    return fallback === value ? "-" : fallback;
  }

  return assetConditionLabelMap[value] ?? value;
}

export function isBuildingCondition(value: string): value is BuildingCondition {
  return (buildingConditions as readonly string[]).includes(value);
}

export function isVehicleCondition(value: string): value is VehicleCondition {
  return (vehicleConditions as readonly string[]).includes(value);
}

export function isItemCondition(value: string): value is ItemCondition {
  return (itemConditions as readonly string[]).includes(value);
}
