import type { PermissionCode, RoleCode } from "@/lib/permissions";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: RoleCode;
  permissions: PermissionCode[];
  unitId?: string | null;
  badanHukumId?: string | null;
};

export class AuthorizationError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export function hasPermission(user: SessionUser | null | undefined, permission: PermissionCode) {
  if (!user) return false;
  if (user.role === "superadmin") return true;
  return user.permissions.includes(permission);
}

export function requirePermission(user: SessionUser | null | undefined, permission: PermissionCode) {
  if (!hasPermission(user, permission)) {
    throw new AuthorizationError();
  }
}

export function requireRole(user: SessionUser | null | undefined, allowed: RoleCode[]) {
  if (!user || (!allowed.includes(user.role) && user.role !== "superadmin")) {
    throw new AuthorizationError();
  }
}
