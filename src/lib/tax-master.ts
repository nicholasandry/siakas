import { and, asc, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { taxAssetDepreciation, taxDepreciationGroups, taxDepreciationRules } from "@/db/schema";
import type { DepreciationGroupInput, DepreciationRuleInput } from "@/lib/depreciation";

export type TaxGroupFormInput = {
  code: string;
  name: string;
  assetCategory: string;
  methodDefault: string;
  usefulLifeYears: number;
  ratePercent: string;
  isDepreciable: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  notes: string | null;
};

export type TaxRuleFormInput = {
  groupId: string;
  taxYear: number;
  method: string;
  usefulLifeYears: number;
  ratePercent: string;
  residualValuePercent: string | null;
  sourceRegulation: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  notes: string | null;
};

export function toDepreciationGroupInput(group: typeof taxDepreciationGroups.$inferSelect): DepreciationGroupInput {
  return {
    id: group.id,
    code: group.code,
    name: group.name,
    assetCategory: group.assetCategory,
    methodDefault: group.methodDefault,
    usefulLifeYears: group.usefulLifeYears,
    ratePercent: group.ratePercent,
    isDepreciable: group.isDepreciable,
  };
}

export function toDepreciationRuleInput(rule: typeof taxDepreciationRules.$inferSelect): DepreciationRuleInput {
  return {
    id: rule.id,
    method: rule.method,
    usefulLifeYears: rule.usefulLifeYears,
    ratePercent: rule.ratePercent,
    residualValuePercent: rule.residualValuePercent,
  };
}

export async function listTaxDepreciationGroups() {
  return db.select().from(taxDepreciationGroups).orderBy(asc(taxDepreciationGroups.assetCategory), asc(taxDepreciationGroups.name));
}

export async function listTaxDepreciationGroupsByCategory(assetCategory: string) {
  return db
    .select()
    .from(taxDepreciationGroups)
    .where(and(eq(taxDepreciationGroups.assetCategory, assetCategory), eq(taxDepreciationGroups.isActive, true)))
    .orderBy(asc(taxDepreciationGroups.name));
}

export async function getTaxDepreciationGroup(id: string) {
  const rows = await db.select().from(taxDepreciationGroups).where(eq(taxDepreciationGroups.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getTaxDepreciationGroupByCode(code: string) {
  const rows = await db.select().from(taxDepreciationGroups).where(eq(taxDepreciationGroups.code, code)).limit(1);
  return rows[0] ?? null;
}

export async function createTaxDepreciationGroup(input: TaxGroupFormInput) {
  const [row] = await db.insert(taxDepreciationGroups).values(input).returning();
  return row;
}

export async function updateTaxDepreciationGroup(id: string, input: TaxGroupFormInput) {
  const [row] = await db
    .update(taxDepreciationGroups)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(taxDepreciationGroups.id, id))
    .returning();

  return row ?? null;
}

export async function countTaxGroupReferences(groupId: string) {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(taxAssetDepreciation)
    .where(eq(taxAssetDepreciation.depreciationGroupId, groupId));

  return rows[0]?.count ?? 0;
}

export async function deactivateTaxDepreciationGroup(id: string) {
  const [row] = await db
    .update(taxDepreciationGroups)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(taxDepreciationGroups.id, id))
    .returning();

  return row ?? null;
}

export async function listTaxDepreciationRules(groupId: string) {
  return db
    .select()
    .from(taxDepreciationRules)
    .where(eq(taxDepreciationRules.groupId, groupId))
    .orderBy(desc(taxDepreciationRules.taxYear), desc(taxDepreciationRules.effectiveFrom));
}

export async function getTaxDepreciationRule(id: string) {
  const rows = await db.select().from(taxDepreciationRules).where(eq(taxDepreciationRules.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createTaxDepreciationRule(input: TaxRuleFormInput) {
  const [row] = await db.insert(taxDepreciationRules).values(input).returning();
  return row;
}

export async function updateTaxDepreciationRule(id: string, input: TaxRuleFormInput) {
  const [row] = await db
    .update(taxDepreciationRules)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(taxDepreciationRules.id, id))
    .returning();

  return row ?? null;
}

export async function deactivateTaxDepreciationRule(id: string) {
  const [row] = await db
    .update(taxDepreciationRules)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(taxDepreciationRules.id, id))
    .returning();

  return row ?? null;
}
