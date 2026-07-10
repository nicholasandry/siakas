import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { assetDisposals, assetLocations, assets, auditLogs, badanHukums, taxAssetDepreciation, units, users } from "@/db/schema";
import { activeDisposalStatuses, physicalConditionLabels, type DisposalMethod, type DisposalStatus } from "@/lib/asset-disposals/constants";
import {
  assetHistoryEntityTypes,
  assetHistorySources,
  assetPlacementHistorySources,
  getDisposalStartPreviousStatus,
  recordAssetHistoryChanges,
  recordAssetPlacementChanges,
} from "@/lib/assets/histories";
import { assertCanStartAssetDisposal, normalizeAssetLoanedTo, normalizeLegacyAssetStatus } from "@/lib/assets/status";
import { syncAssetOrganizationsForInternalDonation } from "@/lib/assets";
import {
  calculateBookValue,
  calculateDisposalGainLoss,
  calculateSaleNetAmount,
  getGainLossType,
  toIntegerRupiah,
} from "@/lib/asset-disposals/calculations";
import { getAssetStatusAfterCompletion } from "@/lib/asset-disposals/status";
import {
  describeDonationRecipient,
  isInternalDonationDisposal,
} from "@/lib/asset-disposals/donation-recipient";
import { resolveDonationRecipientInput } from "@/lib/asset-disposals/donation-recipient.server";
import type { AssetDisposalSchema } from "@/lib/validators/asset-disposal";
import type { AccessScope } from "@/lib/scope";
import { buildAssetScopeCondition } from "@/lib/scope";

export type AssetDisposalInput = Omit<AssetDisposalSchema, "donationRecipientKind" | "recipientUnitId" | "recipientName"> & {
  physicalCondition: string;
  donationRecipientKind?: "EXTERNAL_PARTY" | "INTERNAL_UNIT" | "" | null;
  recipientUnitId?: string | null;
  recipientName?: string | null;
  requestedByUserId: string;
  acquisitionValue: number;
  accumulatedDepreciationValue: number;
  bookValueAtDisposal: number;
};

export async function getActiveAssetDisposal(assetId: string) {
  const rows = await db
    .select()
    .from(assetDisposals)
    .where(and(eq(assetDisposals.assetId, assetId), inArray(assetDisposals.status, activeDisposalStatuses)))
    .limit(1);

  return rows[0] ?? null;
}

export async function listActiveAssetDisposalAssetIds(assetIds: string[]) {
  if (assetIds.length === 0) return new Set<string>();

  const rows = await db
    .select({ assetId: assetDisposals.assetId })
    .from(assetDisposals)
    .where(and(inArray(assetDisposals.assetId, assetIds), inArray(assetDisposals.status, activeDisposalStatuses)));

  return new Set(rows.map((row) => row.assetId));
}

export async function listActiveAssetDisposalsByAssetIds(assetIds: string[]) {
  if (assetIds.length === 0) return new Map<string, string>();

  const rows = await db
    .select({ id: assetDisposals.id, assetId: assetDisposals.assetId })
    .from(assetDisposals)
    .where(and(inArray(assetDisposals.assetId, assetIds), inArray(assetDisposals.status, activeDisposalStatuses)));

  return new Map(rows.map((row) => [row.assetId, row.id]));
}

export async function getAssetDisposalSnapshot(assetId: string) {
  const [assetRows, depreciationRows] = await Promise.all([
    db.select().from(assets).where(eq(assets.id, assetId)).limit(1),
    db
      .select()
      .from(taxAssetDepreciation)
      .where(eq(taxAssetDepreciation.assetId, assetId))
      .orderBy(desc(taxAssetDepreciation.createdAt), desc(taxAssetDepreciation.taxYear))
      .limit(1),
  ]);
  const asset = assetRows[0];
  if (!asset) throw new Error("Aset tidak ditemukan");

  const depreciation = depreciationRows[0];
  const acquisitionValue = toIntegerRupiah(depreciation?.acquisitionValue ?? asset.acquisitionValue);
  const accumulatedDepreciationValue = toIntegerRupiah(depreciation?.accumulatedDepreciation ?? 0);

  return {
    asset,
    acquisitionValue,
    accumulatedDepreciationValue,
    bookValueAtDisposal: calculateBookValue(acquisitionValue, accumulatedDepreciationValue),
  };
}

function nullable<T>(value: T | "" | undefined | null) {
  return value === "" || value === undefined ? null : value;
}

