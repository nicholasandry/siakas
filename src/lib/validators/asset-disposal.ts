import { z } from "zod";

import {
  buyerTypes,
  disposalMethods,
  disposalReasonTypes,
  donationRecipientKinds,
  forcedEventTypes,
  governmentPolicyTypes,
} from "@/lib/asset-disposals/constants";
import { optionalTrimmedString, requiredTrimmedString } from "@/lib/validators/zod-utils";

const booleanish = z.preprocess((value) => value === "on" || value === "true" || value === true, z.boolean()).default(false);
const optionalMoney = optionalTrimmedString().refine((value) => !value || Number(value) >= 0, "Nilai rupiah tidak valid");

export const assetDisposalSchema = z
  .object({
    id: optionalTrimmedString(),
    assetId: requiredTrimmedString("Aset wajib dipilih"),
    requestedAt: requiredTrimmedString("Tanggal pengajuan wajib diisi"),
    effectiveDisposalDate: requiredTrimmedString("Tanggal efektif wajib diisi"),
    disposalReasonType: z.enum(disposalReasonTypes, { message: "Alasan disposal tidak valid" }),
    disposalMethod: z.enum(disposalMethods, { message: "Cara penyelesaian tidak valid" }),
    isStillUsed: booleanish,
    disposalNote: requiredTrimmedString("Catatan disposal wajib diisi").min(10, "Catatan minimal 10 karakter"),
    nextReviewDate: optionalTrimmedString(),
    evaluationNote: optionalTrimmedString(),
    saleDate: optionalTrimmedString(),
    buyerName: optionalTrimmedString(),
    buyerType: z.enum(buyerTypes).optional().or(z.literal("")),
    saleGrossAmount: optionalMoney,
    saleCostAmount: optionalMoney,
    salePaymentMethod: optionalTrimmedString(),
    saleReceivingAccountId: optionalTrimmedString(),
    recipientName: optionalTrimmedString(),
    donationRecipientKind: z.enum(donationRecipientKinds).optional().or(z.literal("")),
    recipientUnitId: optionalTrimmedString(),
    donationDate: optionalTrimmedString(),
    donationPurpose: optionalTrimmedString(),
    exchangePartnerName: optionalTrimmedString(),
    exchangeDate: optionalTrimmedString(),
    oldAssetAgreedValue: optionalMoney,
    newAssetAgreedValue: optionalMoney,
    cashPaidAmount: optionalMoney,
    cashReceivedAmount: optionalMoney,
    replacementAssetId: optionalTrimmedString(),
    lostDate: optionalTrimmedString(),
    lastKnownLocation: optionalTrimmedString(),
    lossChronology: optionalTrimmedString(),
    lastResponsiblePerson: optionalTrimmedString(),
    lossReportNumber: optionalTrimmedString(),
    hasInsuranceOrCompensation: booleanish,
    compensationAmount: optionalMoney,
    compensationReceivedDate: optionalTrimmedString(),
    compensationPayerName: optionalTrimmedString(),
    governmentPolicyType: z.enum(governmentPolicyTypes).optional().or(z.literal("")),
    governmentInstitutionName: optionalTrimmedString(),
    governmentLetterNumber: optionalTrimmedString(),
    governmentLetterDate: optionalTrimmedString(),
    affectedAssetPortion: optionalTrimmedString(),
    affectedAreaOrQuantity: optionalTrimmedString(),
    affectedValue: optionalMoney,
    hasGovernmentCompensation: booleanish,
    governmentCompensationAmount: optionalMoney,
    governmentCompensationReceivedDate: optionalTrimmedString(),
    forcedEventType: z.enum(forcedEventTypes).optional().or(z.literal("")),
    forcedEventDate: optionalTrimmedString(),
    forcedEventChronology: optionalTrimmedString(),
    damageLevel: optionalTrimmedString(),
    bishopApprovalNumber: optionalTrimmedString(),
    bishopApprovalDate: optionalTrimmedString(),
    saleProofFileId: optionalTrimmedString(),
    saleReceiptFileId: optionalTrimmedString(),
    handoverDocumentFileId: optionalTrimmedString(),
    exchangeAgreementFileId: optionalTrimmedString(),
    legalDocumentFileId: optionalTrimmedString(),
    lossReportFileId: optionalTrimmedString(),
    policeReportFileId: optionalTrimmedString(),
    governmentDocumentFileId: optionalTrimmedString(),
    inspectionReportFileId: optionalTrimmedString(),
    physicalInspectionFileId: optionalTrimmedString(),
    deletionMinutesFileId: optionalTrimmedString(),
    parishPriestMemoFileId: optionalTrimmedString(),
    bishopApprovalFileId: optionalTrimmedString(),
  })
  .superRefine((data, ctx) => {
    if (data.isStillUsed && data.disposalMethod !== "KEEP_IN_USE") {
      ctx.addIssue({ code: "custom", message: "Aset yang masih digunakan harus memakai cara Tetap Digunakan", path: ["disposalMethod"] });
    }
    if (!data.isStillUsed && data.disposalMethod === "KEEP_IN_USE") {
      ctx.addIssue({ code: "custom", message: "Pilih cara selain Tetap Digunakan jika aset tidak masih digunakan", path: ["disposalMethod"] });
    }
    if (data.disposalReasonType === "LOST" && data.disposalMethod !== "LOST_WRITE_OFF") {
      ctx.addIssue({ code: "custom", message: "Aset hilang harus dicatat dengan metode Hilang", path: ["disposalMethod"] });
    }
    if (data.disposalMethod === "SALE") {
      for (const [key, message] of [
        ["saleDate", "Tanggal penjualan wajib diisi"],
        ["buyerName", "Nama pembeli wajib diisi"],
        ["buyerType", "Jenis pembeli wajib diisi"],
        ["saleGrossAmount", "Harga jual bruto wajib diisi"],
      ] as const) {
        if (!data[key]) ctx.addIssue({ code: "custom", message, path: [key] });
      }
    }
    if (data.disposalMethod === "DONATION") {
      if (!data.donationRecipientKind) {
        ctx.addIssue({ code: "custom", message: "Jenis penerima hibah wajib dipilih", path: ["donationRecipientKind"] });
      }
      if (data.donationRecipientKind === "INTERNAL_UNIT" && !data.recipientUnitId) {
        ctx.addIssue({ code: "custom", message: "Unit penerima hibah wajib dipilih", path: ["recipientUnitId"] });
      }
      if (data.donationRecipientKind === "EXTERNAL_PARTY" && !data.recipientName?.trim()) {
        ctx.addIssue({ code: "custom", message: "Nama penerima hibah wajib diisi", path: ["recipientName"] });
      }
      if (!data.donationDate) {
        ctx.addIssue({ code: "custom", message: "Tanggal hibah wajib diisi", path: ["donationDate"] });
      }
    }
    if (data.disposalMethod === "EXCHANGE") {
      for (const [key, message] of [
        ["exchangePartnerName", "Pihak lawan tukar wajib diisi"],
        ["exchangeDate", "Tanggal pertukaran wajib diisi"],
        ["oldAssetAgreedValue", "Nilai kesepakatan aset lama wajib diisi"],
        ["newAssetAgreedValue", "Nilai kesepakatan aset baru wajib diisi"],
      ] as const) {
        if (!data[key]) ctx.addIssue({ code: "custom", message, path: [key] });
      }
    }
    if (data.disposalReasonType === "LOST") {
      for (const [key, message] of [
        ["lostDate", "Tanggal diketahui hilang wajib diisi"],
        ["lastKnownLocation", "Lokasi terakhir wajib diisi"],
        ["lossChronology", "Kronologi kehilangan wajib diisi"],
      ] as const) {
        if (!data[key]) ctx.addIssue({ code: "custom", message, path: [key] });
      }
    }
    if (data.disposalReasonType === "GOVERNMENT_POLICY") {
      for (const [key, message] of [
        ["governmentInstitutionName", "Instansi pemerintah wajib diisi"],
        ["governmentLetterNumber", "Nomor surat wajib diisi"],
        ["governmentLetterDate", "Tanggal surat wajib diisi"],
      ] as const) {
        if (!data[key]) ctx.addIssue({ code: "custom", message, path: [key] });
      }
    }
    if (data.disposalReasonType === "FORCED_EVENT") {
      for (const [key, message] of [
        ["forcedEventType", "Jenis kejadian wajib dipilih"],
        ["forcedEventDate", "Tanggal kejadian wajib diisi"],
        ["forcedEventChronology", "Kronologi kejadian wajib diisi"],
      ] as const) {
        if (!data[key]) ctx.addIssue({ code: "custom", message, path: [key] });
      }
    }
  });

export type AssetDisposalSchema = z.infer<typeof assetDisposalSchema>;
