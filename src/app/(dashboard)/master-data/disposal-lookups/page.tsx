import Link from "next/link";
import { redirect } from "next/navigation";
import { SlidersHorizontal, Trash2, Save } from "lucide-react";

import { ActionAlert } from "@/components/ui/action-alert";
import { ConfirmDeleteForm } from "@/components/ui/confirm-delete-form";
import { DataTable, tableBodyClassName, tableCellClassName, tableClassName, tableHeadClassName, tableHeaderCellClassName, tableRowClassName } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { auditPageView } from "@/lib/audit";
import { disposalLookupCategories, disposalMethodLabels, type DisposalLookupCategory } from "@/lib/asset-disposals/constants";
import { getAllowedDisposalMethods, isDisposalLookupCategory, listDisposalLookupOptions } from "@/lib/asset-disposals/lookups";
import { labelFromMap } from "@/lib/formatters";
import { getCurrentUser } from "@/lib/session";
import { createDisposalLookupOptionAction, deleteDisposalLookupOptionAction, updateDisposalLookupOptionAction } from "./actions";

const categoryLabels: Record<DisposalLookupCategory, string> = {
  disposal_reason_type: "Alasan Disposal",
  disposal_method: "Metode Disposal",
  physical_condition: "Kondisi Fisik",
  buyer_type: "Jenis Pembeli",
  government_policy_type: "Jenis Kebijakan Pemerintah",
  forced_event_type: "Jenis Kejadian Paksa",
  disposal_document_type: "Jenis Lampiran",
};

const inputClass = "h-9 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-400";

export default async function DisposalLookupsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; category?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "superadmin") redirect("/forbidden?reason=permission");

  const selectedCategory = isDisposalLookupCategory(params.category ?? "") ? (params.category as DisposalLookupCategory) : "disposal_reason_type";
  const [rows, disposalMethods] = await Promise.all([
    listDisposalLookupOptions(selectedCategory),
    listDisposalLookupOptions("disposal_method"),
  ]);

  await auditPageView(user.id, {
    entity: "asset_disposal_lookup_option",
    view: "list",
    metadata: { category: selectedCategory, count: rows.length },
  });

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
      <ActionAlert message={params.error} />
      <PageHeader
        eyebrow="Master Data / Disposal"
        title="Master lookup disposal"
        description="Kelola pilihan form disposal aset."
        actions={<Link href="/master-data" className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">Kembali</Link>}
      />

      <nav className="flex flex-wrap gap-2">
        {disposalLookupCategories.map((category) => (
          <Link
            key={category}
            href={`/master-data/disposal-lookups?category=${category}`}
            className={`inline-flex h-9 items-center rounded-lg border px-3 text-xs font-medium ${
              category === selectedCategory ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {categoryLabels[category]}
          </Link>
        ))}
      </nav>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-900">
            <SlidersHorizontal className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-950">Tambah {categoryLabels[selectedCategory]}</h2>
            <p className="text-sm text-slate-500">
              {selectedCategory === "disposal_document_type"
                ? "Kode jenis lampiran memakai nama field dokumen internal dan dipakai saat upload."
                : "Kode disimpan uppercase dan dipakai sebagai nilai data historis."}
            </p>
          </div>
        </div>
        <form action={createDisposalLookupOptionAction} className="grid gap-3 md:grid-cols-[160px_1fr_120px_120px_auto]">
          <input type="hidden" name="category" value={selectedCategory} />
          <input className={inputClass} name="code" placeholder="KODE" required />
          <input className={inputClass} name="label" placeholder="Label" required />
          <input className={inputClass} name="sortOrder" type="number" defaultValue={rows.length + 1} />
          <label className="flex h-9 items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="isActive" value="1" defaultChecked />
            Aktif
          </label>
          <button type="submit" className="h-9 rounded-lg bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800">Tambah</button>
          {selectedCategory === "disposal_reason_type" ? (
            <div className="md:col-span-full">
              <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Cara penyelesaian yang diizinkan</p>
              <div className="flex flex-wrap gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                {disposalMethods.map((method) => (
                  <label key={method.code} className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" name="allowedDisposalMethods" value={method.code} />
                    {method.label || labelFromMap(method.code, disposalMethodLabels)}
                  </label>
                ))}
              </div>
            </div>
          ) : null}
        </form>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <DataTable minWidth="920px">
          <table className={tableClassName}>
            <thead className={tableHeadClassName}>
              <tr>
                <th className={tableHeaderCellClassName}>Kode</th>
                <th className={tableHeaderCellClassName}>Label</th>
                <th className={tableHeaderCellClassName}>Urutan</th>
                <th className={tableHeaderCellClassName}>Status</th>
                {selectedCategory === "disposal_reason_type" ? <th className={tableHeaderCellClassName}>Cara Penyelesaian</th> : null}
                <th className={tableHeaderCellClassName}>Aksi</th>
              </tr>
            </thead>
            <tbody className={tableBodyClassName}>
              {rows.map((row) => {
                const allowedMethods = getAllowedDisposalMethods(row);

                return (
                <tr key={row.id} className={tableRowClassName}>
                  <td className={tableCellClassName}>
                    <form id={`lookup-${row.id}`} action={updateDisposalLookupOptionAction} className="contents">
                      <input type="hidden" name="id" value={row.id} />
                      <input type="hidden" name="category" value={selectedCategory} />
                      <input className={inputClass} name="code" defaultValue={row.code} required />
                    </form>
                  </td>
                  <td className={tableCellClassName}>
                    <input form={`lookup-${row.id}`} className={`${inputClass} w-full`} name="label" defaultValue={row.label} required />
                  </td>
                  <td className={tableCellClassName}>
                    <input form={`lookup-${row.id}`} className={`${inputClass} w-24`} name="sortOrder" type="number" defaultValue={row.sortOrder} />
                  </td>
                  <td className="px-4 py-3">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input form={`lookup-${row.id}`} type="checkbox" name="isActive" value="1" defaultChecked={row.isActive} />
                      <StatusBadge tone={row.isActive ? "success" : "neutral"}>{row.isActive ? "Aktif" : "Nonaktif"}</StatusBadge>
                    </label>
                  </td>
                  {selectedCategory === "disposal_reason_type" ? (
                    <td className="px-4 py-3">
                      <div className="grid gap-2">
                        {disposalMethods.map((method) => (
                          <label key={method.code} className="flex items-center gap-2 text-sm text-slate-700">
                            <input
                              form={`lookup-${row.id}`}
                              type="checkbox"
                              name="allowedDisposalMethods"
                              value={method.code}
                              defaultChecked={allowedMethods.includes(method.code)}
                            />
                            {method.label || labelFromMap(method.code, disposalMethodLabels)}
                          </label>
                        ))}
                      </div>
                    </td>
                  ) : null}
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        form={`lookup-${row.id}`}
                        type="submit"
                        className="inline-flex items-center justify-center rounded-md border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
                        title="Simpan Perubahan"
                      >
                        <Save className="h-4 w-4" />
                      </button>
                      <ConfirmDeleteForm action={deleteDisposalLookupOptionAction} confirmMessage={`Hapus opsi "${row.label}"? Data historis yang memakai kode ini tetap tersimpan.`}>
                        <input type="hidden" name="id" value={row.id} />
                        <button
                          type="submit"
                          className="inline-flex items-center justify-center rounded-md border border-rose-200 p-1.5 text-rose-700 hover:bg-rose-50 hover:text-rose-900 shadow-sm"
                          title="Hapus Opsi"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </ConfirmDeleteForm>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </DataTable>
      </section>
    </main>
  );
}