function buildInsertPayload(input: AssetDisposalInput) {
  const saleNetAmount = input.disposalMethod === "SALE" ? calculateSaleNetAmount(input.saleGrossAmount, input.saleCostAmount) : null;
  const disposalGainLossAmount =
    input.disposalMethod === "SALE" ? calculateDisposalGainLoss(saleNetAmount, input.bookValueAtDisposal) : null;

  return {
    assetId: input.assetId,
    organizationId: null,
    disposalReasonType: input.disposalReasonType,
    disposalMethod: input.disposalMethod,
    status: "DRAFT",
    isStillUsed: input.isStillUsed,
    physicalCondition: input.physicalCondition,
    requestedByUserId: input.requestedByUserId,
    requestedAt: input.requestedAt,
    effectiveDisposalDate: input.effectiveDisposalDate,
    disposalNote: input.disposalNote,
    acquisitionValue: input.acquisitionValue,
    accumulatedDepreciationValue: input.accumulatedDepreciationValue,
    bookValueAtDisposal: input.bookValueAtDisposal,
    nextReviewDate: nullable(input.nextReviewDate),
    evaluationNote: nullable(input.evaluationNote),
    saleDate: nullable(input.saleDate),
    buyerName: nullable(input.buyerName),
    buyerType: nullable(input.buyerType),
    saleGrossAmount: input.disposalMethod === "SALE" ? toIntegerRupiah(input.saleGrossAmount) : null,
    saleCostAmount: input.disposalMethod === "SALE" ? toIntegerRupiah(input.saleCostAmount) : 0,
    saleNetAmount,
    salePaymentMethod: nullable(input.salePaymentMethod),
    saleReceivingAccountId: nullable(input.saleReceivingAccountId),
    saleProofFileId: nullable(input.saleProofFileId),
    saleReceiptFileId: nullable(input.saleReceiptFileId),
    disposalGainLossAmount,
    disposalGainLossType: disposalGainLossAmount === null ? null : getGainLossType(disposalGainLossAmount),
    recipientName: nullable(input.recipientName),
    donationRecipientKind: nullable(input.donationRecipientKind),
    recipientUnitId: nullable(input.recipientUnitId),
    donationDate: nullable(input.donationDate),
    donationPurpose: nullable(input.donationPurpose),
    handoverDocumentFileId: nullable(input.handoverDocumentFileId),
    exchangePartnerName: nullable(input.exchangePartnerName),
    exchangeDate: nullable(input.exchangeDate),
    oldAssetAgreedValue: input.disposalMethod === "EXCHANGE" ? toIntegerRupiah(input.oldAssetAgreedValue) : null,
    newAssetAgreedValue: input.disposalMethod === "EXCHANGE" ? toIntegerRupiah(input.newAssetAgreedValue) : null,
    cashPaidAmount: toIntegerRupiah(input.cashPaidAmount),
    cashReceivedAmount: toIntegerRupiah(input.cashReceivedAmount),
    replacementAssetId: nullable(input.replacementAssetId),
    exchangeAgreementFileId: nullable(input.exchangeAgreementFileId),
    legalDocumentFileId: nullable(input.legalDocumentFileId),
    lostDate: nullable(input.lostDate),
    lastKnownLocation: nullable(input.lastKnownLocation),
    lossChronology: nullable(input.lossChronology),
    lastResponsiblePerson: nullable(input.lastResponsiblePerson),
    lossReportNumber: nullable(input.lossReportNumber),
    lossReportFileId: nullable(input.lossReportFileId),
    policeReportFileId: nullable(input.policeReportFileId),
    hasInsuranceOrCompensation: input.hasInsuranceOrCompensation,
    compensationAmount: input.hasInsuranceOrCompensation ? toIntegerRupiah(input.compensationAmount) : null,
    compensationReceivedDate: nullable(input.compensationReceivedDate),
    compensationPayerName: nullable(input.compensationPayerName),
    governmentPolicyType: nullable(input.governmentPolicyType),
    governmentInstitutionName: nullable(input.governmentInstitutionName),
    governmentLetterNumber: nullable(input.governmentLetterNumber),
    governmentLetterDate: nullable(input.governmentLetterDate),
    affectedAssetPortion: nullable(input.affectedAssetPortion),
    affectedAreaOrQuantity: nullable(input.affectedAreaOrQuantity),
    affectedValue: toIntegerRupiah(input.affectedValue),
    hasGovernmentCompensation: input.hasGovernmentCompensation,
    governmentCompensationAmount: input.hasGovernmentCompensation ? toIntegerRupiah(input.governmentCompensationAmount) : null,
    governmentCompensationReceivedDate: nullable(input.governmentCompensationReceivedDate),
    governmentDocumentFileId: nullable(input.governmentDocumentFileId),
    forcedEventType: nullable(input.forcedEventType),
    forcedEventDate: nullable(input.forcedEventDate),
    forcedEventChronology: nullable(input.forcedEventChronology),
    damageLevel: nullable(input.damageLevel),
    inspectionReportFileId: nullable(input.inspectionReportFileId),
    physicalInspectionFileId: nullable(input.physicalInspectionFileId),
    deletionMinutesFileId: nullable(input.deletionMinutesFileId),
    parishPriestMemoFileId: nullable(input.parishPriestMemoFileId),
    bishopApprovalFileId: nullable(input.bishopApprovalFileId),
    bishopApprovalNumber: nullable(input.bishopApprovalNumber),
    bishopApprovalDate: nullable(input.bishopApprovalDate),
  };
}

