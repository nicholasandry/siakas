import Link from "next/link";
import { Pencil } from "lucide-react";

import { CreateRbacUserDialog } from "@/components/settings/create-rbac-user-dialog";
import { ActionAlert } from "@/components/ui/action-alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auditPageView } from "@/lib/audit";
import { listBadanHukumOptions, listRbacUsers, listRoleOptions, listUnitOptions } from "@/lib/rbac";
import { requirePageAccess } from "@/lib/server-guards";
import { createRbacUserAction } from "./actions";

const actionClassName =
  "inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function formatLastLogin(value: Date | null) {
  if (!value) return "Belum pernah";
  return value.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

export default async function RbacUsersPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { user } = await requirePageAccess("rbac.manage");
  const [users, roleOptions, unitOptions, badanHukumOptions] = await Promise.all([
    listRbacUsers(),
    listRoleOptions(),
    listUnitOptions(),
    listBadanHukumOptions(),
  ]);

  await auditPageView(user.id, {
    entity: "user",
    view: "list",
    metadata: { count: users.length },
  });

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <ActionAlert message={error} />

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">RBAC / Pengguna</p>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">Daftar pengguna</h1>
            <p className="text-base leading-7 text-slate-600">Kelola role dan scope akses setiap akun pengguna.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <CreateRbacUserDialog
              action={createRbacUserAction}
              roleOptions={roleOptions}
              unitOptions={unitOptions}
              badanHukumOptions={badanHukumOptions}
            />
            <Link href="/settings" className={actionClassName}>
              Kembali ke pengaturan
            </Link>
          </div>
        </div>
      </section>

      <Card className="border-white/70 bg-white/85 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle className="text-2xl">{users.length} pengguna</CardTitle>
          <CardDescription>Akun dari seed atau yang ditambahkan administrator.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-[980px] w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Badan hukum</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Login terakhir</th>
                  <th className="px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {users.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                    <td className="px-4 py-3 text-slate-700">{item.email}</td>
                    <td className="px-4 py-3 text-slate-700">{item.roleName}</td>
                    <td className="px-4 py-3 text-slate-700">{item.unitName ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-700">{item.badanHukumName ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${item.isActive ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}
                      >
                        {item.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{formatLastLogin(item.lastLoginAt)}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/settings/rbac/users/${item.id}/edit`}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
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
