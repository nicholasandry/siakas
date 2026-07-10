"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { writeAuditLog } from "@/lib/audit";
import { handleActionFailure } from "@/lib/action-errors";
import { getDateValue, getInteger, getOptionalString, requireString } from "@/lib/form-utils";
import { requireAuthenticatedScope } from "@/lib/server-guards";
import {
  countTaxGroupReferences,
  createTaxDepreciationGroup,
  createTaxDepreciationRule,
  deactivateTaxDepreciationGroup,
  deactivateTaxDepreciationRule,
  getTaxDepreciationGroup,
  getTaxDepreciationRule,
  updateTaxDepreciationGroup,
  updateTaxDepreciationRule,
} from "@/lib/tax-master";

function parseCheckbox(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function buildTaxGroupPayload(formData: FormData) {
  return {
    code: requireString(formData, "code"),
    name: requireString(formData, "name"),
    assetCategory: requireString(formData, "assetCategory"),
    methodDefault: requireString(formData, "methodDefault"),
    usefulLifeYears: getInteger(formData, "usefulLifeYears") ?? 0,
    ratePercent: requireString(formData, "ratePercent"),
    isDepreciable: parseCheckbox(formData, "isDepreciable"),
    effectiveFrom: getDateValue(formData, "effectiveFrom") ?? "2025-01-01",
    effectiveTo: getDateValue(formData, "effectiveTo"),
    isActive: parseCheckbox(formData, "isActive"),
    notes: getOptionalString(formData, "notes"),
  };
}

function buildTaxRulePayload(formData: FormData) {
  const taxYear = getInteger(formData, "taxYear");
  if (!taxYear) {
    throw new Error("taxYear is required");
  }

  return {
    groupId: requireString(formData, "groupId"),
    taxYear,
    method: requireString(formData, "method"),
    usefulLifeYears: getInteger(formData, "usefulLifeYears") ?? 0,
    ratePercent: requireString(formData, "ratePercent"),
    residualValuePercent: getOptionalString(formData, "residualValuePercent"),
    sourceRegulation: requireString(formData, "sourceRegulation"),
    effectiveFrom: getDateValue(formData, "effectiveFrom") ?? "2025-01-01",
    effectiveTo: getDateValue(formData, "effectiveTo"),
    isActive: parseCheckbox(formData, "isActive"),
    notes: getOptionalString(formData, "notes"),
  };
}

export async function createTaxGroupAction(formData: FormData) {
  try {
    const { user } = await requireAuthenticatedScope("tax-master.update");
    const row = await createTaxDepreciationGroup(buildTaxGroupPayload(formData));

    await writeAuditLog({
      actorUserId: user.id,
      action: "create",
      entity: "tax_depreciation_group",
      entityId: row.id,
      afterData: row,
    });

    revalidatePath("/settings/tax-master");
    redirect(`/settings/tax-master/groups/${row.id}/edit`);
  } catch (error) {
    await handleActionFailure(error, "/settings/tax-master");
  }
}

export async function updateTaxGroupAction(formData: FormData) {
  try {
    const { user } = await requireAuthenticatedScope("tax-master.update");

    const id = requireString(formData, "id");
    const before = await getTaxDepreciationGroup(id);

    if (!before) {
      throw new Error("Kelompok fiskal tidak ditemukan");
    }

    const row = await updateTaxDepreciationGroup(id, buildTaxGroupPayload(formData));

    if (!row) {
      throw new Error("Kelompok fiskal tidak ditemukan");
    }

    await writeAuditLog({
      actorUserId: user.id,
      action: "update",
      entity: "tax_depreciation_group",
      entityId: id,
      beforeData: before,
      afterData: row,
    });

    revalidatePath("/settings/tax-master");
    revalidatePath(`/settings/tax-master/groups/${id}/edit`);
    redirect(`/settings/tax-master/groups/${id}/edit`);
  } catch (error) {
    const id = typeof formData.get("id") === "string" ? formData.get("id") : "";
    await handleActionFailure(error, id ? `/settings/tax-master/groups/${id}/edit` : "/settings/tax-master");
  }
}

export async function deactivateTaxGroupAction(formData: FormData) {
  try {
    const { user } = await requireAuthenticatedScope("tax-master.update");

    const id = requireString(formData, "id");
    const before = await getTaxDepreciationGroup(id);

    if (!before) {
      throw new Error("Kelompok fiskal tidak ditemukan");
    }

    const references = await countTaxGroupReferences(id);
    if (references > 0 && before.isActive) {
      const row = await deactivateTaxDepreciationGroup(id);

      await writeAuditLog({
        actorUserId: user.id,
        action: "update",
        entity: "tax_depreciation_group",
        entityId: id,
        beforeData: before,
        afterData: row,
      });
    } else if (references === 0) {
      const row = await deactivateTaxDepreciationGroup(id);

      await writeAuditLog({
        actorUserId: user.id,
        action: "delete",
        entity: "tax_depreciation_group",
        entityId: id,
        beforeData: before,
        afterData: row,
      });
    }

    revalidatePath("/settings/tax-master");
    redirect("/settings/tax-master");
  } catch (error) {
    await handleActionFailure(error, "/settings/tax-master");
  }
}

export async function createTaxRuleAction(formData: FormData) {
  try {
    const { user } = await requireAuthenticatedScope("tax-master.update");
    const payload = buildTaxRulePayload(formData);
    const row = await createTaxDepreciationRule(payload);

    await writeAuditLog({
      actorUserId: user.id,
      action: "create",
      entity: "tax_depreciation_rule",
      entityId: row.id,
      afterData: row,
    });

    revalidatePath(`/settings/tax-master/groups/${payload.groupId}/edit`);
    redirect(`/settings/tax-master/groups/${payload.groupId}/edit`);
  } catch (error) {
    const groupId = typeof formData.get("groupId") === "string" ? formData.get("groupId") : "";
    await handleActionFailure(error, groupId ? `/settings/tax-master/groups/${groupId}/edit` : "/settings/tax-master");
  }
}

export async function updateTaxRuleAction(formData: FormData) {
  try {
    const { user } = await requireAuthenticatedScope("tax-master.update");

    const id = requireString(formData, "id");
    const before = await getTaxDepreciationRule(id);

    if (!before) {
      throw new Error("Aturan depresiasi tidak ditemukan");
    }

    const payload = buildTaxRulePayload(formData);
    const row = await updateTaxDepreciationRule(id, payload);

    if (!row) {
      throw new Error("Aturan depresiasi tidak ditemukan");
    }

    await writeAuditLog({
      actorUserId: user.id,
      action: "update",
      entity: "tax_depreciation_rule",
      entityId: id,
      beforeData: before,
      afterData: row,
    });

    revalidatePath(`/settings/tax-master/groups/${payload.groupId}/edit`);
    redirect(`/settings/tax-master/groups/${payload.groupId}/edit`);
  } catch (error) {
    const groupId = typeof formData.get("groupId") === "string" ? formData.get("groupId") : "";
    await handleActionFailure(error, groupId ? `/settings/tax-master/groups/${groupId}/edit` : "/settings/tax-master");
  }
}

export async function deactivateTaxRuleAction(formData: FormData) {
  try {
    const { user } = await requireAuthenticatedScope("tax-master.update");

    const id = requireString(formData, "id");
    const groupId = requireString(formData, "groupId");
    const before = await getTaxDepreciationRule(id);

    if (!before) {
      throw new Error("Aturan depresiasi tidak ditemukan");
    }

    const row = await deactivateTaxDepreciationRule(id);

    await writeAuditLog({
      actorUserId: user.id,
      action: "update",
      entity: "tax_depreciation_rule",
      entityId: id,
      beforeData: before,
      afterData: row,
    });

    revalidatePath(`/settings/tax-master/groups/${groupId}/edit`);
    redirect(`/settings/tax-master/groups/${groupId}/edit`);
  } catch (error) {
    const groupId = typeof formData.get("groupId") === "string" ? formData.get("groupId") : "";
    await handleActionFailure(error, groupId ? `/settings/tax-master/groups/${groupId}/edit` : "/settings/tax-master");
  }
}
