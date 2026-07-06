import type { SessionUser } from "@/lib/authz";
import { AuthorizationError, hasPermission } from "@/lib/authz";
import type { PermissionCode, RoleCode } from "@/lib/permissions";

export function requireSessionUser(user: SessionUser | null | undefined): SessionUser {
  if (!user) {
    throw new AuthorizationError("Unauthenticated");
  }

  return user;
}

export function requirePermissionScope(user: SessionUser | null | undefined, permission: PermissionCode) {
  if (!hasPermission(user, permission)) {
    throw new AuthorizationError();
  }
}

export function requireRoleScope(user: SessionUser | null | undefined, allowed: RoleCode[]) {
  if (!user) {
    throw new AuthorizationError("Unauthenticated");
  }

  if (user.role !== "superadmin" && !allowed.includes(user.role)) {
    throw new AuthorizationError();
  }
}

export function requireUnitScope(user: SessionUser | null | undefined, unitId: string) {
  const sessionUser = requireSessionUser(user);

  if (sessionUser.role === "superadmin") {
    return;
  }

  if (sessionUser.unitId !== unitId) {
    throw new AuthorizationError();
  }
}

export function requireBadanHukumScope(user: SessionUser | null | undefined, badanHukumId: string) {
  const sessionUser = requireSessionUser(user);

  if (sessionUser.role === "superadmin") {
    return;
  }

  if (sessionUser.badanHukumId !== badanHukumId) {
    throw new AuthorizationError();
  }
}
