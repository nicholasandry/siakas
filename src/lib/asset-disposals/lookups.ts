import { and, asc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { assetDisposalLookupOptions } from "@/db/schema";
import {
  disposalLookupCategories,
  disposalLookupDefaults,
  type DisposalLookupCategory,
} from "@/lib/asset-disposals/constants";

export type DisposalLookupOption = {
  id?: string;
  category: DisposalLookupCategory;
  code: string;
  label: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  isSystem?: boolean;
  metadata?: Record<string, unknown> | null;
};

export type DisposalLookupInput = {
  category: DisposalLookupCategory;
  code: string;
  label: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  metadata?: Record<string, unknown> | null;
};

function fallbackOptions(category: DisposalLookupCategory): DisposalLookupOption[] {
  return disposalLookupDefaults[category].map((item) => ({
    category,
    code: item.code,
    label: item.label,
    sortOrder: item.sortOrder,
    isActive: true,
    isSystem: true,
  }));
}

export function isDisposalLookupCategory(value: string): value is DisposalLookupCategory {
  return disposalLookupCategories.includes(value as DisposalLookupCategory);
}

export async function listDisposalLookupOptions(category?: DisposalLookupCategory) {
  const query = db
    .select()
    .from(assetDisposalLookupOptions)
    .orderBy(asc(assetDisposalLookupOptions.category), asc(assetDisposalLookupOptions.sortOrder), asc(assetDisposalLookupOptions.label));

  if (category) {
    return query.where(eq(assetDisposalLookupOptions.category, category));
  }

  return query;
}

export async function listActiveDisposalLookupOptions(category: DisposalLookupCategory) {
  const rows = await db
    .select()
    .from(assetDisposalLookupOptions)
    .where(and(eq(assetDisposalLookupOptions.category, category), eq(assetDisposalLookupOptions.isActive, true)))
    .orderBy(asc(assetDisposalLookupOptions.sortOrder), asc(assetDisposalLookupOptions.label));

  return rows.length > 0 ? rows.map((row) => ({ ...row, category })) : fallbackOptions(category);
}

export async function getDisposalLookupOption(id: string) {
  const rows = await db.select().from(assetDisposalLookupOptions).where(eq(assetDisposalLookupOptions.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createDisposalLookupOption(input: DisposalLookupInput) {
  const [row] = await db.insert(assetDisposalLookupOptions).values(input).returning();
  return row;
}

export async function updateDisposalLookupOption(id: string, input: DisposalLookupInput) {
  const [row] = await db
    .update(assetDisposalLookupOptions)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(assetDisposalLookupOptions.id, id))
    .returning();
  return row ?? null;
}

export async function deleteDisposalLookupOption(id: string) {
  await db.delete(assetDisposalLookupOptions).where(eq(assetDisposalLookupOptions.id, id));
}

export async function assertActiveDisposalLookupValues(values: Partial<Record<DisposalLookupCategory, string | null | undefined>>) {
  const entries = Object.entries(values).filter((entry): entry is [DisposalLookupCategory, string] => {
    const [category, value] = entry;
    return isDisposalLookupCategory(category) && typeof value === "string" && value.length > 0;
  });

  if (entries.length === 0) return;

  const categories = [...new Set(entries.map(([category]) => category))];
  const rows = await db
    .select({
      category: assetDisposalLookupOptions.category,
      code: assetDisposalLookupOptions.code,
    })
    .from(assetDisposalLookupOptions)
    .where(and(inArray(assetDisposalLookupOptions.category, categories), eq(assetDisposalLookupOptions.isActive, true)));

  const hasSeededLookup = rows.length > 0;
  const validByCategory = new Map<DisposalLookupCategory, Set<string>>();

  for (const category of categories) {
    const seededCodes = rows.filter((row) => row.category === category).map((row) => row.code);
    const source = hasSeededLookup ? seededCodes : fallbackOptions(category).map((row) => row.code);
    validByCategory.set(category, new Set(source));
  }

  for (const [category, value] of entries) {
    if (!validByCategory.get(category)?.has(value)) {
      throw new Error(`Pilihan ${category} tidak valid atau tidak aktif`);
    }
  }
}

export function getAllowedDisposalMethods(reason?: Pick<DisposalLookupOption, "metadata"> | null) {
  const value = reason?.metadata?.allowedDisposalMethods;
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.length > 0) : [];
}

export async function assertAllowedDisposalMethodForReason(disposalReasonType: string, disposalMethod: string) {
  const rows = await db
    .select({ metadata: assetDisposalLookupOptions.metadata })
    .from(assetDisposalLookupOptions)
    .where(
      and(
        eq(assetDisposalLookupOptions.category, "disposal_reason_type"),
        eq(assetDisposalLookupOptions.code, disposalReasonType),
        eq(assetDisposalLookupOptions.isActive, true)
      )
    )
    .limit(1);

  const allowedMethods = getAllowedDisposalMethods(rows[0]);
  if (allowedMethods.length > 0 && !allowedMethods.includes(disposalMethod)) {
    throw new Error("Cara penyelesaian tidak tersedia untuk alasan disposal yang dipilih");
  }
}

export async function listDisposalFormLookups() {
  const [
    disposalReasonTypes,
    disposalMethods,
    physicalConditions,
    buyerTypes,
    governmentPolicyTypes,
    forcedEventTypes,
    disposalDocumentTypes,
  ] = await Promise.all([
    listActiveDisposalLookupOptions("disposal_reason_type"),
    listActiveDisposalLookupOptions("disposal_method"),
    listActiveDisposalLookupOptions("physical_condition"),
    listActiveDisposalLookupOptions("buyer_type"),
    listActiveDisposalLookupOptions("government_policy_type"),
    listActiveDisposalLookupOptions("forced_event_type"),
    listActiveDisposalLookupOptions("disposal_document_type"),
  ]);

  return {
    disposalReasonTypes,
    disposalMethods,
    physicalConditions,
    buyerTypes,
    governmentPolicyTypes,
    forcedEventTypes,
    disposalDocumentTypes,
  };
}