export async function createAssetDisposal(input: AssetDisposalInput) {
  const active = await getActiveAssetDisposal(input.assetId);
  if (active) throw new Error("Aset sudah memiliki disposal aktif");

  const [assetCheck] = await db
    .select({ status: assets.status, loanedTo: assets.loanedTo, unitId: assets.unitId, ownershipLevel: assets.ownershipLevel })
    .from(assets)
    .where(eq(assets.id, input.assetId))
    .limit(1);
  if (!assetCheck) throw new Error("Aset tidak ditemukan");
  assertCanStartAssetDisposal(assetCheck.status, false);

  const donationRecipient = await resolveDonationRecipientInput(assetCheck, input);

  return db.transaction(async (tx) => {
    const payload = buildInsertPayload({ ...input, ...donationRecipient });
    const [row] = await tx.insert(assetDisposals).values(payload).returning();

    const [assetRow] = await tx.select({ status: assets.status, condition: assets.condition, loanedTo: assets.loanedTo }).from(assets).where(eq(assets.id, input.assetId)).limit(1);
    if (!assetRow) throw new Error("Aset tidak ditemukan");

    const previousStatus = assetRow.status;
    const newAssetStatus = input.disposalMethod === "KEEP_IN_USE" ? "expired_still_used" : "under_disposal";
    const nextLoanedTo = normalizeAssetLoanedTo(newAssetStatus, null);

    await tx
      .update(assets)
      .set({ status: newAssetStatus, loanedTo: nextLoanedTo, updatedAt: new Date() })
      .where(eq(assets.id, input.assetId));

    await recordAssetHistoryChanges(tx, {
      assetId: input.assetId,
      actorUserId: input.requestedByUserId,
      source: assetHistorySources.DISPOSAL_START,
      relatedEntityType: assetHistoryEntityTypes.ASSET_DISPOSAL,
      relatedEntityId: row.id,
      before: { status: previousStatus, condition: assetRow.condition, loanedTo: assetRow.loanedTo },
      after: { status: newAssetStatus, condition: assetRow.condition, loanedTo: nextLoanedTo },
      statusNotes:
        input.disposalMethod === "KEEP_IN_USE"
          ? `Disposal habis masa manfaat - tetap digunakan. Kondisi fisik saat pengajuan: ${physicalConditionLabels[input.physicalCondition] ?? input.physicalCondition}`
          : `Kondisi fisik saat pengajuan disposal: ${physicalConditionLabels[input.physicalCondition] ?? input.physicalCondition}`,
      loanNotes: assetRow.loanedTo ? "Peminjaman berakhir karena aset masuk proses disposal" : null,
    });

    return row;
  });
}

export async function updateAssetDisposal(id: string, input: AssetDisposalInput) {
  const [existing] = await db.select().from(assetDisposals).where(eq(assetDisposals.id, id)).limit(1);
  if (!existing) throw new Error("Disposal tidak ditemukan");
  if (existing.status !== "DRAFT") throw new Error("Hanya draft yang dapat diedit");

  const [assetCheck] = await db
    .select({ unitId: assets.unitId, ownershipLevel: assets.ownershipLevel })
    .from(assets)
    .where(eq(assets.id, existing.assetId))
    .limit(1);
  if (!assetCheck) throw new Error("Aset tidak ditemukan");

  const donationRecipient = await resolveDonationRecipientInput(assetCheck, input);
  const payload = buildInsertPayload({ ...input, ...donationRecipient });
  const [row] = await db.update(assetDisposals).set({ ...payload, updatedAt: new Date() }).where(eq(assetDisposals.id, id)).returning();
  return row;
}

