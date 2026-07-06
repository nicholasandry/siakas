import "server-only";

import { redirect } from "next/navigation";

import { auditAccessDenied } from "@/lib/audit";
import type { SessionUser } from "@/lib/authz";
import { AuthorizationError, hasPermission } from "@/lib/authz";
import { redirectForbidden } from "@/lib/action-errors";
import type { PermissionCode } from "@/lib/permissions";
import type { AccessScope } from "@/lib/scope";
import { resolveAccessScope } from "@/lib/scope";
import { getCurrentUser } from "@/lib/session";

export async function requireAuthenticatedScope(permission: PermissionCode): Promise<{ user: SessionUser; scope: AccessScope }> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!hasPermission(user, permission)) {
    await auditAccessDenied(user.id, { entity: permission, reason: "permission" });
    redirectForbidden("permission");
  }

  try {
    const scope = await resolveAccessScope(user);
    return { user, scope };
  } catch (error) {
    if (error instanceof AuthorizationError) {
      await auditAccessDenied(user.id, { entity: permission, reason: "scope" });
      redirectForbidden("scope");
    }

    throw error;
  }
}

export async function requirePageAccess(permission: PermissionCode) {
  return requireAuthenticatedScope(permission);
}

export async function requireAnyPageAccess(permissions: PermissionCode[]): Promise<SessionUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!permissions.some((permission) => hasPermission(user, permission))) {
    await auditAccessDenied(user.id, {
      entity: permissions.join(","),
      reason: "permission",
    });
    redirectForbidden("permission");
  }

  return user;
}
