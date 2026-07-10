import Link from "next/link";
import { Pencil } from "lucide-react";

import { CreateRbacUserDialog } from "@/components/settings/create-rbac-user-dialog";
import { ActionAlert } from "@/components/ui/action-alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DataTable,
  tableBodyClassName,
  tableCellClassName,
  tableClassName,
  tableHeadClassName,
  tableHeaderCellClassName,
  tableRowClassName,
} from "@/components/ui/data-table";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { PageHeader } from "@/components/ui/page-header";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { StatusBadge } from "@/components/ui/status-badge";
import { auditPageView } from "@/lib/audit";
import { compareText, normalizeListParams, paginateRows, searchRows, sortRows, type SortOption } from "@/lib/list-view";
import { listBadanHukumOptions, listRbacUsers, listRoleOptions, listUnitOptions } from "@/lib/rbac";
import { requirePageAccess } from "@/lib/server-guards";
import { createRbacUserAction } from "./actions";

const actionClassName =
  "inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function formatLastLogin(value: Date | null) {
  if (!value) return "Belum pernah";
  return value.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

type UserSort = "name-asc" | "email-asc" | "role-asc" | "status-asc";

const userSortOptions = [
  { value: "name-asc", label: "Nama A-Z" },
  { value: "email-asc", label: "Email A-Z" },
  { value: "role-asc", label: "Role A-Z" },
  { value: "status-asc", label: "Status A-Z" },
] as const satisfies readonly SortOption<UserSort>[];

export default async function RbacUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; q?: string; sort?: UserSort; page?: string; pageSize?: string }>;
}) {
  const params = await searchParams;
  const { error } = params;
  const { user } = await requirePageAccess("rbac.manage");
  const [users, roleOptions, unitOptions, badanHukumOptions] = await Promise.all([
    listRbacUsers(),
    listRoleOptions(),
    listUnitOptions(),
    listBadanHukumOptions(),
  ]);
  const { q, sort, page, pageSize } = normalizeListParams(
    params,
    userSortOptions.map((option) => option.value),
    "name-asc"
  );
  const filteredRows = searchRows(users, q, (item) =>
    [item.name, item.email, item.roleName, item.unitName, item.badanHukumName, item.isActive ? "aktif" : "nonaktif"].filter(Boolean).join(" ")
  );
  const sortedRows = sortRows(filteredRows, (a, b) => {
    if (sort === "email-asc") return compareText(a.email, b.email);
    if (sort === "role-asc") return compareText(a.roleName, b.roleName) || compareText(a.name, b.name);
    if (sort === "status-asc") return compareText(a.isActive ? "aktif" : "nonaktif", b.isActive ? "aktif" : "nonaktif") || compareText(a.name, b.name);
    return compareText(a.name, b.name);
  });
  const paginated = paginateRows(sortedRows, page, pageSize);

  await auditPageView(user.id, {
    entity: "user",
    view: "list",
    metadata: { count: users.length, filteredCount: filteredRows.length, q, sort },
  });

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
      <ActionAlert message={error} />

      <PageHeader
        eyebrow="RBAC / Pengguna"
        title="Daftar pengguna"
        description="Akun dan scope akses."
        actions={
          <>
            <CreateRbacUserDialog
              action={createRbacUserAction}
              roleOptions={roleOptions}
              unitOptions={unitOptions}
              badanHukumOptions={badanHukumOptions}
            />
            <Link href="/settings" className={actionClassName}>
              Kembali ke pengaturan
            </Link>
          </>
        }
      />

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="p-5">
          <CardTitle className="text-xl">{filteredRows.length} dari {users.length} pengguna</CardTitle>
          <CardDescription>Akun dari seed atau yang ditambahkan administrator.</CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <ListToolbar q={q} sort={sort} sortOptions={userSortOptions} pageSize={pageSize} searchPlaceholder="Cari nama, email, role, scope..." />
          <DataTable minWidth="980px">
            <table className={tableClassName}>
              <thead className={tableHeadClassName}>
                <tr>
                  <th className={tableHeaderCellClassName}>Nama</th>
                  <th className={tableHeaderCellClassName}>Email</th>
                  <th className={tableHeaderCellClassName}>Role</th>
                  <th className={tableHeaderCellClassName}>Unit</th>
                  <th className={tableHeaderCellClassName}>Badan hukum</th>
                  <th className={tableHeaderCellClassName}>Status</th>
                  <th className={tableHeaderCellClassName}>Login terakhir</th>
                  <th className={tableHeaderCellClassName}>Aksi</th>
                </tr>
              </thead>
              <tbody className={tableBodyClassName}>
                {paginated.rows.map((item) => (
                  <tr key={item.id} className={tableRowClassName}>
                    <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                    <td className={tableCellClassName}>{item.email}</td>
                    <td className={tableCellClassName}>{item.roleName}</td>
                    <td className={tableCellClassName}>{item.unitName ?? "-"}</td>
                    <td className={tableCellClassName}>{item.badanHukumName ?? "-"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={item.isActive ? "success" : "neutral"}>
                        {item.isActive ? "Aktif" : "Nonaktif"}
                      </StatusBadge>
                    </td>
                    <td className={tableCellClassName}>{formatLastLogin(item.lastLoginAt)}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/settings/rbac/users/${item.id}/edit`}
                        className="inline-flex items-center justify-center rounded-md border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
                        title="Edit User"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTable>
          <PaginationControls
            pathname="/settings/rbac/users"
            q={q}
            sort={sort}
            page={paginated.page}
            pageSize={paginated.pageSize}
            total={paginated.total}
            totalPages={paginated.totalPages}
            start={paginated.start}
            end={paginated.end}
          />
        </CardContent>
      </Card>
    </main>
  );
}
