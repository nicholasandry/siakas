import {
  boolean,
  bigint,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  foreignKey,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const roles = pgTable(
  "roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 64 }).notNull().unique(),
    name: varchar("name", { length: 120 }).notNull(),
    description: text("description"),
    isSystem: boolean("is_system").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("roles_code_idx").on(table.code),
  ]
);

export const permissions = pgTable(
  "permissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 96 }).notNull().unique(),
    resource: varchar("resource", { length: 64 }).notNull(),
    action: varchar("action", { length: 64 }).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("permissions_code_idx").on(table.code),
  ]
);

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
    granted: boolean("granted").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.roleId, table.permissionId] }),
  ]
);

export const units = pgTable(
  "units",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 64 }).notNull().unique(),
    name: varchar("name", { length: 160 }).notNull(),
    kind: varchar("kind", { length: 32 }).notNull(),
    category: varchar("category", { length: 64 }),
    parentId: uuid("parent_id"),
    legalParentType: varchar("legal_parent_type", { length: 64 }),
    legalParentUnitId: uuid("legal_parent_unit_id"),
    legalParentBadanHukumId: uuid("legal_parent_badan_hukum_id"),
    legalParentLabel: varchar("legal_parent_label", { length: 191 }),
    address: text("address"),
    responsiblePerson: varchar("responsible_person", { length: 160 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("units_code_idx").on(table.code),
    foreignKey({ columns: [table.parentId], foreignColumns: [table.id], name: "units_parent_id_fk" }).onDelete("set null"),
    foreignKey({
      columns: [table.legalParentUnitId],
      foreignColumns: [table.id],
      name: "units_legal_parent_unit_id_fk",
    }).onDelete("set null"),
  ]
);

export const badanHukums = pgTable(
  "badan_hukums",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    type: varchar("type", { length: 32 }).notNull(),
    field: varchar("field", { length: 32 }).notNull(),
    legalBasis: text("legal_basis"),
    kemenkumhamNumber: varchar("kemenkumham_number", { length: 100 }),
    establishedAt: date("established_at"),
    representative: varchar("representative", { length: 160 }),
    status: varchar("status", { length: 64 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("badan_hukums_name_idx").on(table.name),
  ]
);

export const assetLocations = pgTable(
  "asset_locations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    unitId: uuid("unit_id")
      .notNull()
      .references(() => units.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    code: varchar("code", { length: 64 }),
    locationKind: varchar("location_kind", { length: 32 }).notNull().default("ruang"),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("asset_locations_unit_name_idx").on(table.unitId, table.name),
    index("asset_locations_unit_idx").on(table.unitId),
  ]
);

export const assetDisposalLookupOptions = pgTable(
  "asset_disposal_lookup_options",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    category: varchar("category", { length: 64 }).notNull(),
    code: varchar("code", { length: 64 }).notNull(),
    label: varchar("label", { length: 160 }).notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    isSystem: boolean("is_system").notNull().default(false),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("asset_disposal_lookup_options_category_code_idx").on(table.category, table.code),
    index("asset_disposal_lookup_options_category_idx").on(table.category),
  ]
);

export const assetStatusOptions = pgTable(
  "asset_status_options",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 64 }).notNull(),
    label: varchar("label", { length: 160 }).notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    isSystem: boolean("is_system").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("asset_status_options_code_idx").on(table.code),
    index("asset_status_options_active_idx").on(table.isActive),
  ]
);

