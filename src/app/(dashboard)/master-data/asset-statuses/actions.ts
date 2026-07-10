"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { handleActionFailure } from "@/lib/action-errors";
import { writeAuditLog } from "@/lib/audit";
import {
  createAssetStatusOption,
  deleteAssetStatusOption,
  getAssetStatusOption,
  updateAssetStatusOption,
  type AssetStatusInput,
} from "@/lib/asset-statuses";
import { getFormString, getOptionalString } from "@/lib/form-utils";
import { getCurrentUser } from "@/lib/session";

async function requireSuperadmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "superadmin") redirect("/forbidden?reason=permission");
  return user;
}

function buildPayload(formData: FormData): AssetStatusInput {
  const code = getFormString(formData, "code").toLowerCase().replace(/\s+/g, "_");
  const label = getFormString(formData, "label");
  const sortOrder = Number(getFormString(formData, "sortOrder") || "0");

  if (!code) throw new Error("Kode wajib diisi");
  if (!label) throw new Error("Label wajib diisi");
  if (!Number.isFinite(sortOrder)) throw new Error("Urutan tidak valid");

  return {
    code,
    label,
    description: getOptionalString(formData, "description"),
    sortOrder,
    isActive: formData.get("isActive") === "1",
  };
}

export async function createAssetStatusOptionAction(formData: FormData) {
  try {
    const user = await requireSuperadmin();
    const payload = buildPayload(formData);
    const row = await createAssetStatusOption(payload);

    await writeAuditLog({
      actorUserId: user.id,
      action: "create",
      entity: "asset_status_option",
      entityId: row.id,
      afterData: row,
    });

    revalidatePath("/master-data/asset-statuses");
    redirect("/master-data/asset-statuses");
  } catch (error) {
    await handleActionFailure(error, "/master-data/asset-statuses");
  }
}

export async function updateAssetStatusOptionAction(formData: FormData) {
  try {
    const user = await requireSuperadmin();
    const id = getFormString(formData, "id");
    const before = await getAssetStatusOption(id);
    if (!before) throw new Error("Status aset tidak ditemukan");

    const payload = buildPayload(formData);
    const row = await updateAssetStatusOption(id, payload);

    await writeAuditLog({
      actorUserId: user.id,
      action: "update",
      entity: "asset_status_option",
      entityId: id,
      beforeData: before,
      afterData: row,
    });

    revalidatePath("/master-data/asset-statuses");
    redirect("/master-data/asset-statuses");
  } catch (error) {
    await handleActionFailure(error, "/master-data/asset-statuses");
  }
}

export async function deleteAssetStatusOptionAction(formData: FormData) {
  try {
    const user = await requireSuperadmin();
    const id = getFormString(formData, "id");
    const before = await getAssetStatusOption(id);
    if (!before) throw new Error("Status aset tidak ditemukan");

    await deleteAssetStatusOption(id);

    await writeAuditLog({
      actorUserId: user.id,
      action: "delete",
      entity: "asset_status_option",
      entityId: id,
      beforeData: before,
    });

    revalidatePath("/master-data/asset-statuses");
    redirect("/master-data/asset-statuses");
  } catch (error) {
    await handleActionFailure(error, "/master-data/asset-statuses");
  }
}
