"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { isAssetLocationKind } from "@/lib/assets/location-kind";
import { handleActionFailure } from "@/lib/action-errors";
import { writeAuditLog } from "@/lib/audit";
import { getFormString } from "@/lib/form-utils";
import {
  createAssetLocation,
  deleteAssetLocation,
  getAssetLocation,
  updateAssetLocation,
} from "@/lib/master-data";
import { assertUnitInScope } from "@/lib/scope";
import { requireAuthenticatedScope } from "@/lib/server-guards";
import { formDataToRecord, parseZod } from "@/lib/validators";
import { optionalTrimmedString, requiredTrimmedString } from "@/lib/validators/zod-utils";

const assetLocationSchema = z.object({
  unitId: requiredTrimmedString("Unit wajib dipilih"),
  name: requiredTrimmedString("Nama lokasi wajib diisi").max(160, "Nama maksimal 160 karakter"),
  code: optionalTrimmedString(),
  locationKind: requiredTrimmedString("Kategori penempatan wajib dipilih").refine(isAssetLocationKind, {
    message: "Kategori penempatan tidak valid",
  }),
  description: optionalTrimmedString(),
});

function buildPayload(formData: FormData) {
  const parsed = parseZod(assetLocationSchema, formDataToRecord(formData));

  return {
    unitId: parsed.unitId,
    name: parsed.name,
    code: parsed.code ?? null,
    locationKind: parsed.locationKind,
    description: parsed.description ?? null,
    isActive: formData.get("isActive") === "1",
  };
}

export async function createAssetLocationAction(formData: FormData) {
  try {
    const { user, scope } = await requireAuthenticatedScope("unit.create");
    const payload = buildPayload(formData);

    assertUnitInScope(scope, payload.unitId);

    const row = await createAssetLocation(payload);

    await writeAuditLog({
      actorUserId: user.id,
      action: "create",
      entity: "asset_location",
      entityId: row.id,
      afterData: row,
    });

    revalidatePath("/master-data/lokasi");
    revalidatePath("/assets");
    redirect("/master-data/lokasi");
  } catch (error) {
    await handleActionFailure(error, "/master-data/lokasi");
  }
}

export async function updateAssetLocationAction(formData: FormData) {
  try {
    const { user, scope } = await requireAuthenticatedScope("unit.update");
    const id = getFormString(formData, "id");
    const before = await getAssetLocation(id);

    if (!before) {
      throw new Error("Lokasi tidak ditemukan");
    }

    const payload = buildPayload(formData);

    assertUnitInScope(scope, before.unitId);
    assertUnitInScope(scope, payload.unitId);

    const row = await updateAssetLocation(id, payload);

    await writeAuditLog({
      actorUserId: user.id,
      action: "update",
      entity: "asset_location",
      entityId: id,
      beforeData: before,
      afterData: row,
    });

    revalidatePath("/master-data/lokasi");
    revalidatePath("/assets");
    redirect("/master-data/lokasi");
  } catch (error) {
    await handleActionFailure(error, "/master-data/lokasi");
  }
}

export async function deleteAssetLocationAction(formData: FormData) {
  try {
    const { user, scope } = await requireAuthenticatedScope("unit.delete");
    const id = getFormString(formData, "id");
    const before = await getAssetLocation(id);

    if (!before) {
      throw new Error("Lokasi tidak ditemukan");
    }

    assertUnitInScope(scope, before.unitId);
    await deleteAssetLocation(id);

    await writeAuditLog({
      actorUserId: user.id,
      action: "delete",
      entity: "asset_location",
      entityId: id,
      beforeData: before,
    });

    revalidatePath("/master-data/lokasi");
    revalidatePath("/assets");
    redirect("/master-data/lokasi");
  } catch (error) {
    await handleActionFailure(error, "/master-data/lokasi");
  }
}