export async function setAssetDisposalStatus(id: string, status: DisposalStatus, userId: string, rejectionReason?: string) {
  const [existing] = await db.select().from(assetDisposals).where(eq(assetDisposals.id, id)).limit(1);
  if (!existing) throw new Error("Disposal tidak ditemukan");
  const current = existing.status as DisposalStatus;
  if (status === "SUBMITTED" && current !== "DRAFT") throw new Error("Hanya draft yang dapat diajukan");
  if (status === "UNDER_REVIEW" && current !== "SUBMITTED") throw new Error("Hanya disposal yang diajukan yang dapat direview");
  if (status === "APPROVED" && current !== "UNDER_REVIEW" && current !== "WAITING_APPROVAL") throw new Error("Disposal harus direview sebelum disetujui");
  if (status === "REJECTED" && !["SUBMITTED", "UNDER_REVIEW", "WAITING_APPROVAL", "APPROVED"].includes(current)) {
    throw new Error("Status disposal ini tidak dapat ditolak");
  }
  if (status === "CANCELLED" && current !== "DRAFT" && current !== "SUBMITTED") throw new Error("Hanya draft atau pengajuan yang dapat dibatalkan");

  const update: Partial<typeof assetDisposals.$inferInsert> = { status, updatedAt: new Date() };
  if (status === "UNDER_REVIEW") {
    update.reviewedByUserId = userId;
    update.reviewedAt = new Date();
  }
  if (status === "APPROVED") {
    update.approvedByUserId = userId;
    update.approvedAt = new Date();
  }
  if (status === "REJECTED") {
    if (!rejectionReason || rejectionReason.trim().length < 5) throw new Error("Alasan penolakan wajib diisi");
    update.rejectionReason = rejectionReason.trim();
  }

  return db.transaction(async (tx) => {
    const [row] = await tx.update(assetDisposals).set(update).where(eq(assetDisposals.id, id)).returning();

    if (status === "REJECTED" || status === "CANCELLED") {
      const [assetRow] = await tx
        .select({ status: assets.status, condition: assets.condition, loanedTo: assets.loanedTo })
        .from(assets)
        .where(eq(assets.id, existing.assetId))
        .limit(1);
      if (!assetRow) throw new Error("Aset tidak ditemukan");

      const revertStatus = await getDisposalStartPreviousStatus(tx, existing.assetId, id);
      const nextLoanedTo = normalizeAssetLoanedTo(revertStatus, null);
      if (assetRow.status !== revertStatus || assetRow.loanedTo !== nextLoanedTo) {
        await tx
          .update(assets)
          .set({ status: revertStatus, loanedTo: nextLoanedTo, updatedAt: new Date() })
          .where(eq(assets.id, existing.assetId));

        await recordAssetHistoryChanges(tx, {
          assetId: existing.assetId,
          actorUserId: userId,
          source: status === "REJECTED" ? assetHistorySources.DISPOSAL_REJECT : assetHistorySources.DISPOSAL_CANCEL,
          relatedEntityType: assetHistoryEntityTypes.ASSET_DISPOSAL,
          relatedEntityId: id,
          before: { status: assetRow.status, condition: assetRow.condition, loanedTo: assetRow.loanedTo },
          after: { status: revertStatus, condition: assetRow.condition, loanedTo: nextLoanedTo },
          statusNotes: status === "REJECTED" ? rejectionReason?.trim() ?? null : "Disposal dibatalkan",
        });
      }
    }

    return row;
  });
}

