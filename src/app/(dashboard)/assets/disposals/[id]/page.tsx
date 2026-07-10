import Link from "next/link";
import { FilePenLine } from "lucide-react";

import {
  approveAssetDisposalAction,
  cancelAssetDisposalAction,
  completeAssetDisposalAction,
  rejectAssetDisposalAction,
  reviewAssetDisposalAction,
  submitAssetDisposalAction,
} from "@/app/(dashboard)/assets/disposals/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { auditPageView } from "@/lib/audit";
import { getAssetDisposalById } from "@/lib/asset-disposals";
import { disposalMethodLabels, disposalReasonLabels, disposalStatusLabels, physicalConditionLabels } from "@/lib/asset-disposals/constants";
import { describeDonationRecipient } from "@/lib/asset-disposals/donation-recipient";
import { listDisposalFormLookups } from "@/lib/asset-disposals/lookups";
import { getUnit } from "@/lib/master-data";
import { hasPermission } from "@/lib/authz";
import { assetStatusLabels, assetTypeLabels, formatDash, formatRupiahRp, labelFromMap } from "@/lib/formatters";
import { assertAssetInScope } from "@/lib/scope";
import { requireAuthenticatedScope } from "@/lib/server-guards";

function DetailGrid({ fields }: { fields: Array<[string, string | number | null | undefined]> }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {fields.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt>
          <dd className="mt-1 text-sm text-slate-900">{formatDash(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function WorkflowButton({ action, id, label }: { action: (formData: FormData) => void; id: string; label: string }) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">{label}</button>
    </form>
  );
}

const detailBookmarks = [
  ["summary", "Ringkasan"],
  ["info", "Informasi"],
  ["accounting", "Akuntansi"],
  ["typed-detail", "Detail Jenis"],
  ["history", "Riwayat"],
] as const;

export default async function AssetDisposalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, scope } = await requireAuthenticatedScope("asset.disposal.view");
  const [row, lookups] = await Promise.all([getAssetDisposalById(id), listDisposalFormLookups()]);
  if (!row) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
        <PageHeader eyebrow="Aset / Disposal" title="Disposal tidak ditemukan" />
      </main>
    );
  }
  assertAssetInScope(scope, row.asset);
  await auditPageView(user.id, { entity: "asset_disposal", entityId: id, view: "detail" });

  const d = row.disposal;
  const reasonLabels = { ...disposalReasonLabels, ...Object.fromEntries(lookups.disposalReasonTypes.map((item) => [item.code, item.label])) };
  const methodLabels = { ...disposalMethodLabels, ...Object.fromEntries(lookups.disposalMethods.map((item) => [item.code, item.label])) };
  const conditionLabels = { ...physicalConditionLabels, ...Object.fromEntries(lookups.physicalConditions.map((item) => [item.code, item.label])) };
  const buyerLabels = Object.fromEntries(lookups.buyerTypes.map((item) => [item.code, item.label]));
  const governmentPolicyLabels = Object.fromEntries(lookups.governmentPolicyTypes.map((item) => [item.code, item.label]));
  const forcedEventLabels = Object.fromEntries(lookups.forcedEventTypes.map((item) => [item.code, item.label]));
  const recipientUnit = d.recipientUnitId ? await getUnit(d.recipientUnitId) : null;
  const donationRecipientLabel =
    d.disposalMethod === "DONATION"
      ? describeDonationRecipient({
          donationRecipientKind: d.donationRecipientKind,
          recipientName: d.recipientName,
          recipientUnitName: recipientUnit?.name ?? null,
        })
      : null;
  const canEdit = d.status === "DRAFT" && hasPermission(user, "asset.disposal.edit");
  const canSubmit = d.status === "DRAFT" && hasPermission(user, "asset.disposal.submit");
  const canReview = d.status === "SUBMITTED" && hasPermission(user, "asset.disposal.review");
  const canApprove = d.status === "UNDER_REVIEW" && hasPermission(user, "asset.disposal.approve");
  const canComplete = d.status === "APPROVED" && hasPermission(user, "asset.disposal.complete");
  const canCancel = (d.status === "DRAFT" || d.status === "SUBMITTED") && hasPermission(user, "asset.disposal.cancel");
  const canReject = ["SUBMITTED", "UNDER_REVIEW", "WAITING_APPROVAL", "APPROVED"].includes(d.status) && hasPermission(user, "asset.disposal.reject");

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <PageHeader
        eyebrow="Aset / Disposal"
        title={`Disposal ${row.asset.code}`}
        description={row.asset.name}
        actions={
          <>
            {canEdit ? (
              <Link href={`/assets/disposals/${id}/edit`} className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800">
                <FilePenLine className="h-4 w-4" />
                Edit draft
              </Link>
            ) : null}
            <Link href="/assets/disposals" className="inline-flex h-10 items-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700">Daftar disposal</Link>
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        {canSubmit ? <WorkflowButton action={submitAssetDisposalAction} id={id} label="Submit" /> : null}
        {canReview ? <WorkflowButton action={reviewAssetDisposalAction} id={id} label="Review" /> : null}
        {canApprove ? <WorkflowButton action={approveAssetDisposalAction} id={id} label="Approve" /> : null}
        {canComplete ? <WorkflowButton action={completeAssetDisposalAction} id={id} label="Complete" /> : null}
        {canCancel ? <WorkflowButton action={cancelAssetDisposalAction} id={id} label="Cancel" /> : null}
        {canReject ? (
          <form action={rejectAssetDisposalAction} className="flex gap-2">
            <input type="hidden" name="id" value={id} />
            <input name="rejectionReason" className="h-9 rounded-lg border border-slate-200 px-3 text-sm" placeholder="Alasan penolakan" />
            <button type="submit" className="h-9 rounded-lg border border-rose-200 px-3 text-sm font-medium text-rose-700 hover:bg-rose-50">Reject</button>
          </form>
        ) : null}
      </div>

      <nav className="sticky top-0 z-20 rounded-lg border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
        <div className="flex flex-wrap gap-2">
          {detailBookmarks.map(([href, label]) => (
            <a key={href} href={`#${href}`} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
              {label}
            </a>
          ))}
        </div>
      </nav>

      <Card id="summary" className="scroll-mt-24 border-slate-200 bg-white shadow-sm">
        <CardHeader className="p-5"><CardTitle className="text-lg">Ringkasan aset</CardTitle></CardHeader>
        <CardContent className="p-5 pt-0">
          <DetailGrid fields={[
            ["Kode aset", row.asset.code],
            ["Nama aset", row.asset.name],
            ["Kategori", labelFromMap(row.asset.assetType, assetTypeLabels)],
            ["Organisasi pemilik", row.unitName ?? row.badanHukumName],
            ["Lokasi", row.locationName],
            ["Status aset", labelFromMap(row.asset.status, assetStatusLabels)],
          ]} />
        </CardContent>
      </Card>

      <Card id="info" className="scroll-mt-24 border-slate-200 bg-white shadow-sm">
        <CardHeader className="p-5"><CardTitle className="flex items-center gap-2 text-lg">Informasi disposal <StatusBadge>{labelFromMap(d.status, disposalStatusLabels)}</StatusBadge></CardTitle></CardHeader>
        <CardContent className="p-5 pt-0">
          <DetailGrid fields={[
            ["Tanggal pengajuan", d.requestedAt],
            ["Tanggal efektif", d.effectiveDisposalDate],
            ["Alasan", labelFromMap(d.disposalReasonType, reasonLabels)],
            ["Cara penyelesaian", labelFromMap(d.disposalMethod, methodLabels)],
            ["Masih digunakan", d.isStillUsed ? "Ya" : "Tidak"],
            ["Kondisi fisik", labelFromMap(d.physicalCondition, conditionLabels)],
            ["Catatan", d.disposalNote],
            ["Alasan penolakan", d.rejectionReason],
          ]} />
        </CardContent>
      </Card>

      <Card id="accounting" className="scroll-mt-24 border-slate-200 bg-white shadow-sm">
        <CardHeader className="p-5"><CardTitle className="text-lg">Dampak akuntansi</CardTitle></CardHeader>
        <CardContent className="p-5 pt-0">
          <DetailGrid fields={[
            ["Nilai perolehan", formatRupiahRp(d.acquisitionValue)],
            ["Akumulasi penyusutan", formatRupiahRp(d.accumulatedDepreciationValue)],
            ["Nilai buku saat disposal", formatRupiahRp(d.bookValueAtDisposal)],
            ["Harga jual neto", formatRupiahRp(d.saleNetAmount)],
            ["Kompensasi", formatRupiahRp(d.compensationAmount ?? d.governmentCompensationAmount ?? d.insuranceClaimAmount)],
            ["Selisih disposal", formatRupiahRp(d.disposalGainLossAmount)],
            ["Status selisih", d.disposalGainLossType],
            ["Status akhir aset", d.status === "COMPLETED" ? labelFromMap(row.asset.status, assetStatusLabels) : "-"],
          ]} />
        </CardContent>
      </Card>

      <Card id="typed-detail" className="scroll-mt-24 border-slate-200 bg-white shadow-sm">
        <CardHeader className="p-5"><CardTitle className="text-lg">Detail berdasarkan jenis disposal</CardTitle></CardHeader>
        <CardContent className="p-5 pt-0">
          <DetailGrid fields={[
            ["Pembeli", d.buyerName],
            ["Jenis pembeli", labelFromMap(d.buyerType, buyerLabels)],
            ["Tanggal jual", d.saleDate],
            ["Penerima hibah", donationRecipientLabel ?? d.recipientName],
            ["Tanggal hibah", d.donationDate],
            ["Pihak tukar", d.exchangePartnerName],
            ["Tanggal tukar", d.exchangeDate],
            ["Tanggal hilang", d.lostDate],
            ["Lokasi terakhir", d.lastKnownLocation],
            ["Kronologi kehilangan", d.lossChronology],
            ["Instansi pemerintah", d.governmentInstitutionName],
            ["Nomor surat pemerintah", d.governmentLetterNumber],
            ["Jenis kebijakan pemerintah", labelFromMap(d.governmentPolicyType, governmentPolicyLabels)],
            ["Jenis kejadian", labelFromMap(d.forcedEventType, forcedEventLabels)],
            ["Kronologi kejadian", d.forcedEventChronology],
          ]} />
        </CardContent>
      </Card>

      <Card id="history" className="scroll-mt-24 border-slate-200 bg-white shadow-sm">
        <CardHeader className="p-5"><CardTitle className="text-lg">Riwayat status</CardTitle></CardHeader>
        <CardContent className="p-5 pt-0">
          <DetailGrid fields={[
            ["Diajukan oleh", row.requestedByName],
            ["Direview pada", d.reviewedAt?.toLocaleString("id-ID")],
            ["Disetujui pada", d.approvedAt?.toLocaleString("id-ID")],
            ["Diselesaikan pada", d.completedAt?.toLocaleString("id-ID")],
          ]} />
        </CardContent>
      </Card>
    </main>
  );
}
