"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { handleActionFailure } from "@/lib/action-errors";
import {
  createAssetCategoryOption,
  deleteAssetCategoryOption,
  getAssetCategoryOption,
  updateAssetCategoryOption,
  type AssetCategoryInput,
  type AssetCategoryType,
} from "@/lib/asset-categories";
import { writeAuditLog } from "@/lib/audit";
import { getFormString, getOptionalString } from "@/lib/form-utils";
import { getCurrentUser } from "@/lib/session";

const path = "/master-data/asset-categories";
const assetTypes = ["bangunan", "kendaraan", "benda"] as const;

async function requireSuperadmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "superadmin") redirect("/forbidden?reason=permission");
  return user;
}

function lines(value: string | null) {
  return (value ?? "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildPayload(formData: FormData): AssetCategoryInput {
  const assetType = getFormString(formData, "assetType") as AssetCategoryType;
  if (!assetTypes.includes(assetType)) throw new Error("Jenis aset tidak valid");

  const sortOrder = Number(getFormString(formData, "sortOrder") || "0");
  const usefulLifeYears = Number(getFormString(formData, "usefulLifeYears") || "0");
  if (!Number.isFinite(sortOrder)) throw new Error("Urutan tidak valid");
  if (!Number.isFinite(usefulLifeYears)) throw new Error("Masa manfaat tidak valid");

  return {
    assetType,
    code: getFormString(formData, "code").trim(),
    label: getFormString(formData, "label").trim(),
    depreciationGroupCode: getFormString(formData, "depreciationGroupCode").trim(),
    depreciationGroupLabel: getOptionalString(formData, "depreciationGroupLabel"),
    usefulLifeYears,
    ratePercent: getFormString(formData, "ratePercent") || "0",
    examples: lines(getOptionalString(formData, "examples")),
    allowedTypes: lines(getOptionalString(formData, "allowedTypes")),
    sortOrder,
    isActive: formData.get("isActive") === "1",
  };
}

export async function createAssetCategoryOptionAction(formData: FormData) {
  try {
    const user = await requireSuperadmin();
    const payload = buildPayload(formData);
    const row = await createAssetCategoryOption(payload);

    await writeAuditLog({ actorUserId: user.id, action: "create", entity: "asset_category_option", entityId: row.id, afterData: row });
    revalidatePath(path);
    revalidatePath("/assets");
    redirect(`${path}?assetType=${payload.assetType}`);
  } catch (error) {
    await handleActionFailure(error, path);
  }
}

export async function updateAssetCategoryOptionAction(formData: FormData) {
  try {
    const user = await requireSuperadmin();
    const id = getFormString(formData, "id");
    const before = await getAssetCategoryOption(id);
    if (!before) throw new Error("Kategori aset tidak ditemukan");

    const payload = buildPayload(formData);
    const row = await updateAssetCategoryOption(id, payload);

    await writeAuditLog({ actorUserId: user.id, action: "update", entity: "asset_category_option", entityId: id, beforeData: before, afterData: row });
    revalidatePath(path);
    revalidatePath("/assets");
    redirect(`${path}?assetType=${payload.assetType}`);
  } catch (error) {
    await handleActionFailure(error, path);
  }
}

export async function deleteAssetCategoryOptionAction(formData: FormData) {
  try {
    const user = await requireSuperadmin();
    const id = getFormString(formData, "id");
    const before = await getAssetCategoryOption(id);
    if (!before) throw new Error("Kategori aset tidak ditemukan");

    await deleteAssetCategoryOption(id);
    await writeAuditLog({ actorUserId: user.id, action: "delete", entity: "asset_category_option", entityId: id, beforeData: before });
    revalidatePath(path);
    revalidatePath("/assets");
    redirect(`${path}?assetType=${before.assetType}`);
  } catch (error) {
    await handleActionFailure(error, path);
  }
}
