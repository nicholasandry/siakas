import { notFound } from "next/navigation";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BadanHukumForm } from "@/components/forms/badan-hukum-form";
import { ConfirmDeleteForm } from "@/components/ui/confirm-delete-form";
import { PageHeader } from "@/components/ui/page-header";
import { auditPageView } from "@/lib/audit";
import { updateBadanHukumAction, deleteBadanHukumAction } from "../../actions";
import { hasPermission } from "@/lib/authz";
import { getBadanHukum } from "@/lib/master-data";
import { assertBadanHukumInScope } from "@/lib/scope";
import { requireAuthenticatedScope } from "@/lib/server-guards";

const actionClassName =
  "inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

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
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
      <PageHeader
        eyebrow="Master Data / Badan Hukum"
        title="Edit badan hukum"
        description={badanHukum.name}
        actions={
          <Link href="/master-data/badan-hukum" className={actionClassName}>
            Kembali
          </Link>
        }
      />

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="p-5">
          <CardTitle className="text-xl">Form badan hukum</CardTitle>
          <CardDescription>{badanHukum.name}</CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0">
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
                <button type="submit" className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50">
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