export const assetCategoryOptions = pgTable(
  "asset_category_options",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assetType: varchar("asset_type", { length: 32 }).notNull(),
    code: varchar("code", { length: 64 }).notNull(),
    label: varchar("label", { length: 191 }).notNull(),
    depreciationGroupCode: varchar("depreciation_group_code", { length: 64 }).notNull(),
    depreciationGroupLabel: varchar("depreciation_group_label", { length: 64 }),
    usefulLifeYears: integer("useful_life_years").notNull(),
    ratePercent: numeric("rate_percent", { precision: 6, scale: 2 }).notNull().default("0"),
    examples: jsonb("examples").$type<string[]>(),
    allowedTypes: jsonb("allowed_types").$type<string[]>(),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    isSystem: boolean("is_system").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("asset_category_options_type_code_idx").on(table.assetType, table.code),
    index("asset_category_options_type_idx").on(table.assetType),
  ]
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    email: varchar("email", { length: 191 }).notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "restrict" }),
    unitId: uuid("unit_id").references(() => units.id, { onDelete: "set null" }),
    badanHukumId: uuid("badan_hukum_id").references(() => badanHukums.id, { onDelete: "set null" }),
    isActive: boolean("is_active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("users_email_idx").on(table.email),
  ]
);

export const assets = pgTable(
  "assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 64 }).notNull().unique(),
    name: varchar("name", { length: 191 }).notNull(),
    assetType: varchar("asset_type", { length: 32 }).notNull(),
    ownershipLevel: varchar("ownership_level", { length: 32 }).notNull(),
    unitId: uuid("unit_id").references(() => units.id, { onDelete: "set null" }),
    badanHukumId: uuid("badan_hukum_id").references(() => badanHukums.id, { onDelete: "set null" }),
    locationId: uuid("location_id").references(() => assetLocations.id, { onDelete: "set null" }),
    acquisitionDate: date("acquisition_date"),
    acquisitionValue: numeric("acquisition_value", { precision: 18, scale: 2 }),
    legalStatus: varchar("legal_status", { length: 64 }),
    ownerName: varchar("owner_name", { length: 191 }),
    condition: varchar("condition", { length: 64 }),
    status: varchar("status", { length: 32 }).notNull().default("active"),
    loanedTo: varchar("loaned_to", { length: 191 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("assets_code_idx").on(table.code),
  ]
);

export const assetAttachments = pgTable(
  "asset_attachments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    attachmentType: varchar("attachment_type", { length: 32 }).notNull(),
    filePath: text("file_path").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("asset_attachments_asset_idx").on(table.assetId, table.filePath),
  ]
);

