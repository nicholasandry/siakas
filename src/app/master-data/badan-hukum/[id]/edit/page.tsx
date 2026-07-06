import { notFound } from "next/navigation";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BadanHukumForm } from "@/components/forms/badan-hukum-form";
import { ConfirmDeleteForm } from "@/components/ui/confirm-delete-form";
import { auditPageView } from "@/lib/audit";
import { updateBadanHukumAction, deleteBadanHukumAction } from "../../actions";
import { hasPermission } from "@/lib/authz";
import { getBadanHukum } from "@/lib/master-data";
import { assertBadanHukumInScope } from "@/lib/scope";
import { requireAuthenticatedScope } from "@/lib/server-guards";

const actionClassName =
  "inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default async function EditBadanHukumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, scope } = await requireAuthenticatedScope("badan-hukum.update");
  const badanHukum = await getBadanHukum(id);
  const canDelete = hasPermission(user, "badan-hukum.delete");

  if (!badanHukum) {
    notFound();
  }

  assertBadanHukumInScope(scope, badanHukum.id);

  await auditPageView(user.id, {
    entity: "badan_hukum",
    entityId: badanHukum.id,
    view: "edit",
    metadata: { name: badanHukum.name, type: badanHukum.type },
  });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Master Data / Badan Hukum</p>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">Edit badan hukum</h1>
            <p className="text-base leading-7 text-slate-600">Perbarui data badan hukum dan catatan pendiriannya.</p>
          </div>
          <Link href="/master-data/badan-hukum" className={actionClassName}>
            Kembali
          </Link>
        </div>
      </section>

      <Card className="border-white/70 bg-white/85 shadow-glow backdrop-blur">
        <CardHeader>
          <CardTitle className="text-2xl">Form badan hukum</CardTitle>
          <CardDescription>{badanHukum.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <BadanHukumForm
            action={updateBadanHukumAction}
            submitLabel="Simpan perubahan"
            values={{
              id: badanHukum.id,
              name: badanHukum.name,
              type: badanHukum.type,
              field: badanHukum.field,
              legalBasis: badanHukum.legalBasis,
              kemenkumhamNumber: badanHukum.kemenkumhamNumber,
              establishedAt: badanHukum.establishedAt,
              representative: badanHukum.representative,
              status: badanHukum.status,
              notes: badanHukum.notes,
            }}
          />
          {canDelete ? (
            <div className="mt-6 border-t border-slate-200 pt-6">
              <ConfirmDeleteForm
                action={deleteBadanHukumAction}
                confirmMessage={`Hapus badan hukum "${badanHukum.name}"?`}
              >
                <input type="hidden" name="id" value={badanHukum.id} />
                <button type="submit" className="rounded-full border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50">
                  Hapus badan hukum
                </button>
              </ConfirmDeleteForm>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
