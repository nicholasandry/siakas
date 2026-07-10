"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { writeAuditLog } from "@/lib/audit";
import { handleActionFailure } from "@/lib/action-errors";
import { createUnit, deleteUnit, getUnit, listBadanHukums, listUnits, updateUnit } from "@/lib/master-data";
import { getFormString } from "@/lib/form-utils";
import { assertUnitInScope } from "@/lib/scope";
import { requireAuthenticatedScope } from "@/lib/server-guards";
import { formDataToRecord, parseZod } from "@/lib/validators";
import { unitFormSchema, validateUnitFormCategory } from "@/lib/validators/unit";
import { assertKeuskupanRootRule, canAssignUnitParent } from "@/lib/unit-tree";
import {
  assertKeuskupanImmutable,
  assertKeuskupanNotDeletable,
  assertLegalParentReferences,
  assertSingleKeuskupan,
  findKeuskupanUnit,
  resolveLegalParent,
  resolveUnitParentAndCategory,
} from "@/lib/unit-rules";

function buildUnitPayload(
  formData: FormData,
  allUnits: Awaited<ReturnType<typeof listUnits>>,
  allBadanHukums: Awaited<ReturnType<typeof listBadanHukums>>,
  unitId?: string
) {
  const raw = parseZod(unitFormSchema, formDataToRecord(formData));
  validateUnitFormCategory(raw.kind, raw.category);

  const kind = raw.kind;
  const rawParentId = raw.parentId;
  const rawCategory = raw.category;
  const keuskupanUnit = findKeuskupanUnit(allUnits);

  assertSingleKeuskupan(allUnits, kind, unitId);

  if (unitId) {
    const existing = allUnits.find((unit) => unit.id === unitId);

    if (existing) {
      assertKeuskupanImmutable(existing, kind);
    }
  }

  const { parentId, category } = resolveUnitParentAndCategory({
    kind,
    parentId: rawParentId ?? null,
    category: rawCategory ?? null,
    keuskupanId: keuskupanUnit?.id ?? null,
  });

  assertKeuskupanRootRule(kind, parentId);

  const legalParent = resolveLegalParent({
    kind,
    legalParentType: raw.legalParentType ?? null,
    legalParentUnitId: raw.legalParentUnitId ?? null,
    legalParentBadanHukumId: raw.legalParentBadanHukumId ?? null,
    legalParentLabel: raw.legalParentLabel ?? null,
  });

  const parentOptions = allUnits.map((unit) => ({ id: unit.id, code: unit.code, name: unit.name, kind: unit.kind, parentId: unit.parentId }));
  const badanHukumOptions = allBadanHukums.map((item) => ({ id: item.id, name: item.name, type: item.type }));

  assertLegalParentReferences(parentOptions, badanHukumOptions, legalParent);

  return {
    code: raw.code,
    name: raw.name,
    kind,
    category,
    parentId,
    ...legalParent,
    address: raw.address ?? null,
    responsiblePerson: raw.responsiblePerson ?? null,
    notes: raw.notes ?? null,
  };
}

export async function createUnitAction(formData: FormData) {
  try {
    const { user, scope } = await requireAuthenticatedScope("unit.create");
    const [allUnits, allBadanHukums] = await Promise.all([listUnits({ type: "all" }), listBadanHukums({ type: "all" })]);
    const payload = buildUnitPayload(formData, allUnits, allBadanHukums);

    if (payload.parentId) {
      assertUnitInScope(scope, payload.parentId);
    }

    if (payload.parentId && !canAssignUnitParent(allUnits, "new-unit", payload.parentId)) {
      throw new Error("Parent unit tidak valid atau menyebabkan looping hierarki");
    }

    const row = await createUnit(payload);

    await writeAuditLog({
      actorUserId: user.id,
      action: "create",
      entity: "unit",
      entityId: row.id,
      afterData: row,
    });

    revalidatePath("/master-data/units");
    redirect("/master-data/units");
  } catch (error) {
    await handleActionFailure(error, "/master-data/units");
  }
}

export async function updateUnitAction(formData: FormData) {
  try {
    const { user, scope } = await requireAuthenticatedScope("unit.update");

    const id = getFormString(formData, "id");

    if (!id) {
      throw new Error("ID unit wajib ada");
    }

    const before = await getUnit(id);

    if (!before) {
      throw new Error("Unit tidak ditemukan");
    }

    const [allUnits, allBadanHukums] = await Promise.all([listUnits({ type: "all" }), listBadanHukums({ type: "all" })]);
    const payload = buildUnitPayload(formData, allUnits, allBadanHukums, id);

    assertUnitInScope(scope, id);

    if (payload.parentId) {
      assertUnitInScope(scope, payload.parentId);
    }

    if (payload.parentId && !canAssignUnitParent(allUnits, id, payload.parentId)) {
      throw new Error("Parent unit tidak valid atau menyebabkan looping hierarki");
    }

    const row = await updateUnit(id, payload);

    if (!row) {
      throw new Error("Unit tidak ditemukan");
    }

    await writeAuditLog({
      actorUserId: user.id,
      action: "update",
      entity: "unit",
      entityId: id,
      beforeData: before,
      afterData: row,
    });

    revalidatePath("/master-data/units");
    redirect("/master-data/units");
  } catch (error) {
    await handleActionFailure(error, "/master-data/units");
  }
}

export async function deleteUnitAction(formData: FormData) {
  try {
    const { user, scope } = await requireAuthenticatedScope("unit.delete");

    const id = getFormString(formData, "id");

    if (!id) {
      throw new Error("ID unit wajib ada");
    }

    const before = await getUnit(id);

    if (!before) {
      throw new Error("Unit tidak ditemukan");
    }

    assertKeuskupanNotDeletable(before);
    assertUnitInScope(scope, id);
    await deleteUnit(id);

    await writeAuditLog({
      actorUserId: user.id,
      action: "delete",
      entity: "unit",
      entityId: id,
      beforeData: before,
    });

    revalidatePath("/master-data/units");
    redirect("/master-data/units");
  } catch (error) {
    await handleActionFailure(error, "/master-data/units");
  }
}
