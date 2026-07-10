"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { writeAuditLog } from "@/lib/audit";
import { handleActionFailure } from "@/lib/action-errors";
import { requireString } from "@/lib/form-utils";
import { getPermissionIdsByCodes, getRbacRoleByCode, listRolePermissionCodes, replaceRolePermissions } from "@/lib/rbac";
import { permissions as allPermissionCodes } from "@/lib/permissions";
import { requireAuthenticatedScope } from "@/lib/server-guards";

export async function updateRolePermissionsAction(formData: FormData) {
  try {
    const { user } = await requireAuthenticatedScope("rbac.manage");

    const roleCode = requireString(formData, "roleCode");
    const role = await getRbacRoleByCode(roleCode);

    if (!role) {
      throw new Error("Role tidak ditemukan");
    }

    if (role.code === "superadmin") {
      throw new Error("Permission role superadmin tidak dapat diubah");
    }

    const beforeCodes = await listRolePermissionCodes(role.id);
    const selectedCodes = allPermissionCodes.filter((code) => formData.get(`perm_${code}`) === "on");
    const permissionIds = await getPermissionIdsByCodes(selectedCodes);

    await replaceRolePermissions(role.id, permissionIds);

    await writeAuditLog({
      actorUserId: user.id,
      action: "update",
      entity: "role_permissions",
      entityId: role.id,
      beforeData: { roleCode: role.code, permissions: beforeCodes },
      afterData: { roleCode: role.code, permissions: selectedCodes },
    });

    revalidatePath("/settings/rbac/roles");
    revalidatePath(`/settings/rbac/roles/${role.code}/edit`);
    redirect("/settings/rbac/roles");
  } catch (error) {
    const roleCode = formData.get("roleCode");
    const redirectPath =
      typeof roleCode === "string" && roleCode ? `/settings/rbac/roles/${roleCode}/edit` : "/settings/rbac/roles";
    await handleActionFailure(error, redirectPath);
  }
}
