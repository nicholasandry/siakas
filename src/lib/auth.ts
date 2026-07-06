import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { permissions, rolePermissions, roles, users } from "@/db/schema";
import type { SessionUser } from "@/lib/authz";
import type { PermissionCode, RoleCode } from "@/lib/permissions";
import { verifyPassword } from "@/lib/password";

export async function authenticateUser(email: string, password: string): Promise<SessionUser | null> {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      passwordHash: users.passwordHash,
      isActive: users.isActive,
      unitId: users.unitId,
      badanHukumId: users.badanHukumId,
      roleCode: roles.code,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.email, email))
    .limit(1);

  const user = rows[0];

  if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
    return null;
  }

  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

  return buildSessionUser(user.id);
}

export async function buildSessionUser(userId: string): Promise<SessionUser | null> {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      unitId: users.unitId,
      badanHukumId: users.badanHukumId,
      isActive: users.isActive,
      roleCode: roles.code,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.id, userId))
    .limit(1);

  const user = rows[0];

  if (!user || !user.isActive) {
    return null;
  }

  const permissionRows = await db
    .select({ code: permissions.code })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .innerJoin(roles, eq(rolePermissions.roleId, roles.id))
    .where(and(eq(roles.code, user.roleCode), eq(rolePermissions.granted, true)));

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.roleCode as RoleCode,
    permissions: permissionRows.map((row) => row.code as PermissionCode),
    unitId: user.unitId,
    badanHukumId: user.badanHukumId,
  };
}
