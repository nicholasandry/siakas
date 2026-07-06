"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { writeAuditLog } from "@/lib/audit";
import { handleActionFailure } from "@/lib/action-errors";
import { createBadanHukum, deleteBadanHukum, getBadanHukum, updateBadanHukum } from "@/lib/master-data";
import { getDateValue, getOptionalString, requireString } from "@/lib/form-utils";
import { assertBadanHukumInScope } from "@/lib/scope";
import { requireAuthenticatedScope } from "@/lib/server-guards";
import { formDataToRecord, parseZod } from "@/lib/validators";
import { badanHukumFormSchema } from "@/lib/validators/badan-hukum";

function buildBadanHukumPayload(formData: FormData) {
  const record = formDataToRecord(formData);
  const parsed = parseZod(badanHukumFormSchema, {
    ...record,
    status: record.status || "aktif",
  });

  return {
    name: parsed.name,
    type: parsed.type,
    field: parsed.field,
    legalBasis: parsed.legalBasis ?? null,
    kemenkumhamNumber: parsed.kemenkumhamNumber ?? null,
    establishedAt: getDateValue(formData, "establishedAt"),
    representative: parsed.representative ?? null,
    status: parsed.status ?? "aktif",
    notes: parsed.notes ?? null,
  };
}

export async function createBadanHukumAction(formData: FormData) {
  try {
    const { user } = await requireAuthenticatedScope("badan-hukum.create");
    const row = await createBadanHukum(buildBadanHukumPayload(formData));

    await writeAuditLog({
      actorUserId: user.id,
      action: "create",
      entity: "badan_hukum",
      entityId: row.id,
      afterData: row,
    });

    revalidatePath("/master-data/badan-hukum");
    redirect("/master-data/badan-hukum");
  } catch (error) {
    await handleActionFailure(error, "/master-data/badan-hukum");
  }
}

export async function updateBadanHukumAction(formData: FormData) {
  try {
    const { user, scope } = await requireAuthenticatedScope("badan-hukum.update");

    const id = requireString(formData, "id");
    const before = await getBadanHukum(id);

    if (!before) {
      throw new Error("Badan hukum tidak ditemukan");
    }

    assertBadanHukumInScope(scope, id);

    const row = await updateBadanHukum(id, buildBadanHukumPayload(formData));

    if (!row) {
      throw new Error("Badan hukum tidak ditemukan");
    }

    await writeAuditLog({
      actorUserId: user.id,
      action: "update",
      entity: "badan_hukum",
      entityId: id,
      beforeData: before,
      afterData: row,
    });

    revalidatePath("/master-data/badan-hukum");
    redirect("/master-data/badan-hukum");
  } catch (error) {
    await handleActionFailure(error, "/master-data/badan-hukum");
  }
}

export async function deleteBadanHukumAction(formData: FormData) {
  try {
    const { user, scope } = await requireAuthenticatedScope("badan-hukum.delete");

    const id = requireString(formData, "id");
    const before = await getBadanHukum(id);

    if (!before) {
      throw new Error("Badan hukum tidak ditemukan");
    }

    assertBadanHukumInScope(scope, id);
    await deleteBadanHukum(id);

    await writeAuditLog({
      actorUserId: user.id,
      action: "delete",
      entity: "badan_hukum",
      entityId: id,
      beforeData: before,
    });

    revalidatePath("/master-data/badan-hukum");
    redirect("/master-data/badan-hukum");
  } catch (error) {
    await handleActionFailure(error, "/master-data/badan-hukum");
  }
}