export const assetDisposals = pgTable(
  "asset_disposals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "restrict" }),
    organizationId: uuid("organization_id").references(() => units.id, { onDelete: "set null" }),
    disposalReasonType: varchar("disposal_reason_type", { length: 64 }).notNull(),
    disposalMethod: varchar("disposal_method", { length: 64 }).notNull(),
    status: varchar("status", { length: 32 }).notNull().default("DRAFT"),
    isStillUsed: boolean("is_still_used").notNull().default(false),
    physicalCondition: varchar("physical_condition", { length: 64 }).notNull(),
    requestedByUserId: uuid("requested_by_user_id").references(() => users.id, { onDelete: "set null" }),
    reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id, { onDelete: "set null" }),
    approvedByUserId: uuid("approved_by_user_id").references(() => users.id, { onDelete: "set null" }),
    completedByUserId: uuid("completed_by_user_id").references(() => users.id, { onDelete: "set null" }),
    requestedAt: date("requested_at").notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    effectiveDisposalDate: date("effective_disposal_date").notNull(),
    disposalNote: text("disposal_note").notNull(),
    rejectionReason: text("rejection_reason"),
    acquisitionValue: bigint("acquisition_value", { mode: "number" }).notNull().default(0),
    accumulatedDepreciationValue: bigint("accumulated_depreciation_value", { mode: "number" }).notNull().default(0),
    bookValueAtDisposal: bigint("book_value_at_disposal", { mode: "number" }).notNull().default(0),
    nextReviewDate: date("next_review_date"),
    evaluationNote: text("evaluation_note"),
    saleDate: date("sale_date"),
    buyerName: varchar("buyer_name", { length: 191 }),
    buyerType: varchar("buyer_type", { length: 64 }),
    saleGrossAmount: bigint("sale_gross_amount", { mode: "number" }),
    saleCostAmount: bigint("sale_cost_amount", { mode: "number" }).notNull().default(0),
    saleNetAmount: bigint("sale_net_amount", { mode: "number" }),
    salePaymentMethod: varchar("sale_payment_method", { length: 64 }),
    saleReceivingAccountId: varchar("sale_receiving_account_id", { length: 128 }),
    saleProofFileId: text("sale_proof_file_id"),
    saleReceiptFileId: text("sale_receipt_file_id"),
    disposalGainLossAmount: bigint("disposal_gain_loss_amount", { mode: "number" }),
    disposalGainLossType: varchar("disposal_gain_loss_type", { length: 32 }),
    recipientName: varchar("recipient_name", { length: 191 }),
    donationRecipientKind: varchar("donation_recipient_kind", { length: 32 }),
    recipientUnitId: uuid("recipient_unit_id").references(() => units.id, { onDelete: "set null" }),
    donationDate: date("donation_date"),
    donationPurpose: text("donation_purpose"),
    handoverDocumentFileId: text("handover_document_file_id"),
    exchangePartnerName: varchar("exchange_partner_name", { length: 191 }),
    exchangeDate: date("exchange_date"),
    oldAssetAgreedValue: bigint("old_asset_agreed_value", { mode: "number" }),
    newAssetAgreedValue: bigint("new_asset_agreed_value", { mode: "number" }),
    cashPaidAmount: bigint("cash_paid_amount", { mode: "number" }).notNull().default(0),
    cashReceivedAmount: bigint("cash_received_amount", { mode: "number" }).notNull().default(0),
    replacementAssetId: uuid("replacement_asset_id").references(() => assets.id, { onDelete: "set null" }),
    exchangeAgreementFileId: text("exchange_agreement_file_id"),
    legalDocumentFileId: text("legal_document_file_id"),
    lostDate: date("lost_date"),
    lastKnownLocation: text("last_known_location"),
    lossChronology: text("loss_chronology"),
    lastResponsiblePerson: varchar("last_responsible_person", { length: 191 }),
    lossReportNumber: varchar("loss_report_number", { length: 100 }),
    lossReportFileId: text("loss_report_file_id"),
    policeReportFileId: text("police_report_file_id"),
    hasInsuranceOrCompensation: boolean("has_insurance_or_compensation").notNull().default(false),
    compensationAmount: bigint("compensation_amount", { mode: "number" }),
    compensationReceivedDate: date("compensation_received_date"),
    compensationPayerName: varchar("compensation_payer_name", { length: 191 }),
    governmentPolicyType: varchar("government_policy_type", { length: 64 }),
    governmentInstitutionName: varchar("government_institution_name", { length: 191 }),
    governmentLetterNumber: varchar("government_letter_number", { length: 100 }),
    governmentLetterDate: date("government_letter_date"),
    affectedAssetPortion: varchar("affected_asset_portion", { length: 32 }),
    affectedAreaOrQuantity: text("affected_area_or_quantity"),
    affectedValue: bigint("affected_value", { mode: "number" }),
    hasGovernmentCompensation: boolean("has_government_compensation").notNull().default(false),
    governmentCompensationAmount: bigint("government_compensation_amount", { mode: "number" }),
    governmentCompensationReceivedDate: date("government_compensation_received_date"),
    governmentDocumentFileId: text("government_document_file_id"),
    forcedEventType: varchar("forced_event_type", { length: 64 }),
    forcedEventDate: date("forced_event_date"),
    forcedEventChronology: text("forced_event_chronology"),
    damageLevel: varchar("damage_level", { length: 64 }),
    photoDocumentationFileIds: jsonb("photo_documentation_file_ids").$type<string[]>(),
    inspectionReportFileId: text("inspection_report_file_id"),
    hasInsuranceClaim: boolean("has_insurance_claim").notNull().default(false),
    insuranceClaimAmount: bigint("insurance_claim_amount", { mode: "number" }),
    insuranceClaimReceivedDate: date("insurance_claim_received_date"),
    physicalInspectionFileId: text("physical_inspection_file_id"),
    deletionMinutesFileId: text("deletion_minutes_file_id"),
    parishPriestMemoFileId: text("parish_priest_memo_file_id"),
    bishopApprovalFileId: text("bishop_approval_file_id"),
    bishopApprovalNumber: varchar("bishop_approval_number", { length: 100 }),
    bishopApprovalDate: date("bishop_approval_date"),
    additionalAttachmentFileIds: jsonb("additional_attachment_file_ids").$type<string[]>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("asset_disposals_asset_idx").on(table.assetId),
    index("asset_disposals_status_idx").on(table.status),
    index("asset_disposals_effective_date_idx").on(table.effectiveDisposalDate),
  ]
);

