import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { assetLocations, badanHukums, units } from "@/db/schema";
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

export type AssetLocationFormInput = {
  unitId: string;
  name: string;
  code: string | null;
  locationKind: string;
  description: string | null;
  isActive: boolean;
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

export async function listAssetLocations(scope?: AccessScope) {
  const unitCondition = scope ? buildUnitScopeCondition(scope) : undefined;
  const query = db
    .select({
      id: assetLocations.id,
      unitId: assetLocations.unitId,
      name: assetLocations.name,
      code: assetLocations.code,
      locationKind: assetLocations.locationKind,
      description: assetLocations.description,
      isActive: assetLocations.isActive,
      createdAt: assetLocations.createdAt,
      updatedAt: assetLocations.updatedAt,
      unitName: units.name,
      unitCode: units.code,
    })
    .from(assetLocations)
    .leftJoin(units, eq(assetLocations.unitId, units.id))
    .orderBy(asc(units.name), asc(assetLocations.name));

  if (unitCondition) {
    return query.where(unitCondition);
  }

  return query;
}

export async function listActiveAssetLocations(scope?: AccessScope) {
  const unitCondition = scope ? buildUnitScopeCondition(scope) : undefined;
  const activeCondition = eq(assetLocations.isActive, true);
  const condition = unitCondition ? and(unitCondition, activeCondition) : activeCondition;

  return db
    .select({
      id: assetLocations.id,
      unitId: assetLocations.unitId,
      name: assetLocations.name,
      code: assetLocations.code,
      locationKind: assetLocations.locationKind,
      unitName: units.name,
      unitCode: units.code,
    })
    .from(assetLocations)
    .leftJoin(units, eq(assetLocations.unitId, units.id))
    .where(condition)
    .orderBy(asc(units.name), asc(assetLocations.name));
}

export async function getAssetLocation(id: string) {
  const rows = await db.select().from(assetLocations).where(eq(assetLocations.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createAssetLocation(input: AssetLocationFormInput) {
  const [row] = await db.insert(assetLocations).values(input).returning();
  return row;
}

export async function updateAssetLocation(id: string, input: AssetLocationFormInput) {
  const [row] = await db.update(assetLocations).set({ ...input, updatedAt: new Date() }).where(eq(assetLocations.id, id)).returning();
  return row ?? null;
}

export async function deleteAssetLocation(id: string) {
  await db.delete(assetLocations).where(eq(assetLocations.id, id));
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
