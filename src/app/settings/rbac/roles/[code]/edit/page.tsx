import Link from "next/link";
import { notFound } from "next/navigation";

import { RolePermissionsForm } from "@/components/forms/role-permissions-form";
import { ActionAlert } from "@/components/ui/action-alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auditPageView } from "@/lib/audit";
import { getRbacRoleByCode, listAllPermissions, listRolePermissionCodes } from "@/lib/rbac";
import { permissions as allPermissionCodes } from "@/lib/permissions";
import { requirePageAccess } from "@/lib/server-guards";
import { updateRolePermissionsAction } from "../../actions";

const actionClassName =
  "inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default async function EditRolePermissionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { code } = await params;
  const { error } = await searchParams;
  const { user } = await requirePageAccess("rbac.manage");

  const role = await getRbacRoleByCode(code);

  if (!role) {
    notFound();
  }

  const [permissions, grantedCodes] = await Promise.all([
    listAllPermissions(),
    role.code === "superadmin" ? Promise.resolve([...allPermissionCodes]) : listRolePermissionCodes(role.id),
  ]);

  const readOnly = role.code === "superadmin";

  await auditPageView(user.id, {
    entity: "role_permissions",
    entityId: role.id,
    view: "edit",
    metadata: { roleCode: role.code, grantedCount: grantedCodes.length },
  });

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-10">
      <ActionAlert message={error} />

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">RBAC / Edit role</p>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">{role.name}</h1>
            <p className="font-mono text-sm text-slate-600">{role.code}</p>
          </div>
          <Link href="/settings/rbac/roles" className={actionClassName}>
            Kembali
          </Link>
        </div>
      </section>

      <Card className="border-white/70 bg-white/85 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle className="text-2xl">Permission matrix</CardTitle>
          <CardDescription>
            {readOnly
              ? "Superadmin selalu memiliki semua permission via kode aplikasi."
              : "Centang permission yang diizinkan untuk role ini. Perubahan berlaku setelah pengguna login ulang."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RolePermissionsForm
            action={updateRolePermissionsAction}
            submitLabel="Simpan permission"
            roleCode={role.code}
            roleName={role.name}
            permissions={permissions}
            grantedCodes={grantedCodes}
            readOnly={readOnly}
          />
        </CardContent>
      </Card>
    </main>
  );
}