export const assetStatusHistories = pgTable(
  "asset_status_histories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    previousStatus: varchar("previous_status", { length: 32 }),
    newStatus: varchar("new_status", { length: 32 }).notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
    recordedByUserId: uuid("recorded_by_user_id").references(() => users.id, { onDelete: "set null" }),
    source: varchar("source", { length: 32 }).notNull(),
    relatedEntityType: varchar("related_entity_type", { length: 32 }),
    relatedEntityId: uuid("related_entity_id").references(() => assetDisposals.id, { onDelete: "set null" }),
    notes: text("notes"),
  },
  (table) => [
    index("asset_status_histories_asset_recorded_idx").on(table.assetId, table.recordedAt),
    check(
      "asset_status_histories_source_check",
      sql`${table.source} in ('manual', 'disposal_start', 'disposal_complete', 'disposal_cancel', 'disposal_reject', 'system')`
    ),
  ]
);

export const assetConditionHistories = pgTable(
  "asset_condition_histories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    previousCondition: varchar("previous_condition", { length: 64 }),
    newCondition: varchar("new_condition", { length: 64 }),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
    recordedByUserId: uuid("recorded_by_user_id").references(() => users.id, { onDelete: "set null" }),
    source: varchar("source", { length: 32 }).notNull(),
    relatedEntityType: varchar("related_entity_type", { length: 32 }),
    relatedEntityId: uuid("related_entity_id").references(() => assetDisposals.id, { onDelete: "set null" }),
    notes: text("notes"),
  },
  (table) => [
    index("asset_condition_histories_asset_recorded_idx").on(table.assetId, table.recordedAt),
    check(
      "asset_condition_histories_source_check",
      sql`${table.source} in ('manual', 'disposal_start', 'disposal_complete', 'disposal_cancel', 'disposal_reject', 'system')`
    ),
  ]
);

export const assetLoanHistories = pgTable(
  "asset_loan_histories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    previousLoanedTo: varchar("previous_loaned_to", { length: 191 }),
    newLoanedTo: varchar("new_loaned_to", { length: 191 }),
    eventType: varchar("event_type", { length: 32 }).notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
    recordedByUserId: uuid("recorded_by_user_id").references(() => users.id, { onDelete: "set null" }),
    source: varchar("source", { length: 32 }).notNull(),
    notes: text("notes"),
  },
  (table) => [
    index("asset_loan_histories_asset_recorded_idx").on(table.assetId, table.recordedAt),
    check(
      "asset_loan_histories_source_check",
      sql`${table.source} in ('manual', 'disposal_start', 'disposal_complete', 'disposal_cancel', 'disposal_reject', 'system')`
    ),
    check(
      "asset_loan_histories_event_type_check",
      sql`${table.eventType} in ('loan_start', 'loan_update', 'loan_end')`
    ),
  ]
);

