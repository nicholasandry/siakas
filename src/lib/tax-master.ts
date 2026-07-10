import { and, asc, desc, eq, gte, sql } from "drizzle-orm";

import { db } from "@/db";
import { assets, taxAssetDepreciation, taxDepreciationGroups, taxDepreciationRules } from "@/db/schema";
import type { DepreciationGroupInput, DepreciationRuleInput } from "@/lib/depreciation";
import { generateDepreciationSchedule } from "@/lib/depreciation";

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
  if (row) {
    await recalculateAffectedAssetsDepreciation(row.groupId, new Date(row.effectiveFrom));
  }
  return row;
}

export async function updateTaxDepreciationRule(id: string, input: TaxRuleFormInput) {
  const [row] = await db
    .update(taxDepreciationRules)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(taxDepreciationRules.id, id))
    .returning();

  if (row) {
    await recalculateAffectedAssetsDepreciation(row.groupId, new Date(row.effectiveFrom));
  }
  return row ?? null;
}

export async function deactivateTaxDepreciationRule(id: string) {
  const [row] = await db
    .update(taxDepreciationRules)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(taxDepreciationRules.id, id))
    .returning();

  if (row) {
    await recalculateAffectedAssetsDepreciation(row.groupId, new Date(row.effectiveFrom));
  }
  return row ?? null;
}

export async function recalculateAffectedAssetsDepreciation(groupId: string, effectiveFromDate: Date) {
  const effectiveYear = effectiveFromDate.getFullYear();

  // 1. Dapatkan daftar assetId unik yang menggunakan kelompok depresiasi ini
  const affected = await db
    .select({ assetId: taxAssetDepreciation.assetId })
    .from(taxAssetDepreciation)
    .where(eq(taxAssetDepreciation.depreciationGroupId, groupId))
    .groupBy(taxAssetDepreciation.assetId);

  // 2. Dapatkan kelompok depresiasi
  const group = await getTaxDepreciationGroup(groupId);
  if (!group) return;

  // 3. Untuk setiap aset, lakukan re-generate jadwal secara prospektif
  for (const item of affected) {
    const assetId = item.assetId;

    // Dapatkan data aset asli
    const asset = await db
      .select({
        acquisitionValue: assets.acquisitionValue,
        acquisitionDate: assets.acquisitionDate,
      })
      .from(assets)
      .where(eq(assets.id, assetId))
      .limit(1)
      .then((rows) => rows[0] ?? null);

    if (!asset || !asset.acquisitionValue || !asset.acquisitionDate) {
      continue;
    }

    const acqValue = Number(asset.acquisitionValue) || 0;
    const acqYear = new Date(asset.acquisitionDate).getFullYear();
    if (acqValue <= 0 || isNaN(acqYear)) {
      continue;
    }

    const startFromYear = Math.max(effectiveYear, acqYear);

    // Ambil data tahun sebelumnya jika kalkulasi prospektif
    let baseBookValue: number | null = null;
    let baseAccumulated: number | null = null;

    if (startFromYear > acqYear) {
      const previousYearRecord = await db
        .select()
        .from(taxAssetDepreciation)
        .where(and(eq(taxAssetDepreciation.assetId, assetId), eq(taxAssetDepreciation.taxYear, startFromYear - 1)))
        .limit(1)
        .then((rows) => rows[0] ?? null);

      if (previousYearRecord) {
        baseBookValue = Number(previousYearRecord.bookValue);
        baseAccumulated = Number(previousYearRecord.accumulatedDepreciation);
      }
    }

    // Hapus data penyusutan dari startFromYear ke depan
    await db
      .delete(taxAssetDepreciation)
      .where(and(eq(taxAssetDepreciation.assetId, assetId), gte(taxAssetDepreciation.taxYear, startFromYear)));

    // Dapatkan rule penyusutan aktif untuk tahun startFromYear
    const exactYearRule = await db
      .select()
      .from(taxDepreciationRules)
      .where(
        and(
          eq(taxDepreciationRules.groupId, groupId),
          eq(taxDepreciationRules.taxYear, startFromYear),
          eq(taxDepreciationRules.isActive, true)
        )
      )
      .orderBy(desc(taxDepreciationRules.effectiveFrom), desc(taxDepreciationRules.updatedAt))
      .limit(1)
      .then((rows) => rows[0] ?? null);

    const rule =
      exactYearRule ||
      (await db
        .select()
        .from(taxDepreciationRules)
        .where(and(eq(taxDepreciationRules.groupId, groupId), eq(taxDepreciationRules.isActive, true)))
        .orderBy(desc(taxDepreciationRules.taxYear), desc(taxDepreciationRules.effectiveFrom), desc(taxDepreciationRules.updatedAt))
        .limit(1)
        .then((rows) => rows[0] ?? null));

    // Generate jadwal baru
    const schedule = generateDepreciationSchedule(
      acqValue,
      toDepreciationGroupInput(group),
      rule ? toDepreciationRuleInput(rule) : null,
      acqYear,
      startFromYear,
      baseBookValue,
      baseAccumulated
    );

    // Simpan jadwal baru
    if (schedule.length > 0) {
      await db.insert(taxAssetDepreciation).values(
        schedule.map((item) => ({
          assetId,
          depreciationGroupId: item.depreciationGroupId,
          ruleId: item.ruleId,
          acquisitionValue: item.acquisitionValue,
          residualValue: item.residualValue,
          depreciableBase: item.depreciableBase,
          annualDepreciation: item.annualDepreciation,
          accumulatedDepreciation: item.accumulatedDepreciation,
          bookValue: item.bookValue,
          startDate: item.startDate,
          endDate: item.endDate,
          status: item.status,
          calculationMethod: item.calculationMethod,
          taxYear: item.taxYear,
          notes: item.notes,
        }))
      );
    }
  }
}
