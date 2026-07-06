import {
  boolean,
  date,
  index,
  integer,
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
    acquisitionDate: date("acquisition_date"),
    acquisitionValue: numeric("acquisition_value", { precision: 18, scale: 2 }),
    legalStatus: varchar("legal_status", { length: 64 }),
    ownerName: varchar("owner_name", { length: 191 }),
    condition: varchar("condition", { length: 64 }),
    status: varchar("status", { length: 32 }).notNull().default("active"),
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
    electricityCapacity: varchar("electricity_capacity", { length: 64 }),
    waterSource: varchar("water_source", { length: 64 }),
    parkingCapacity: varchar("parking_capacity", { length: 64 }),
    facilities: text("facilities"),
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