export const assetPlacementHistories = pgTable(
  "asset_placement_histories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    previousUnitId: uuid("previous_unit_id").references(() => units.id, { onDelete: "set null" }),
    newUnitId: uuid("new_unit_id").references(() => units.id, { onDelete: "set null" }),
    previousLocationId: uuid("previous_location_id").references(() => assetLocations.id, { onDelete: "set null" }),
    newLocationId: uuid("new_location_id").references(() => assetLocations.id, { onDelete: "set null" }),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
    recordedByUserId: uuid("recorded_by_user_id").references(() => users.id, { onDelete: "set null" }),
    source: varchar("source", { length: 32 }).notNull(),
    relatedEntityType: varchar("related_entity_type", { length: 32 }),
    relatedEntityId: uuid("related_entity_id").references(() => assetDisposals.id, { onDelete: "set null" }),
    notes: text("notes"),
  },
  (table) => [
    index("asset_placement_histories_asset_recorded_idx").on(table.assetId, table.recordedAt),
    check(
      "asset_placement_histories_source_check",
      sql`${table.source} in ('manual', 'donation_internal', 'system')`
    ),
  ]
);

export const assetOrganizations = pgTable(
  "asset_organizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    relationType: varchar("relation_type", { length: 32 }).notNull(),
    unitId: uuid("unit_id").references(() => units.id, { onDelete: "set null" }),
    badanHukumId: uuid("badan_hukum_id").references(() => badanHukums.id, { onDelete: "set null" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("asset_organizations_asset_relation_idx").on(table.assetId, table.relationType),
  ]
);

export const assetLandDetails = pgTable(
  "asset_land_details",
  {
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" })
      .primaryKey(),
    address: text("address"),
    areaSquareMeters: numeric("area_square_meters", { precision: 18, scale: 2 }),
    certificateType: varchar("certificate_type", { length: 64 }),
    certificateNumber: varchar("certificate_number", { length: 100 }),
    certificateHolderName: varchar("certificate_holder_name", { length: 191 }),
    certificateIssuedAt: date("certificate_issued_at"),
    certificateExpiredAt: date("certificate_expired_at"),
    issuingInstitution: varchar("issuing_institution", { length: 160 }),
    legalOwnerType: varchar("legal_owner_type", { length: 80 }),
    actualOwnerName: varchar("actual_owner_name", { length: 191 }),
    lastNjopValue: numeric("last_njop_value", { precision: 18, scale: 2 }),
    appraisalValue: numeric("appraisal_value", { precision: 18, scale: 2 }),
    appraisalDate: date("appraisal_date"),
    nopPbb: varchar("nop_pbb", { length: 64 }),
    boundaryNorth: text("boundary_north"),
    boundarySouth: text("boundary_south"),
    boundaryEast: text("boundary_east"),
    boundaryWest: text("boundary_west"),
    boundaryPatokCoordinates: jsonb("boundary_patok_coordinates"),
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    landUse: varchar("land_use", { length: 128 }),
    acquisitionMethod: varchar("acquisition_method", { length: 128 }),
    disputeStatus: varchar("dispute_status", { length: 64 }),
    notes: text("notes"),
  }
);

export const assetBuildingDetails = pgTable(
  "asset_building_details",
  {
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" })
      .primaryKey(),
    address: text("address"),
    buildingCategory: varchar("building_category", { length: 32 }),
    buildingType: varchar("building_type", { length: 128 }),
    mainLandAssetId: uuid("main_land_asset_id").references(() => assets.id, { onDelete: "set null" }),
    acquisitionMethod: varchar("acquisition_method", { length: 128 }),
    disputeStatus: varchar("dispute_status", { length: 64 }),
    buildingAreaSquareMeters: numeric("building_area_square_meters", { precision: 18, scale: 2 }),
    floorCount: integer("floor_count"),
    constructionYear: integer("construction_year"),
    lastRenovationYear: integer("last_renovation_year"),
    structureType: varchar("structure_type", { length: 64 }),
    footprintAreaSquareMeters: numeric("footprint_area_square_meters", { precision: 18, scale: 2 }),
    permitType: varchar("permit_type", { length: 64 }),
    permitNumber: varchar("permit_number", { length: 100 }),
    permitIssuedAt: date("permit_issued_at"),
    permitExpiredAt: date("permit_expired_at"),
    permitIssuer: varchar("permit_issuer", { length: 160 }),
    slfNumber: varchar("slf_number", { length: 100 }),
    slfIssuedAt: date("slf_issued_at"),
    slfExpiredAt: date("slf_expired_at"),
    leaseAgreementDocument: text("lease_agreement_document"),
    rentAmount: numeric("rent_amount", { precision: 18, scale: 2 }),
    njopValue: numeric("njop_value", { precision: 18, scale: 2 }),
    appraisalValue: numeric("appraisal_value", { precision: 18, scale: 2 }),
    electricityCapacity: varchar("electricity_capacity", { length: 64 }),
    waterSource: varchar("water_source", { length: 64 }),
    parkingCapacity: varchar("parking_capacity", { length: 64 }),
    facilities: text("facilities"),
    maintenanceResponsibleName: varchar("maintenance_responsible_name", { length: 191 }),
    maintenanceAnnualCost: numeric("maintenance_annual_cost", { precision: 18, scale: 2 }),
    physicalCondition: text("physical_condition"),
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    notes: text("notes"),
  }
);

export const assetBuildingLands = pgTable(
  "asset_building_lands",
  {
    buildingAssetId: uuid("building_asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    landAssetId: uuid("land_asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.buildingAssetId, table.landAssetId] }),
    index("asset_building_lands_building_idx").on(table.buildingAssetId),
    index("asset_building_lands_land_idx").on(table.landAssetId),
  ]
);