export async function completeAssetDisposal(id: string, userId: string) {
  return db.transaction(async (tx) => {
    const [disposal] = await tx.select().from(assetDisposals).where(eq(assetDisposals.id, id)).limit(1);
    if (!disposal) throw new Error("Disposal tidak ditemukan");
    if (disposal.status !== "APPROVED") throw new Error("Disposal harus disetujui sebelum diselesaikan");
    if (disposal.disposalMethod === "SALE" && !disposal.saleProofFileId) throw new Error("Bukti pembayaran wajib sebelum disposal penjualan selesai");
    if (disposal.disposalMethod === "DONATION" && !disposal.handoverDocumentFileId) throw new Error("Dokumen serah terima wajib sebelum hibah selesai");
    if (disposal.disposalMethod === "EXCHANGE" && !disposal.exchangeAgreementFileId) throw new Error("Dokumen perjanjian tukar wajib sebelum pertukaran selesai");
    if (disposal.disposalReasonType === "GOVERNMENT_POLICY" && !disposal.governmentDocumentFileId) throw new Error("Dokumen pemerintah wajib sebelum disposal selesai");
    if (disposal.disposalReasonType === "FORCED_EVENT" && !disposal.inspectionReportFileId) throw new Error("Berita acara pemeriksaan wajib sebelum disposal bencana selesai");

    const [assetBefore] = await tx
      .select({
        status: assets.status,
        condition: assets.condition,
        loanedTo: assets.loanedTo,
        unitId: assets.unitId,
        locationId: assets.locationId,
        ownershipLevel: assets.ownershipLevel,
      })
      .from(assets)
      .where(eq(assets.id, disposal.assetId))
      .limit(1);

    const internalDonation = isInternalDonationDisposal(disposal);
    let newAssetStatus = getAssetStatusAfterCompletion(disposal.disposalMethod as DisposalMethod);
    let nextLoanedTo = normalizeAssetLoanedTo(newAssetStatus, null);
    let nextUnitId = assetBefore?.unitId ?? null;
    let nextLocationId = assetBefore?.locationId ?? null;
    let recipientUnitName: string | null = null;
    let donorUnitName: string | null = null;

    if (internalDonation) {
      if (!disposal.recipientUnitId) {
        throw new Error("Unit penerima hibah belum ditentukan");
      }

      const [recipientUnit] = await tx.select().from(units).where(eq(units.id, disposal.recipientUnitId)).limit(1);
      if (!recipientUnit) {
        throw new Error("Unit penerima hibah tidak ditemukan");
      }

      if (assetBefore?.unitId && disposal.recipientUnitId === assetBefore.unitId) {
        throw new Error("Unit penerima hibah harus berbeda dari unit pengelola aset saat ini");
      }

      if (assetBefore?.ownershipLevel !== "keuskupan") {
        throw new Error("Hibah internal hanya berlaku untuk aset milik unit keuskupan");
      }

      if (assetBefore?.unitId) {
        const [donorUnit] = await tx.select({ name: units.name }).from(units).where(eq(units.id, assetBefore.unitId)).limit(1);
        donorUnitName = donorUnit?.name ?? null;
      }

      recipientUnitName = recipientUnit.name;
      newAssetStatus = normalizeLegacyAssetStatus(await getDisposalStartPreviousStatus(tx, disposal.assetId, id));
      nextLoanedTo = normalizeAssetLoanedTo(newAssetStatus, null);
      nextUnitId = disposal.recipientUnitId;
      nextLocationId = null;
    }

    const [row] = await tx
      .update(assetDisposals)
      .set({ status: "COMPLETED", completedByUserId: userId, completedAt: new Date(), updatedAt: new Date() })
      .where(eq(assetDisposals.id, id))
      .returning();

    await tx
      .update(assets)
      .set({
        status: newAssetStatus,
        loanedTo: nextLoanedTo,
        unitId: nextUnitId,
        locationId: nextLocationId,
        updatedAt: new Date(),
      })
      .where(eq(assets.id, disposal.assetId));

    if (internalDonation && disposal.recipientUnitId) {
      await syncAssetOrganizationsForInternalDonation(tx, disposal.assetId, disposal.recipientUnitId);
      await recordAssetPlacementChanges(tx, {
        assetId: disposal.assetId,
        actorUserId: userId,
        source: assetPlacementHistorySources.DONATION_INTERNAL,
        relatedEntityType: assetHistoryEntityTypes.ASSET_DISPOSAL,
        relatedEntityId: id,
        before: {
          unitId: assetBefore?.unitId ?? null,
          locationId: assetBefore?.locationId ?? null,
        },
        after: {
          unitId: nextUnitId,
          locationId: nextLocationId,
        },
        notes: recipientUnitName
          ? `Hibah internal ke ${recipientUnitName}.`
          : `Hibah internal ke unit penerima.`,
      });
    }

    if (assetBefore) {
      const donationRecipientLabel = describeDonationRecipient({
        donationRecipientKind: disposal.donationRecipientKind,
        recipientName: disposal.recipientName,
        recipientUnitName,
      });
      const statusNotes = internalDonation
        ? [
            `Hibah ke unit internal: ${recipientUnitName ?? disposal.recipientName ?? "-"}.`,
            donorUnitName ? `Kepemilikan dialihkan dari ${donorUnitName} ke ${recipientUnitName}.` : `Kepemilikan dialihkan ke ${recipientUnitName}.`,
            `Status dikembalikan ke kondisi sebelum proses disposal.`,
            `Kondisi fisik saat penyelesaian: ${physicalConditionLabels[disposal.physicalCondition] ?? disposal.physicalCondition}.`,
          ].join(" ")
        : `Kondisi fisik saat penyelesaian disposal: ${physicalConditionLabels[disposal.physicalCondition] ?? disposal.physicalCondition}. Penerima: ${donationRecipientLabel}.`;

      await recordAssetHistoryChanges(tx, {
        assetId: disposal.assetId,
        actorUserId: userId,
        source: assetHistorySources.DISPOSAL_COMPLETE,
        relatedEntityType: assetHistoryEntityTypes.ASSET_DISPOSAL,
        relatedEntityId: id,
        before: { status: assetBefore.status, condition: assetBefore.condition, loanedTo: assetBefore.loanedTo },
        after: { status: newAssetStatus, condition: assetBefore.condition, loanedTo: nextLoanedTo },
        statusNotes,
      });
    }

    await tx.insert(auditLogs).values({
      actorUserId: userId,
      action: internalDonation ? "ASSET_OWNERSHIP_TRANSFERRED_BY_DONATION" : "ASSET_STATUS_CHANGED_BY_DISPOSAL",
      entity: "asset",
      entityId: disposal.assetId,
      beforeData: JSON.stringify({
        status: assetBefore?.status,
        unitId: assetBefore?.unitId,
        unitName: donorUnitName,
        locationId: assetBefore?.locationId,
      }),
      afterData: JSON.stringify({
        status: newAssetStatus,
        unitId: nextUnitId,
        unitName: internalDonation ? recipientUnitName : null,
        locationId: nextLocationId,
        disposalId: id,
        donationRecipient: describeDonationRecipient({
          donationRecipientKind: disposal.donationRecipientKind,
          recipientName: disposal.recipientName,
          recipientUnitName,
        }),
      }),
    });

    return row;
  });
}

