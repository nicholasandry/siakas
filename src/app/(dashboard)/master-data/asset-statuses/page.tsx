import Link from "next/link";
import { redirect } from "next/navigation";
import { Tags, Trash2, Save } from "lucide-react";

import { ActionAlert } from "@/components/ui/action-alert";
import { ConfirmDeleteForm } from "@/components/ui/confirm-delete-form";
import { DataTable, tableBodyClassName, tableCellClassName, tableClassName, tableHeadClassName, tableHeaderCellClassName, tableRowClassName } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { auditPageView } from "@/lib/audit";
import { listAssetStatusOptions } from "@/lib/asset-statuses";
import { getCurrentUser } from "@/lib/session";
import { createAssetStatusOptionAction, deleteAssetStatusOptionAction, updateAssetStatusOptionAction } from "./actions";

const inputClass = "h-9 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-400";

export default async function AssetStatusesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "superadmin") redirect("/forbidden?reason=permission");

  const rows = await listAssetStatusOptions();

  await auditPageView(user.id, {
    entity: "asset_status_option",
    view: "list",
    metadata: { count: rows.length },
  });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <ActionAlert message={params.error} />
      <PageHeader
        eyebrow="Master Data / Aset"
        title="Master status aset"
        description="Kelola pilihan status aset yang tersedia pada form aset."
        actions={<Link href="/master-data" className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">Kembali</Link>}
      />

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-900">
            <Tags className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-950">Tambah status aset</h2>
            <p className="text-sm text-slate-500">Kode disimpan lowercase dengan underscore dan dipakai sebagai nilai data historis.</p>
          </div>
        </div>
        <form action={createAssetStatusOptionAction} className="grid gap-3 md:grid-cols-[180px_1fr_120px_120px_auto]">
          <input className={inputClass} name="code" placeholder="kode_status" required />
          <input className={inputClass} name="label" placeholder="Label" required />
          <input className={inputClass} name="sortOrder" type="number" defaultValue={rows.length + 1} />
          <label className="flex h-9 items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="isActive" value="1" defaultChecked />
            Aktif
          </label>
          <button type="submit" className="h-9 rounded-lg bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800">Tambah</button>
        </form>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <DataTable minWidth="840px">
          <table className={tableClassName}>
            <thead className={tableHeadClassName}>
              <tr>
                <th className={tableHeaderCellClassName}>Kode</th>
                <th className={tableHeaderCellClassName}>Label</th>
                <th className={tableHeaderCellClassName}>Urutan</th>
                <th className={tableHeaderCellClassName}>Status</th>
                <th className={tableHeaderCellClassName}>Aksi</th>
              </tr>
            </thead>
            <tbody className={tableBodyClassName}>
              {rows.map((row) => (
                <tr key={row.id} className={tableRowClassName}>
                  <td className={tableCellClassName}>
                    <form id={`asset-status-${row.id}`} action={updateAssetStatusOptionAction} className="contents">
                      <input type="hidden" name="id" value={row.id} />
                      <input className={inputClass} name="code" defaultValue={row.code} required />
                    </form>
                  </td>
                  <td className={tableCellClassName}>
                    <input form={`asset-status-${row.id}`} className={`${inputClass} w-full`} name="label" defaultValue={row.label} required />
                  </td>
                  <td className={tableCellClassName}>
                    <input form={`asset-status-${row.id}`} className={`${inputClass} w-24`} name="sortOrder" type="number" defaultValue={row.sortOrder} />
                  </td>
                  <td className="px-4 py-3">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input form={`asset-status-${row.id}`} type="checkbox" name="isActive" value="1" defaultChecked={row.isActive} />
                      <StatusBadge tone={row.isActive ? "success" : "neutral"}>{row.isActive ? "Aktif" : "Nonaktif"}</StatusBadge>
                    </label>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        form={`asset-status-${row.id}`}
                        type="submit"
                        className="inline-flex items-center justify-center rounded-md border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
                        title="Simpan Perubahan"
                      >
                        <Save className="h-4 w-4" />
                      </button>
                      <ConfirmDeleteForm action={deleteAssetStatusOptionAction} confirmMessage={`Hapus status "${row.label}"? Data historis yang memakai kode ini tetap tersimpan.`}>
                        <input type="hidden" name="id" value={row.id} />
                        <button
                          type="submit"
                          className="inline-flex items-center justify-center rounded-md border border-rose-200 p-1.5 text-rose-700 hover:bg-rose-50 hover:text-rose-900 shadow-sm"
                          title="Hapus Status"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </ConfirmDeleteForm>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTable>
      </section>
    </main>
  );
}