export const assetVehicleDetails = pgTable(
  "asset_vehicle_details",
  {
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" })
      .primaryKey(),
    vehicleCategory: varchar("vehicle_category", { length: 64 }),
    brand: varchar("brand", { length: 120 }),
    model: varchar("model", { length: 120 }),
    manufactureYear: integer("manufacture_year"),
    color: varchar("color", { length: 64 }),
    plateNumber: varchar("plate_number", { length: 32 }),
    chassisNumber: varchar("chassis_number", { length: 64 }),
    engineNumber: varchar("engine_number", { length: 64 }),
    stnkNumber: varchar("stnk_number", { length: 64 }),
    bpkbNumber: varchar("bpkb_number", { length: 64 }),
    documentCompletenessStatus: varchar("document_completeness_status", { length: 32 }),
    stnkIssuedAt: date("stnk_issued_at"),
    stnkExpiredAt: date("stnk_expired_at"),
    lastTaxPaidAt: date("last_tax_paid_at"),
    taxDueAt: date("tax_due_at"),
    taxStatus: varchar("tax_status", { length: 32 }),
    issuingInstitution: varchar("issuing_institution", { length: 160 }),
    registeredOwnerName: varchar("registered_owner_name", { length: 191 }),
    insurancePolicyNumber: varchar("insurance_policy_number", { length: 100 }),
    insuranceValidUntil: date("insurance_valid_until"),
    domicileLocation: text("domicile_location"),
    condition: varchar("condition", { length: 64 }),
    operationalStatus: varchar("operational_status", { length: 32 }),
    notes: text("notes"),
  }
);

