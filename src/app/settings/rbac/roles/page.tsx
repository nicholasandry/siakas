import Link from "next/link";
import { Pencil } from "lucide-react";

import { ActionAlert } from "@/components/ui/action-alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auditPageView } from "@/lib/audit";
import { listRbacRoles } from "@/lib/rbac";
import { requirePageAccess } from "@/lib/server-guards";

const actionClassName =
  "inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default async function RbacRolesPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { user } = await requirePageAccess("rbac.manage");
  const roles = await listRbacRoles();

  await auditPageView(user.id, {
    entity: "role",
    view: "list",
    metadata: { count: roles.length },
  });

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <ActionAlert message={error} />

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">RBAC / Role</p>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">Daftar role</h1>
            <p className="text-base leading-7 text-slate-600">Setiap role memiliki kumpulan permission yang menentukan modul dan aksi yang diizinkan.</p>
          </div>
          <Link href="/settings" className={actionClassName}>
            Kembali ke pengaturan
          </Link>
        </div>
      </section>

      <Card className="border-white/70 bg-white/85 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle className="text-2xl">{roles.length} role</CardTitle>
          <CardDescription>Role superadmin selalu memiliki akses penuh dan tidak dapat diubah permission-nya.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-[760px] w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3">Kode</th>
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">Pengguna</th>
                  <th className="px-4 py-3">Permission</th>
                  <th className="px-4 py-3">Sistem</th>
                  <th className="px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {roles.map((role) => (
                  <tr key={role.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono text-xs text-slate-800">{role.code}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{role.name}</td>
                    <td className="px-4 py-3 text-slate-700">{role.userCount}</td>
                    <td className="px-4 py-3 text-slate-700">{role.permissionCount}</td>
                    <td className="px-4 py-3">
                      {role.isSystem ? (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">Ya</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/settings/rbac/roles/${role.code}/edit`}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        {role.code === "superadmin" ? "Lihat" : "Edit"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
