import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { assetCategoryOptions } from "@/db/schema";
import { assetBuildingCategories } from "@/lib/asset-building-categories";
import { assetItemCategories } from "@/lib/asset-item-categories";
import { assetVehicleCategories } from "@/lib/asset-vehicle-categories";

export type AssetCategoryType = "bangunan" | "kendaraan" | "benda";

export type AssetCategoryInput = {
  assetType: AssetCategoryType;
  code: string;
  label: string;
  depreciationGroupCode: string;
  depreciationGroupLabel: string | null;
  usefulLifeYears: number;
  ratePercent: string;
  examples: string[];
  allowedTypes: string[];
  sortOrder: number;
  isActive: boolean;
};

export const assetCategoryDefaults: AssetCategoryInput[] = [
  ...assetBuildingCategories.map((category, index) => ({
    assetType: "bangunan" as const,
    code: category.code,
    label: category.label,
    depreciationGroupCode: category.depreciationGroupCode,
    depreciationGroupLabel: null,
    usefulLifeYears: category.usefulLifeYears,
    ratePercent: category.usefulLifeYears === 20 ? "5" : "10",
    examples: [...category.buildingTypes],
    allowedTypes: [...category.buildingTypes],
    sortOrder: index + 1,
    isActive: true,
  })),
  ...assetVehicleCategories.map((category, index) => ({
    assetType: "kendaraan" as const,
    code: category.code,
    label: category.label,
    depreciationGroupCode: category.depreciationGroupCode,
    depreciationGroupLabel: category.depreciationGroupLabel,
    usefulLifeYears: category.usefulLifeYears,
    ratePercent: category.ratePercent,
    examples: [...category.examples],
    allowedTypes: [],
    sortOrder: index + 1,
    isActive: true,
  })),
  ...assetItemCategories.map((category, index) => ({
    assetType: "benda" as const,
    code: category.code,
    label: category.label,
    depreciationGroupCode: category.depreciationGroupCode,
    depreciationGroupLabel: category.depreciationGroupLabel,
    usefulLifeYears: category.usefulLifeYears,
    ratePercent: category.ratePercent,
    examples: [...category.examples],
    allowedTypes: [],
    sortOrder: index + 1,
    isActive: true,
  })),
];

export async function listAssetCategoryOptions(assetType?: AssetCategoryType) {
  const query = db.select().from(assetCategoryOptions).orderBy(asc(assetCategoryOptions.assetType), asc(assetCategoryOptions.sortOrder), asc(assetCategoryOptions.label));
  return assetType ? query.where(eq(assetCategoryOptions.assetType, assetType)) : query;
}

export async function listActiveAssetCategoryOptions(assetType: AssetCategoryType) {
  const rows = await db
    .select()
    .from(assetCategoryOptions)
    .where(and(eq(assetCategoryOptions.assetType, assetType), eq(assetCategoryOptions.isActive, true)))
    .orderBy(asc(assetCategoryOptions.sortOrder), asc(assetCategoryOptions.label));

  if (rows.length > 0) return rows;
  return assetCategoryDefaults.filter((category) => category.assetType === assetType).map((category) => ({ ...category, id: category.code, isSystem: true }));
}

export async function getActiveAssetCategoryByCode(assetType: AssetCategoryType, code: string | null | undefined) {
  if (!code) return null;
  const rows = await db
    .select()
    .from(assetCategoryOptions)
    .where(and(eq(assetCategoryOptions.assetType, assetType), eq(assetCategoryOptions.code, code), eq(assetCategoryOptions.isActive, true)))
    .limit(1);

  if (rows[0]) return rows[0];
  return assetCategoryDefaults.find((category) => category.assetType === assetType && category.code === code) ?? null;
}

export async function getAssetCategoryOption(id: string) {
  const rows = await db.select().from(assetCategoryOptions).where(eq(assetCategoryOptions.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createAssetCategoryOption(input: AssetCategoryInput) {
  const [row] = await db.insert(assetCategoryOptions).values(input).returning();
  return row;
}

export async function updateAssetCategoryOption(id: string, input: AssetCategoryInput) {
  const [row] = await db.update(assetCategoryOptions).set({ ...input, updatedAt: new Date() }).where(eq(assetCategoryOptions.id, id)).returning();
  return row ?? null;
}

export async function deleteAssetCategoryOption(id: string) {
  await db.delete(assetCategoryOptions).where(eq(assetCategoryOptions.id, id));
}