export const assetItemDetails = pgTable(
  "asset_item_details",
  {
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" })
      .primaryKey(),
    itemCategory: varchar("item_category", { length: 64 }),
    description: text("description"),
    brand: varchar("brand", { length: 120 }),
    model: varchar("model", { length: 120 }),
    serialNumber: varchar("serial_number", { length: 120 }),
    quantity: numeric("quantity", { precision: 18, scale: 2 }),
    unit: varchar("unit", { length: 32 }),
    storageLocation: text("storage_location"),
    responsiblePerson: varchar("responsible_person", { length: 160 }),
    evidenceDocumentNumber: varchar("evidence_document_number", { length: 100 }),
    evidenceDocumentDate: date("evidence_document_date"),
    evidenceIssuer: varchar("evidence_issuer", { length: 191 }),
    evidenceRegisteredName: varchar("evidence_registered_name", { length: 191 }),
    documentStatus: varchar("document_status", { length: 32 }),
    condition: varchar("condition", { length: 64 }),
    notes: text("notes"),
  }
);
export const taxDepreciationGroups = pgTable(
  "tax_depreciation_groups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 64 }).notNull().unique(),
    name: varchar("name", { length: 160 }).notNull(),
    assetCategory: varchar("asset_category", { length: 32 }).notNull(),
    methodDefault: varchar("method_default", { length: 32 }).notNull(),
    usefulLifeYears: integer("useful_life_years").notNull(),
    ratePercent: numeric("rate_percent", { precision: 6, scale: 2 }).notNull().default("0"),
    isDepreciable: boolean("is_depreciable").notNull().default(true),
    effectiveFrom: date("effective_from").notNull(),
    effectiveTo: date("effective_to"),
    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("tax_depreciation_groups_code_idx").on(table.code),
  ]
);

export const taxDepreciationRules = pgTable(
  "tax_depreciation_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => taxDepreciationGroups.id, { onDelete: "cascade" }),
    taxYear: integer("tax_year").notNull(),
    method: varchar("method", { length: 32 }).notNull(),
    usefulLifeYears: integer("useful_life_years").notNull(),
    ratePercent: numeric("rate_percent", { precision: 6, scale: 2 }).notNull(),
    residualValuePercent: numeric("residual_value_percent", { precision: 6, scale: 2 }),
    sourceRegulation: varchar("source_regulation", { length: 160 }).notNull(),
    effectiveFrom: date("effective_from").notNull(),
    effectiveTo: date("effective_to"),
    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("tax_depreciation_rules_group_year_idx").on(table.groupId, table.taxYear),
  ]
);

export const taxAssetDepreciation = pgTable(
  "tax_asset_depreciation",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    depreciationGroupId: uuid("depreciation_group_id")
      .notNull()
      .references(() => taxDepreciationGroups.id, { onDelete: "restrict" }),
    ruleId: uuid("rule_id").references(() => taxDepreciationRules.id, { onDelete: "set null" }),
    acquisitionValue: numeric("acquisition_value", { precision: 18, scale: 2 }).notNull(),
    residualValue: numeric("residual_value", { precision: 18, scale: 2 }).notNull().default("0"),
    depreciableBase: numeric("depreciable_base", { precision: 18, scale: 2 }).notNull(),
    annualDepreciation: numeric("annual_depreciation", { precision: 18, scale: 2 }).notNull(),
    accumulatedDepreciation: numeric("accumulated_depreciation", { precision: 18, scale: 2 }).notNull().default("0"),
    bookValue: numeric("book_value", { precision: 18, scale: 2 }).notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    status: varchar("status", { length: 32 }).notNull(),
    calculationMethod: varchar("calculation_method", { length: 32 }).notNull(),
    taxYear: integer("tax_year").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("tax_asset_depreciation_asset_year_idx").on(table.assetId, table.taxYear),
  ]
);

export const taxAssetCoretax = pgTable("tax_asset_coretax", {
  assetId: uuid("asset_id")
    .notNull()
    .references(() => assets.id, { onDelete: "cascade" })
    .primaryKey(),
  coretaxAssetType: varchar("coretax_asset_type", { length: 64 }),
  coretaxAssetCode: varchar("coretax_asset_code", { length: 64 }),
  assetClassType: varchar("asset_class_type", { length: 64 }),
  ownershipSource: varchar("ownership_source", { length: 128 }),
  sptOwnerName: varchar("spt_owner_name", { length: 191 }),
  taxNotes: text("tax_notes"),
  auditNotes: text("audit_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 120 }).notNull(),
  entity: varchar("entity", { length: 120 }).notNull(),
  entityId: uuid("entity_id"),
  beforeData: text("before_data"),
  afterData: text("after_data"),
  ipAddress: varchar("ip_address", { length: 64 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});







