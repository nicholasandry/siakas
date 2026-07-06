import Link from "next/link";

import { ActionAlert } from "@/components/ui/action-alert";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auditPageView } from "@/lib/audit";
import { listAssets } from "@/lib/assets";
import { hasPermission } from "@/lib/authz";
import { requireAuthenticatedScope } from "@/lib/server-guards";

const actionClassName =
  "inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const assetTypeLinks = [
  { type: "tanah", label: "Tanah" },
  { type: "bangunan", label: "Bangunan" },
  { type: "kendaraan", label: "Kendaraan" },
  { type: "benda", label: "Benda" },
] as const;

export default async function AssetsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { user, scope } = await requireAuthenticatedScope("asset.read");
  const assets = await listAssets(scope);
  const canCreate = hasPermission(user, "asset.create");
  const canUpdate = hasPermission(user, "asset.update");

  await auditPageView(user.id, {
    entity: "asset",
    view: "list",
    metadata: { count: assets.length },
  });

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <ActionAlert message={error} />

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Assets</p>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">Registrasi aset</h1>
            <p className="text-base leading-7 text-slate-600">Kelola daftar aset, detail legalitas, dan depresiasi fiskal.</p>
          </div>
          <Link href="/dashboard" className={actionClassName}>
            Kembali ke dashboard
          </Link>
        </div>
      </section>

      {canCreate ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {assetTypeLinks.map((item) => (
            <Card key={item.type} className="border-slate-200/80 bg-white/80 shadow-sm backdrop-blur">
              <CardHeader>
                <CardTitle className="text-xl">Tambah {item.label}</CardTitle>
                <CardDescription>Buka form khusus untuk jenis aset ini.</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href={`/assets/new?type=${item.type}`} className="inline-flex rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Buat baru
                </Link>
              </CardContent>
            </Card>
          ))}
        </section>
      ) : null}

      <Card className="border-slate-200/80 bg-white/80 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle className="text-2xl">Daftar aset</CardTitle>
          <CardDescription>{assets.length} aset terdata.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveTable>
            <table className="min-w-[880px] w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3">Kode</th>
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">Jenis</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Badan hukum</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {assets.map((asset) => (
                  <tr key={asset.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{asset.code}</td>
                    <td className="px-4 py-3 text-slate-700">{asset.name}</td>
                    <td className="px-4 py-3 text-slate-700">{asset.assetType}</td>
                    <td className="px-4 py-3 text-slate-700">{asset.unitName ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-700">{asset.badanHukumName ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-700">{asset.status}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/assets/${asset.id}`}
                          className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Detail
                        </Link>
                        {canUpdate ? (
                          <Link href={`/assets/${asset.id}/edit`} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                            Edit
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ResponsiveTable>
        </CardContent>
      </Card>
    </main>
  );
}
