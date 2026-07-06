import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { assets, badanHukums, units } from "@/db/schema";
import type { SessionUser } from "@/lib/authz";
import { AuthorizationError } from "@/lib/authz";
import { collectDescendantUnitIds, type UnitTreeNode } from "@/lib/unit-tree";

export type AccessScope =
  | { type: "all" }
  | { type: "unit"; unitIds: Set<string> }
  | { type: "badan_hukum"; badanHukumId: string };

export async function loadUnitTreeNodes(): Promise<UnitTreeNode[]> {
  return db.select({ id: units.id, parentId: units.parentId, name: units.name, code: units.code }).from(units);
}

export async function resolveAccessScope(user: SessionUser): Promise<AccessScope> {
  if (user.role === "superadmin" || user.role === "admin-aset") {
    return { type: "all" };
  }

  if (user.role === "admin-badan") {
    if (!user.badanHukumId) {
      throw new AuthorizationError("User tidak memiliki badan hukum");
    }

    return { type: "badan_hukum", badanHukumId: user.badanHukumId };
  }

  if (!user.unitId) {
    throw new AuthorizationError("User tidak memiliki unit");
  }

  const unitNodes = await loadUnitTreeNodes();
  const unitIds = new Set(collectDescendantUnitIds(unitNodes, user.unitId));
  unitIds.add(user.unitId);

  return { type: "unit", unitIds };
}

export function isUnitInScope(scope: AccessScope, unitId: string | null | undefined): boolean {
  if (!unitId) {
    return false;
  }

  if (scope.type === "all") {
    return true;
  }

  if (scope.type === "unit") {
    return scope.unitIds.has(unitId);
  }

  return false;
}

export function isBadanHukumInScope(scope: AccessScope, badanHukumId: string | null | undefined): boolean {
  if (!badanHukumId) {
    return false;
  }

  if (scope.type === "all") {
    return true;
  }

  if (scope.type === "badan_hukum") {
    return scope.badanHukumId === badanHukumId;
  }

  return false;
}

export function assertUnitInScope(scope: AccessScope, unitId: string | null | undefined) {
  if (!isUnitInScope(scope, unitId)) {
    throw new AuthorizationError();
  }
}

export function assertBadanHukumInScope(scope: AccessScope, badanHukumId: string | null | undefined) {
  if (!isBadanHukumInScope(scope, badanHukumId)) {
    throw new AuthorizationError();
  }
}

export function assertAssetInScope(
  scope: AccessScope,
  asset: { unitId: string | null; badanHukumId: string | null; ownershipLevel?: string | null }
) {
  if (scope.type === "all") {
    return;
  }

  if (scope.type === "badan_hukum") {
    if (asset.badanHukumId !== scope.badanHukumId) {
      throw new AuthorizationError();
    }
    return;
  }

  if (asset.unitId && scope.unitIds.has(asset.unitId)) {
    return;
  }

  if (asset.badanHukumId && scope.type === "unit") {
    throw new AuthorizationError();
  }

  throw new AuthorizationError();
}

export function assertAssetPayloadInScope(
  scope: AccessScope,
  payload: { unitId: string | null; badanHukumId: string | null; ownershipLevel: string }
) {
  if (scope.type === "all") {
    return;
  }

  if (scope.type === "badan_hukum") {
    if (payload.ownershipLevel === "badan_hukum") {
      assertBadanHukumInScope(scope, payload.badanHukumId);
      return;
    }

    throw new AuthorizationError();
  }

  if (payload.ownershipLevel === "keuskupan" || payload.ownershipLevel === "unit") {
    assertUnitInScope(scope, payload.unitId);
    return;
  }

  if (payload.ownershipLevel === "badan_hukum") {
    throw new AuthorizationError();
  }

  throw new AuthorizationError();
}

export function buildUnitScopeCondition(scope: AccessScope) {
  if (scope.type === "all") {
    return undefined;
  }

  if (scope.type === "unit") {
    return inArray(units.id, [...scope.unitIds]);
  }

  return sql`false`;
}

export function buildAssetScopeCondition(scope: AccessScope) {
  if (scope.type === "all") {
    return undefined;
  }

  if (scope.type === "badan_hukum") {
    return eq(assets.badanHukumId, scope.badanHukumId);
  }

  return inArray(assets.unitId, [...scope.unitIds]);
}

export function buildBadanHukumScopeCondition(scope: AccessScope) {
  if (scope.type === "all") {
    return undefined;
  }

  if (scope.type === "badan_hukum") {
    return eq(badanHukums.id, scope.badanHukumId);
  }

  return sql`false`;
}
