"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { handleActionFailure } from "@/lib/action-errors";
import { writeAuditLog } from "@/lib/audit";
import {
  createDisposalLookupOption,
  deleteDisposalLookupOption,
  getDisposalLookupOption,
  isDisposalLookupCategory,
  updateDisposalLookupOption,
  type DisposalLookupInput,
} from "@/lib/asset-disposals/lookups";
import { getFormString, getFormStringList, getOptionalString } from "@/lib/form-utils";
import { getCurrentUser } from "@/lib/session";

async function requireSuperadmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "superadmin") redirect("/forbidden?reason=permission");
  return user;
}

function buildPayload(formData: FormData): DisposalLookupInput {
  const category = getFormString(formData, "category");
  const rawCode = getFormString(formData, "code");
  const code = category === "disposal_document_type" ? rawCode : rawCode.toUpperCase().replace(/\s+/g, "_");
  const label = getFormString(formData, "label");
  const sortOrder = Number(getFormString(formData, "sortOrder") || "0");
  const allowedDisposalMethods = getFormStringList(formData, "allowedDisposalMethods");

  if (!isDisposalLookupCategory(category)) throw new Error("Kategori lookup tidak valid");
  if (!code) throw new Error("Kode wajib diisi");
  if (!label) throw new Error("Label wajib diisi");
  if (!Number.isFinite(sortOrder)) throw new Error("Urutan tidak valid");

  return {
    category,
    code,
    label,
    description: getOptionalString(formData, "description"),
    sortOrder,
    isActive: formData.get("isActive") === "1",
    metadata: category === "disposal_reason_type" ? (allowedDisposalMethods.length > 0 ? { allowedDisposalMethods } : null) : undefined,
  };
}

export async function createDisposalLookupOptionAction(formData: FormData) {
  try {
    const user = await requireSuperadmin();
    const payload = buildPayload(formData);
    const row = await createDisposalLookupOption(payload);

    await writeAuditLog({
      actorUserId: user.id,
      action: "create",
      entity: "asset_disposal_lookup_option",
      entityId: row.id,
      afterData: row,
    });

    revalidatePath("/master-data/disposal-lookups");
    redirect(`/master-data/disposal-lookups?category=${payload.category}`);
  } catch (error) {
    await handleActionFailure(error, "/master-data/disposal-lookups");
  }
}

export async function updateDisposalLookupOptionAction(formData: FormData) {
  try {
    const user = await requireSuperadmin();
    const id = getFormString(formData, "id");
    const before = await getDisposalLookupOption(id);
    if (!before) throw new Error("Opsi lookup tidak ditemukan");

    const payload = buildPayload(formData);
    const row = await updateDisposalLookupOption(id, payload);

    await writeAuditLog({
      actorUserId: user.id,
      action: "update",
      entity: "asset_disposal_lookup_option",
      entityId: id,
      beforeData: before,
      afterData: row,
    });

    revalidatePath("/master-data/disposal-lookups");
    redirect(`/master-data/disposal-lookups?category=${payload.category}`);
  } catch (error) {
    await handleActionFailure(error, "/master-data/disposal-lookups");
  }
}

export async function deleteDisposalLookupOptionAction(formData: FormData) {
  try {
    const user = await requireSuperadmin();
    const id = getFormString(formData, "id");
    const before = await getDisposalLookupOption(id);
    if (!before) throw new Error("Opsi lookup tidak ditemukan");

    await deleteDisposalLookupOption(id);

    await writeAuditLog({
      actorUserId: user.id,
      action: "delete",
      entity: "asset_disposal_lookup_option",
      entityId: id,
      beforeData: before,
    });

    revalidatePath("/master-data/disposal-lookups");
    redirect(`/master-data/disposal-lookups?category=${before.category}`);
  } catch (error) {
    await handleActionFailure(error, "/master-data/disposal-lookups");
  }
}
