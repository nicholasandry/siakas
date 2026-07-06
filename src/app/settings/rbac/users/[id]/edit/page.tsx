import Link from "next/link";
import { notFound } from "next/navigation";

import { RbacUserForm } from "@/components/forms/rbac-user-form";
import { ResetPasswordForm } from "@/components/forms/reset-password-form";
import { ActionAlert } from "@/components/ui/action-alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auditPageView } from "@/lib/audit";
import { getRbacUser, listBadanHukumOptions, listRoleOptions, listUnitOptions } from "@/lib/rbac";
import { requirePageAccess } from "@/lib/server-guards";
import { updateRbacUserAction, resetRbacUserPasswordAction } from "../../actions";

const actionClassName =
  "inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default async function EditRbacUserPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { id } = await params;
  const { error, success } = await searchParams;
  const { user } = await requirePageAccess("rbac.manage");

  const [rbacUser, roleOptions, unitOptions, badanHukumOptions] = await Promise.all([
    getRbacUser(id),
    listRoleOptions(),
    listUnitOptions(),
    listBadanHukumOptions(),
  ]);

  if (!rbacUser) {
    notFound();
  }

  await auditPageView(user.id, {
    entity: "user",
    entityId: rbacUser.id,
    view: "edit",
    metadata: { email: rbacUser.email, roleCode: rbacUser.roleCode },
  });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-10">
      <ActionAlert message={error} />
      <ActionAlert message={success} variant="success" />

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">RBAC / Edit pengguna</p>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">{rbacUser.name}</h1>
            <p className="text-base leading-7 text-slate-600">{rbacUser.email}</p>
          </div>
          <Link href="/settings/rbac/users" className={actionClassName}>
            Kembali
          </Link>
        </div>
      </section>

      <Card className="border-white/70 bg-white/85 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle className="text-2xl">Profil & akses</CardTitle>
          <CardDescription>Role menentukan permission; unit/badan hukum menentukan scope data row-level.</CardDescription>
        </CardHeader>
        <CardContent>
          <RbacUserForm
            action={updateRbacUserAction}
            submitLabel="Simpan perubahan"
            values={{
              id: rbacUser.id,
              name: rbacUser.name,
              email: rbacUser.email,
              roleId: rbacUser.roleId,
              unitId: rbacUser.unitId,
              badanHukumId: rbacUser.badanHukumId,
              isActive: rbacUser.isActive,
            }}
            roleOptions={roleOptions}
            unitOptions={unitOptions}
            badanHukumOptions={badanHukumOptions}
          />
        </CardContent>
      </Card>

      <Card className="border-white/70 bg-white/85 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle className="text-xl">Reset password</CardTitle>
          <CardDescription>Setel ulang password tanpa mengubah data profil pengguna.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResetPasswordForm action={resetRbacUserPasswordAction} userId={rbacUser.id} />
        </CardContent>
      </Card>
    </main>
  );
}
