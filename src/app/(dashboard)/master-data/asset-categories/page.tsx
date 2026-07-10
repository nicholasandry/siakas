import Link from "next/link";
import { redirect } from "next/navigation";
import { Tags, Trash2, Save } from "lucide-react";

import { ActionAlert } from "@/components/ui/action-alert";
import { ConfirmDeleteForm } from "@/components/ui/confirm-delete-form";
import { DataTable, tableBodyClassName, tableCellClassName, tableClassName, tableHeadClassName, tableHeaderCellClassName, tableRowClassName } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { auditPageView } from "@/lib/audit";
import { listAssetCategoryOptions, type AssetCategoryType } from "@/lib/asset-categories";
import { getCurrentUser } from "@/lib/session";
import { createAssetCategoryOptionAction, deleteAssetCategoryOptionAction, updateAssetCategoryOptionAction } from "./actions";

const inputClass = "h-9 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-400";
const textareaClass = "min-h-20 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400";
const assetTypes = [
  ["bangunan", "Bangunan"],
  ["kendaraan", "Kendaraan"],
  ["benda", "Benda"],
] as const;

function joinLines(value: string[] | null | undefined) {
  return (value ?? []).join("\n");
}

export default async function AssetCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; assetType?: AssetCategoryType }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "superadmin") redirect("/forbidden?reason=permission");

  const selectedType = assetTypes.some(([value]) => value === params.assetType) ? params.assetType : "benda";
  const rows = await listAssetCategoryOptions(selectedType);

  await auditPageView(user.id, {
    entity: "asset_category_option",
    view: "list",
    metadata: { assetType: selectedType, count: rows.length },
  });

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
      <ActionAlert message={params.error} />
      <PageHeader
        eyebrow="Master Data / Aset"
        title="Master kategori aset"
        description="Kelola kategori aset, pairing pencarian, dan mapping kelompok depresiasi fiskal."
        actions={<Link href="/master-data" className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">Kembali</Link>}
      />

      <div className="flex flex-wrap gap-2">
        {assetTypes.map(([value, label]) => (
          <Link key={value} href={`/master-data/asset-categories?assetType=${value}`} className={`rounded-lg border px-4 py-2 text-sm font-medium ${selectedType === value ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
            {label}
          </Link>
        ))}
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-900">
            <Tags className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-950">Tambah kategori</h2>
            <p className="text-sm text-slate-500">Contoh pencarian dan jenis bangunan diisi satu item per baris.</p>
          </div>
        </div>
        <form action={createAssetCategoryOptionAction} className="grid gap-3 lg:grid-cols-4">
          <input type="hidden" name="assetType" value={selectedType} />
          <input className={inputClass} name="code" placeholder="KODE" required />
          <input className={inputClass} name="label" placeholder="Label kategori" required />
          <input className={inputClass} name="depreciationGroupCode" placeholder="kode-kelompok-fiskal" required />
          <input className={inputClass} name="depreciationGroupLabel" placeholder="Kelompok 1" />
          <input className={inputClass} name="usefulLifeYears" type="number" placeholder="Masa manfaat" required />
          <input className={inputClass} name="ratePercent" placeholder="Tarif %" required />
          <input className={inputClass} name="sortOrder" type="number" defaultValue={rows.length + 1} />
          <label className="flex h-9 items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="isActive" value="1" defaultChecked />
            Aktif
          </label>
          <textarea className={`${textareaClass} lg:col-span-2`} name="examples" placeholder="Contoh pencarian, satu per baris" />
          <textarea className={`${textareaClass} lg:col-span-2`} name="allowedTypes" placeholder="Jenis yang diizinkan, satu per baris (khusus bangunan)" />
          <button type="submit" className="h-9 rounded-lg bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800 lg:col-span-4">Tambah</button>
        </form>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <DataTable minWidth="1280px">
          <table className={tableClassName}>
            <thead className={tableHeadClassName}>
              <tr>
                <th className={tableHeaderCellClassName}>Kode</th>
                <th className={tableHeaderCellClassName}>Label</th>
                <th className={tableHeaderCellClassName}>Kelompok fiskal</th>
                <th className={tableHeaderCellClassName}>Masa/Tarif</th>
                <th className={tableHeaderCellClassName}>Pairing pencarian</th>
                <th className={tableHeaderCellClassName}>Jenis</th>
                <th className={tableHeaderCellClassName}>Status</th>
                <th className={tableHeaderCellClassName}>Aksi</th>
              </tr>
            </thead>
            <tbody className={tableBodyClassName}>
              {rows.map((row) => (
                <tr key={row.id} className={tableRowClassName}>
                  <td className={tableCellClassName}>
                    <form id={`asset-category-${row.id}`} action={updateAssetCategoryOptionAction} className="contents">
                      <input type="hidden" name="id" value={row.id} />
                      <input type="hidden" name="assetType" value={row.assetType} />
                      <input className={`${inputClass} w-28`} name="code" defaultValue={row.code} required />
                    </form>
                  </td>
                  <td className={tableCellClassName}><input form={`asset-category-${row.id}`} className={`${inputClass} w-64`} name="label" defaultValue={row.label} required /></td>
                  <td className={tableCellClassName}>
                    <div className="grid gap-2">
                      <input form={`asset-category-${row.id}`} className={`${inputClass} w-52`} name="depreciationGroupCode" defaultValue={row.depreciationGroupCode} required />
                      <input form={`asset-category-${row.id}`} className={`${inputClass} w-36`} name="depreciationGroupLabel" defaultValue={row.depreciationGroupLabel ?? ""} />
                    </div>
                  </td>
                  <td className={tableCellClassName}>
                    <div className="grid gap-2">
                      <input form={`asset-category-${row.id}`} className={`${inputClass} w-24`} name="usefulLifeYears" type="number" defaultValue={row.usefulLifeYears} />
                      <input form={`asset-category-${row.id}`} className={`${inputClass} w-24`} name="ratePercent" defaultValue={row.ratePercent} />
                      <input form={`asset-category-${row.id}`} className={`${inputClass} w-24`} name="sortOrder" type="number" defaultValue={row.sortOrder} />
                    </div>
                  </td>
                  <td className={tableCellClassName}><textarea form={`asset-category-${row.id}`} className={`${textareaClass} w-64`} name="examples" defaultValue={joinLines(row.examples)} /></td>
                  <td className={tableCellClassName}><textarea form={`asset-category-${row.id}`} className={`${textareaClass} w-56`} name="allowedTypes" defaultValue={joinLines(row.allowedTypes)} /></td>
                  <td className="px-4 py-3">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input form={`asset-category-${row.id}`} type="checkbox" name="isActive" value="1" defaultChecked={row.isActive} />
                      <StatusBadge tone={row.isActive ? "success" : "neutral"}>{row.isActive ? "Aktif" : "Nonaktif"}</StatusBadge>
                    </label>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        form={`asset-category-${row.id}`}
                        type="submit"
                        className="inline-flex items-center justify-center rounded-md border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
                        title="Simpan Perubahan"
                      >
                        <Save className="h-4 w-4" />
                      </button>
                      <ConfirmDeleteForm action={deleteAssetCategoryOptionAction} confirmMessage={`Hapus kategori "${row.label}"? Data historis yang memakai kode ini tetap tersimpan.`}>
                        <input type="hidden" name="id" value={row.id} />
                        <button
                          type="submit"
                          className="inline-flex items-center justify-center rounded-md border border-rose-200 p-1.5 text-rose-700 hover:bg-rose-50 hover:text-rose-900 shadow-sm"
                          title="Hapus Kategori"
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
