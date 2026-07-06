import "server-only";

import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";

import { db } from "@/db";
import { badanHukums, permissions, rolePermissions, roles, units, users } from "@/db/schema";

export type RbacUserListItem = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  roleCode: string;
  roleName: string;
  unitName: string | null;
  badanHukumName: string | null;
};

export type RbacRoleListItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  userCount: number;
  permissionCount: number;
};

export type RbacPermissionItem = {
  id: string;
  code: string;
  resource: string;
  action: string;
  description: string | null;
};

export async function listRbacUsers() {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      roleCode: roles.code,
      roleName: roles.name,
      unitName: units.name,
      badanHukumName: badanHukums.name,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .leftJoin(units, eq(users.unitId, units.id))
    .leftJoin(badanHukums, eq(users.badanHukumId, badanHukums.id))
    .orderBy(asc(users.name)) as Promise<RbacUserListItem[]>;
}

export async function getRbacUser(id: string) {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      isActive: users.isActive,
      roleId: users.roleId,
      roleCode: roles.code,
      unitId: users.unitId,
      badanHukumId: users.badanHukumId,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.id, id))
    .limit(1);

  return rows[0] ?? null;
}

export async function isRbacEmailTaken(email: string, excludeUserId?: string) {
  const normalized = email.trim().toLowerCase();
  const conditions = [eq(sql`lower(${users.email})`, normalized)];

  if (excludeUserId) {
    conditions.push(ne(users.id, excludeUserId));
  }

  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(and(...conditions))
    .limit(1);

  return Boolean(rows[0]);
}

export async function createRbacUser(input: {
  name: string;
  email: string;
  passwordHash: string;
  roleId: string;
  unitId: string | null;
  badanHukumId: string | null;
  isActive: boolean;
}) {
  const [row] = await db
    .insert(users)
    .values({
      name: input.name,
      email: input.email.trim().toLowerCase(),
      passwordHash: input.passwordHash,
      roleId: input.roleId,
      unitId: input.unitId,
      badanHukumId: input.badanHukumId,
      isActive: input.isActive,
    })
    .returning();

  return row;
}

export async function resetRbacUserPassword(id: string, passwordHash: string) {
  const [row] = await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning({ id: users.id, email: users.email });

  return row ?? null;
}

export async function listRbacRoles() {
  const [allRoles, userCounts, permissionCounts] = await Promise.all([
    db.select().from(roles).orderBy(asc(roles.name)),
    db
      .select({ roleId: users.roleId, count: sql<number>`count(*)::int` })
      .from(users)
      .groupBy(users.roleId),
    db
      .select({ roleId: rolePermissions.roleId, count: sql<number>`count(*)::int` })
      .from(rolePermissions)
      .where(eq(rolePermissions.granted, true))
      .groupBy(rolePermissions.roleId),
  ]);

  const userCountByRole = new Map(userCounts.map((row) => [row.roleId, row.count]));
  const permissionCountByRole = new Map(permissionCounts.map((row) => [row.roleId, row.count]));

  return allRoles.map((role) => ({
    id: role.id,
    code: role.code,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    userCount: userCountByRole.get(role.id) ?? 0,
    permissionCount: permissionCountByRole.get(role.id) ?? 0,
  })) satisfies RbacRoleListItem[];
}

export async function getRbacRoleByCode(code: string) {
  const rows = await db.select().from(roles).where(eq(roles.code, code)).limit(1);
  return rows[0] ?? null;
}

export async function listAllPermissions() {
  return db.select().from(permissions).orderBy(asc(permissions.resource), asc(permissions.action)) as Promise<RbacPermissionItem[]>;
}

export async function listRolePermissionCodes(roleId: string) {
  const rows = await db
    .select({ code: permissions.code })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.granted, true)));

  return rows.map((row) => row.code);
}

export async function updateRbacUser(
  id: string,
  input: {
    name: string;
    roleId: string;
    unitId: string | null;
    badanHukumId: string | null;
    isActive: boolean;
  }
) {
  const [row] = await db
    .update(users)
    .set({
      name: input.name,
      roleId: input.roleId,
      unitId: input.unitId,
      badanHukumId: input.badanHukumId,
      isActive: input.isActive,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning();

  return row ?? null;
}

export async function replaceRolePermissions(roleId: string, permissionIds: string[]) {
  await db.transaction(async (tx) => {
    await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));

    if (permissionIds.length === 0) {
      return;
    }

    await tx.insert(rolePermissions).values(
      permissionIds.map((permissionId) => ({
        roleId,
        permissionId,
        granted: true,
      }))
    );
  });
}

export async function listRoleOptions() {
  return db.select({ id: roles.id, code: roles.code, name: roles.name }).from(roles).orderBy(asc(roles.name));
}

export async function listUnitOptions() {
  return db.select({ id: units.id, code: units.code, name: units.name }).from(units).orderBy(asc(units.name));
}

export async function listBadanHukumOptions() {
  return db.select({ id: badanHukums.id, name: badanHukums.name }).from(badanHukums).orderBy(asc(badanHukums.name));
}

export async function getPermissionIdsByCodes(codes: string[]) {
  if (codes.length === 0) {
    return [];
  }

  const rows = await db.select({ id: permissions.id }).from(permissions).where(inArray(permissions.code, codes));
  return rows.map((row) => row.id);
}
