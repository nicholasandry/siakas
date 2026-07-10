export const disposalReasonTypes = [
  "EXPIRED_USEFUL_LIFE",
  "DAMAGED",
  "LOST",
  "DONATED",
  "SOLD",
  "EXCHANGED",
  "GOVERNMENT_POLICY",
  "FORCED_EVENT",
] as const;

export const disposalMethods = [
  "KEEP_IN_USE",
  "WRITE_OFF",
  "SALE",
  "DONATION",
  "EXCHANGE",
  "GOVERNMENT_RELEASE",
  "LOST_WRITE_OFF",
] as const;

export const disposalStatuses = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "WAITING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "COMPLETED",
  "CANCELLED",
] as const;

export const donationRecipientKinds = ["INTERNAL_UNIT", "EXTERNAL_PARTY"] as const;

export const physicalConditions = ["GOOD", "LIGHT_DAMAGE", "MEDIUM_DAMAGE", "HEAVY_DAMAGE", "TOTAL_LOSS", "LOST"] as const;
export const buyerTypes = ["PARISHIONER", "OTHER_PARISH", "DIOCESE", "EXTERNAL_PARTY", "OTHER"] as const;
export const governmentPolicyTypes = ["ROAD_EXPANSION", "LAND_ACQUISITION", "RELOCATION", "REGULATION_ENFORCEMENT", "OTHER"] as const;
export const forcedEventTypes = ["FLOOD", "EARTHQUAKE", "FIRE", "LANDSLIDE", "RIOT", "OTHER"] as const;
export const gainLossTypes = ["GAIN", "LOSS", "BREAK_EVEN"] as const;
export const disposalDocumentTypes = [
  "physicalInspectionFileId",
  "deletionMinutesFileId",
  "parishPriestMemoFileId",
  "bishopApprovalFileId",
  "saleProofFileId",
  "saleReceiptFileId",
  "handoverDocumentFileId",
  "exchangeAgreementFileId",
  "legalDocumentFileId",
  "lossReportFileId",
  "policeReportFileId",
  "governmentDocumentFileId",
  "inspectionReportFileId",
] as const;

export const disposalLookupCategories = [
  "disposal_reason_type",
  "disposal_method",
  "physical_condition",
  "buyer_type",
  "government_policy_type",
  "forced_event_type",
  "disposal_document_type",
] as const;

export type DisposalReasonType = (typeof disposalReasonTypes)[number];
export type DonationRecipientKind = (typeof donationRecipientKinds)[number];
export type DisposalMethod = (typeof disposalMethods)[number];
export type DisposalStatus = (typeof disposalStatuses)[number];
export type PhysicalCondition = (typeof physicalConditions)[number];
export type GainLossType = (typeof gainLossTypes)[number];
export type DisposalDocumentType = (typeof disposalDocumentTypes)[number];
export type DisposalLookupCategory = (typeof disposalLookupCategories)[number];

export const activeDisposalStatuses: DisposalStatus[] = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "WAITING_APPROVAL", "APPROVED"];

export const assetFinalStatusByMethod: Record<DisposalMethod, string> = {
  KEEP_IN_USE: "expired_still_used",
  WRITE_OFF: "written_off",
  SALE: "sold",
  DONATION: "donated",
  EXCHANGE: "exchanged",
  GOVERNMENT_RELEASE: "disposed",
  LOST_WRITE_OFF: "lost",
};

export const disposalReasonLabels: Record<string, string> = {
  EXPIRED_USEFUL_LIFE: "Habis Masa Manfaat",
  DAMAGED: "Rusak / Tidak Dapat Digunakan",
  LOST: "Hilang",
  DONATED: "Hibah ke Pihak Lain",
  SOLD: "Penjualan",
  EXCHANGED: "Pertukaran Aset",
  GOVERNMENT_POLICY: "Kebijakan Pemerintah",
  FORCED_EVENT: "Penghentian Paksa / Bencana",
};

