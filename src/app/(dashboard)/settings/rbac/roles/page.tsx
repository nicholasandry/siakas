import Link from "next/link";
import { Pencil, Eye } from "lucide-react";

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
import { compareNumber, compareText, normalizeListParams, paginateRows, searchRows, sortRows, type SortOption } from "@/lib/list-view";
import { listRbacRoles } from "@/lib/rbac";
import { requirePageAccess } from "@/lib/server-guards";

const actionClassName =
  "inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type RoleSort = "code-asc" | "name-asc" | "users-desc" | "permissions-desc";

const roleSortOptions = [
  { value: "code-asc", label: "Kode A-Z" },
  { value: "name-asc", label: "Nama A-Z" },
  { value: "users-desc", label: "Pengguna terbanyak" },
  { value: "permissions-desc", label: "Permission terbanyak" },
] as const satisfies readonly SortOption<RoleSort>[];

export default async function RbacRolesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; q?: string; sort?: RoleSort; page?: string; pageSize?: string }>;
}) {
  const params = await searchParams;
  const { error } = params;
  const { user } = await requirePageAccess("rbac.manage");
  const roles = await listRbacRoles();
  const { q, sort, page, pageSize } = normalizeListParams(
    params,
    roleSortOptions.map((option) => option.value),
    "code-asc"
  );
  const filteredRows = searchRows(roles, q, (role) => [role.code, role.name, role.isSystem ? "sistem" : ""].join(" "));
  const sortedRows = sortRows(filteredRows, (a, b) => {
    if (sort === "name-asc") return compareText(a.name, b.name);
    if (sort === "users-desc") return compareNumber(b.userCount, a.userCount) || compareText(a.name, b.name);
    if (sort === "permissions-desc") return compareNumber(b.permissionCount, a.permissionCount) || compareText(a.name, b.name);
    return compareText(a.code, b.code);
  });
  const paginated = paginateRows(sortedRows, page, pageSize);

  await auditPageView(user.id, {
    entity: "role",
    view: "list",
    metadata: { count: roles.length, filteredCount: filteredRows.length, q, sort },
  });

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
      <ActionAlert message={error} />

      <PageHeader
        eyebrow="RBAC / Role"
        title="Daftar role"
        description="Setiap role memiliki kumpulan permission yang menentukan modul dan aksi yang diizinkan."
        actions={
          <Link href="/settings" className={actionClassName}>
            Kembali ke pengaturan
          </Link>
        }
      />

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="p-5">
          <CardTitle className="text-xl">{filteredRows.length} dari {roles.length} role</CardTitle>
          <CardDescription>Role superadmin selalu memiliki akses penuh dan tidak dapat diubah permission-nya.</CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <ListToolbar q={q} sort={sort} sortOptions={roleSortOptions} pageSize={pageSize} searchPlaceholder="Cari kode atau nama role..." />
          <DataTable minWidth="760px">
            <table className={tableClassName}>
              <thead className={tableHeadClassName}>
                <tr>
                  <th className={tableHeaderCellClassName}>Kode</th>
                  <th className={tableHeaderCellClassName}>Nama</th>
                  <th className={tableHeaderCellClassName}>Pengguna</th>
                  <th className={tableHeaderCellClassName}>Permission</th>
                  <th className={tableHeaderCellClassName}>Sistem</th>
                  <th className={tableHeaderCellClassName}>Aksi</th>
                </tr>
              </thead>
              <tbody className={tableBodyClassName}>
                {paginated.rows.map((role) => (
                  <tr key={role.id} className={tableRowClassName}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-800">{role.code}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{role.name}</td>
                    <td className={tableCellClassName}>{role.userCount}</td>
                    <td className={tableCellClassName}>{role.permissionCount}</td>
                    <td className="px-4 py-3">{role.isSystem ? <StatusBadge>Ya</StatusBadge> : "-"}</td>
                    <td className="px-4 py-3">
                      {role.code === "superadmin" ? (
                        <Link
                          href={`/settings/rbac/roles/${role.code}/edit`}
                          className="inline-flex items-center justify-center rounded-md border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
                          title="Lihat Permission Role"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      ) : (
                        <Link
                          href={`/settings/rbac/roles/${role.code}/edit`}
                          className="inline-flex items-center justify-center rounded-md border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
                          title="Edit Role"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTable>
          <PaginationControls
            pathname="/settings/rbac/roles"
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