export async function listAssetDisposals(scope?: AccessScope) {
  const scopeCondition = scope ? buildAssetScopeCondition(scope) : undefined;
  const query = db
    .select({
      disposal: assetDisposals,
      assetCode: assets.code,
      assetName: assets.name,
      assetType: assets.assetType,
      assetStatus: assets.status,
      unitName: units.name,
      badanHukumName: badanHukums.name,
      requestedByName: users.name,
    })
    .from(assetDisposals)
    .innerJoin(assets, eq(assetDisposals.assetId, assets.id))
    .leftJoin(units, eq(assets.unitId, units.id))
    .leftJoin(badanHukums, eq(assets.badanHukumId, badanHukums.id))
    .leftJoin(users, eq(assetDisposals.requestedByUserId, users.id))
    .orderBy(desc(assetDisposals.createdAt));

  return scopeCondition ? query.where(scopeCondition) : query;
}

export async function getAssetDisposalById(id: string) {
  const rows = await db
    .select({
      disposal: assetDisposals,
      asset: assets,
      locationName: assetLocations.name,
      unitName: units.name,
      badanHukumName: badanHukums.name,
      requestedByName: users.name,
    })
    .from(assetDisposals)
    .innerJoin(assets, eq(assetDisposals.assetId, assets.id))
    .leftJoin(assetLocations, eq(assets.locationId, assetLocations.id))
    .leftJoin(units, eq(assets.unitId, units.id))
    .leftJoin(badanHukums, eq(assets.badanHukumId, badanHukums.id))
    .leftJoin(users, eq(assetDisposals.requestedByUserId, users.id))
    .where(eq(assetDisposals.id, id))
    .limit(1);

  return rows[0] ?? null;
}

export async function getAssetDisposalsByAssetId(assetId: string) {
  return db.select().from(assetDisposals).where(eq(assetDisposals.assetId, assetId)).orderBy(desc(assetDisposals.createdAt));
}