export const disposalMethodLabels: Record<string, string> = {
  KEEP_IN_USE: "Tetap Digunakan",
  WRITE_OFF: "Dihapus Tanpa Penerimaan",
  SALE: "Dijual",
  DONATION: "Dihibahkan",
  EXCHANGE: "Ditukarkan",
  GOVERNMENT_RELEASE: "Dilepas karena Kebijakan Pemerintah",
  LOST_WRITE_OFF: "Dicatat Hilang",
};

export const donationRecipientKindLabels: Record<string, string> = {
  INTERNAL_UNIT: "Unit internal",
  EXTERNAL_PARTY: "Pihak lain",
};

export const disposalStatusLabels: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Diajukan",
  UNDER_REVIEW: "Direview",
  WAITING_APPROVAL: "Menunggu Persetujuan",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

export const physicalConditionLabels: Record<string, string> = {
  GOOD: "Baik",
  LIGHT_DAMAGE: "Rusak Ringan",
  MEDIUM_DAMAGE: "Rusak Sedang",
  HEAVY_DAMAGE: "Rusak Berat",
  TOTAL_LOSS: "Total Loss",
  LOST: "Hilang",
};

export const buyerTypeLabels: Record<string, string> = {
  PARISHIONER: "Umat Paroki",
  OTHER_PARISH: "Paroki Lain",
  DIOCESE: "Keuskupan",
  EXTERNAL_PARTY: "Pihak Eksternal",
  OTHER: "Lainnya",
};

export const governmentPolicyTypeLabels: Record<string, string> = {
  ROAD_EXPANSION: "Pelebaran Jalan",
  LAND_ACQUISITION: "Pengadaan Tanah",
  RELOCATION: "Relokasi",
  REGULATION_ENFORCEMENT: "Penegakan Regulasi",
  OTHER: "Lainnya",
};

export const forcedEventTypeLabels: Record<string, string> = {
  FLOOD: "Banjir",
  EARTHQUAKE: "Gempa Bumi",
  FIRE: "Kebakaran",
  LANDSLIDE: "Tanah Longsor",
  RIOT: "Kerusuhan",
  OTHER: "Lainnya",
};

export const disposalDocumentTypeLabels: Record<string, string> = {
  physicalInspectionFileId: "Dokumen pemeriksaan fisik",
  deletionMinutesFileId: "Berita acara penghapusan",
  parishPriestMemoFileId: "Memo / otorisasi Rama Paroki",
  bishopApprovalFileId: "Izin Uskup",
  saleProofFileId: "Bukti pembayaran",
  saleReceiptFileId: "Kuitansi / bukti jual",
  handoverDocumentFileId: "Berita acara serah terima",
  exchangeAgreementFileId: "Perjanjian tukar",
  legalDocumentFileId: "Dokumen legal tanah/bangunan",
  lossReportFileId: "Dokumen kehilangan",
  policeReportFileId: "Laporan polisi",
  governmentDocumentFileId: "Dokumen pemerintah",
  inspectionReportFileId: "Berita acara pemeriksaan",
};

export const disposalLookupDefaults = {
  disposal_reason_type: disposalReasonTypes.map((code, index) => ({ code, label: disposalReasonLabels[code], sortOrder: index + 1 })),
  disposal_method: disposalMethods.map((code, index) => ({
    code,
    label: disposalMethodLabels[code],
    sortOrder: index + 1,
    metadata: { finalAssetStatus: assetFinalStatusByMethod[code] },
  })),
  physical_condition: physicalConditions.map((code, index) => ({ code, label: physicalConditionLabels[code], sortOrder: index + 1 })),
  buyer_type: buyerTypes.map((code, index) => ({ code, label: buyerTypeLabels[code], sortOrder: index + 1 })),
  government_policy_type: governmentPolicyTypes.map((code, index) => ({ code, label: governmentPolicyTypeLabels[code], sortOrder: index + 1 })),
  forced_event_type: forcedEventTypes.map((code, index) => ({ code, label: forcedEventTypeLabels[code], sortOrder: index + 1 })),
  disposal_document_type: disposalDocumentTypes.map((code, index) => ({ code, label: disposalDocumentTypeLabels[code], sortOrder: index + 1 })),
} satisfies Record<DisposalLookupCategory, Array<{ code: string; label: string; sortOrder: number; metadata?: Record<string, unknown> }>>;
