"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { writeAuditLog } from "@/lib/audit";
import { handleActionFailure } from "@/lib/action-errors";
import { requireString } from "@/lib/form-utils";
import { hashPassword } from "@/lib/password";
import { createRbacUser, getRbacUser, isRbacEmailTaken, resetRbacUserPassword, updateRbacUser } from "@/lib/rbac";
import { requireAuthenticatedScope } from "@/lib/server-guards";
import { formDataToRecord, parseZod } from "@/lib/validators";
import { rbacPasswordResetSchema, rbacUserCreateSchema, rbacUserUpdateSchema } from "@/lib/validators/rbac";

function parseBoolean(formData: FormData, name: string) {
  return formData.get(name) === "on" || formData.get(name) === "true";
}

function buildUserScopePayload(formData: FormData) {
  const record = formDataToRecord(formData);
  const parsed = parseZod(rbacUserUpdateSchema, {
    ...record,
    isActive: parseBoolean(formData, "isActive"),
  });

  return {
    name: parsed.name,
    roleId: parsed.roleId,
    unitId: parsed.unitId,
    badanHukumId: parsed.badanHukumId,
    isActive: parsed.isActive ?? true,
  };
}

export async function createRbacUserAction(formData: FormData) {
  try {
    const { user } = await requireAuthenticatedScope("rbac.manage");

    const record = formDataToRecord(formData);
    const parsed = parseZod(rbacUserCreateSchema, {
      ...record,
      isActive: parseBoolean(formData, "isActive"),
    });

    const email = parsed.email.toLowerCase();

    if (await isRbacEmailTaken(email)) {
      throw new Error("Email sudah terdaftar");
    }

    const row = await createRbacUser({
      name: parsed.name,
      email,
      passwordHash: hashPassword(parsed.password),
      roleId: parsed.roleId,
      unitId: parsed.unitId,
      badanHukumId: parsed.badanHukumId,
      isActive: parsed.isActive ?? true,
    });

    await writeAuditLog({
      actorUserId: user.id,
      action: "create",
      entity: "user",
      entityId: row.id,
      afterData: {
        id: row.id,
        name: row.name,
        email: row.email,
        roleId: row.roleId,
        unitId: row.unitId,
        badanHukumId: row.badanHukumId,
        isActive: row.isActive,
      },
    });

    revalidatePath("/settings/rbac/users");
    redirect("/settings/rbac/users");
  } catch (error) {
    await handleActionFailure(error, "/settings/rbac/users");
  }
}

export async function updateRbacUserAction(formData: FormData) {
  try {
    const { user } = await requireAuthenticatedScope("rbac.manage");

    const id = requireString(formData, "id");
    const before = await getRbacUser(id);

    if (!before) {
      throw new Error("Pengguna tidak ditemukan");
    }

    if (id === user.id && !parseBoolean(formData, "isActive")) {
      throw new Error("Anda tidak dapat menonaktifkan akun sendiri");
    }

    const row = await updateRbacUser(id, buildUserScopePayload(formData));

    if (!row) {
      throw new Error("Pengguna tidak ditemukan");
    }

    await writeAuditLog({
      actorUserId: user.id,
      action: "update",
      entity: "user",
      entityId: id,
      beforeData: before,
      afterData: row,
    });

    revalidatePath("/settings/rbac/users");
    redirect("/settings/rbac/users");
  } catch (error) {
    const id = formData.get("id");
    const redirectPath = typeof id === "string" && id ? `/settings/rbac/users/${id}/edit` : "/settings/rbac/users";
    await handleActionFailure(error, redirectPath);
  }
}

export async function resetRbacUserPasswordAction(formData: FormData) {
  try {
    const { user } = await requireAuthenticatedScope("rbac.manage");

    const id = requireString(formData, "id");
    const passwordPayload = parseZod(rbacPasswordResetSchema, {
      password: requireString(formData, "password"),
      confirmPassword: requireString(formData, "confirmPassword"),
    });

    const before = await getRbacUser(id);

    if (!before) {
      throw new Error("Pengguna tidak ditemukan");
    }

    const row = await resetRbacUserPassword(id, hashPassword(passwordPayload.password));

    if (!row) {
      throw new Error("Pengguna tidak ditemukan");
    }

    await writeAuditLog({
      actorUserId: user.id,
      action: "update",
      entity: "user",
      entityId: id,
      beforeData: { email: before.email, passwordReset: false },
      afterData: { email: row.email, passwordReset: true },
    });

    revalidatePath(`/settings/rbac/users/${id}/edit`);
    redirect(`/settings/rbac/users/${id}/edit?success=Password berhasil diperbarui`);
  } catch (error) {
    const id = formData.get("id");
    const redirectPath = typeof id === "string" && id ? `/settings/rbac/users/${id}/edit` : "/settings/rbac/users";
    await handleActionFailure(error, redirectPath);
  }
}
