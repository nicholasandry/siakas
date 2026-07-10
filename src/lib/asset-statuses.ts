import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { assetStatusOptions } from "@/db/schema";
import { assetStatusLabels } from "@/lib/formatters";
import { inactiveAssetStatusDescription, isManuallyEditableAssetStatus } from "@/lib/assets/status";

export type AssetStatusOption = {
  id?: string;
  code: string;
  label: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  isSystem?: boolean;
};

export type AssetStatusInput = {
  code: string;
  label: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
};

export const assetStatusDefaults = Object.entries(assetStatusLabels).map(([code, label], index) => ({
  code,
  label,
  description: code === "inactive" ? inactiveAssetStatusDescription : null,
  sortOrder: index + 1,
  isActive: code !== "archived",
  isSystem: true,
}));

function fallbackAssetStatuses() {
  return assetStatusDefaults;
}

export async function listAssetStatusOptions() {
  return db.select().from(assetStatusOptions).orderBy(asc(assetStatusOptions.sortOrder), asc(assetStatusOptions.label));
}

export async function listActiveAssetStatusOptions() {
  const rows = await db
    .select()
    .from(assetStatusOptions)
    .where(eq(assetStatusOptions.isActive, true))
    .orderBy(asc(assetStatusOptions.sortOrder), asc(assetStatusOptions.label));

  return rows.length > 0 ? rows : fallbackAssetStatuses();
}

export async function listFormSelectableAssetStatusOptions() {
  const rows = await listActiveAssetStatusOptions();
  return rows.filter((row) => isManuallyEditableAssetStatus(row.code));
}

export async function getAssetStatusOption(id: string) {
  const rows = await db.select().from(assetStatusOptions).where(eq(assetStatusOptions.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createAssetStatusOption(input: AssetStatusInput) {
  const [row] = await db.insert(assetStatusOptions).values(input).returning();
  return row;
}

export async function updateAssetStatusOption(id: string, input: AssetStatusInput) {
  const [row] = await db
    .update(assetStatusOptions)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(assetStatusOptions.id, id))
    .returning();

  return row ?? null;
}

export async function deleteAssetStatusOption(id: string) {
  await db.delete(assetStatusOptions).where(eq(assetStatusOptions.id, id));
}

export async function assertActiveAssetStatus(code: string) {
  const rows = await listActiveAssetStatusOptions();
  if (!rows.some((row) => row.code === code)) {
    throw new Error("Status aset tidak valid atau tidak aktif");
  }
}
