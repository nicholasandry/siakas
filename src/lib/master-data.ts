import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { badanHukums, units } from "@/db/schema";
import type { AccessScope } from "@/lib/scope";
import { buildBadanHukumScopeCondition, buildUnitScopeCondition } from "@/lib/scope";

export type UnitFormInput = {
  code: string;
  name: string;
  kind: string;
  category: string | null;
  parentId: string | null;
  legalParentType: string | null;
  legalParentUnitId: string | null;
  legalParentBadanHukumId: string | null;
  legalParentLabel: string | null;
  address: string | null;
  responsiblePerson: string | null;
  notes: string | null;
};

export type BadanHukumFormInput = {
  name: string;
  type: string;
  field: string;
  legalBasis: string | null;
  kemenkumhamNumber: string | null;
  establishedAt: string | null;
  representative: string | null;
  status: string | null;
  notes: string | null;
};

export async function listUnits(scope?: AccessScope) {
  const condition = scope ? buildUnitScopeCondition(scope) : undefined;
  const query = db.select().from(units).orderBy(asc(units.kind), asc(units.name));

  if (condition) {
    return query.where(condition);
  }

  return query;
}

export async function getUnit(id: string) {
  const rows = await db.select().from(units).where(eq(units.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createUnit(input: UnitFormInput) {
  const [row] = await db.insert(units).values(input).returning();
  return row;
}

export async function updateUnit(id: string, input: UnitFormInput) {
  const [row] = await db.update(units).set(input).where(eq(units.id, id)).returning();
  return row ?? null;
}

export async function deleteUnit(id: string) {
  await db.delete(units).where(eq(units.id, id));
}

export async function listBadanHukums(scope?: AccessScope) {
  const condition = scope ? buildBadanHukumScopeCondition(scope) : undefined;
  const query = db.select().from(badanHukums).orderBy(asc(badanHukums.name));

  if (condition) {
    return query.where(condition);
  }

  return query;
}

export async function getBadanHukum(id: string) {
  const rows = await db.select().from(badanHukums).where(eq(badanHukums.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createBadanHukum(input: BadanHukumFormInput) {
  const [row] = await db.insert(badanHukums).values(input).returning();
  return row;
}

export async function updateBadanHukum(id: string, input: BadanHukumFormInput) {
  const [row] = await db.update(badanHukums).set(input).where(eq(badanHukums.id, id)).returning();
  return row ?? null;
}

export async function deleteBadanHukum(id: string) {
  await db.delete(badanHukums).where(eq(badanHukums.id, id));
}
