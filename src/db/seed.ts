import { db } from "@/db";
import { and, eq, sql } from "drizzle-orm";

import { hashPassword } from "@/lib/password";
import {
  assetBuildingDetails,
  assetBuildingLands,
  assetCategoryOptions,
  assetDisposals,
  assetItemDetails,
  assetLandDetails,
  assetLocations,
  assetDisposalLookupOptions,
  assetOrganizations,
  assetAttachments,
  assetStatusOptions,
  assetStatusHistories,
  assetConditionHistories,
  assetLoanHistories,
  assetVehicleDetails,
  assets,
  badanHukums,
  permissions,
  users,
  rolePermissions,
  roles,
  taxDepreciationGroups,
  taxDepreciationRules,
  taxAssetDepreciation,
  taxAssetCoretax,
  units,
} from "@/db/schema";
import { disposalLookupDefaults, type DisposalLookupCategory } from "@/lib/asset-disposals/constants";
import { assetCategoryDefaults } from "@/lib/asset-categories";
import { assetItemCategories } from "@/lib/asset-item-categories";
import { assetVehicleCategories } from "@/lib/asset-vehicle-categories";
import { assetStatusDefaults } from "@/lib/asset-statuses";
import { inactiveAssetStatusDescription } from "@/lib/assets/status";
import { buildStatusHistoryNote, resolveLoanHistoryEventType } from "@/lib/assets/histories.helpers";
import {
  buildingConditions,
  itemConditions,
  vehicleConditions,
} from "@/lib/assets/condition-options";

type SeedItem = {
  code: string;
  name: string;
  description?: string;
};
type UserSeed = {
  email: string;
  name: string;
  roleCode: string;
  unitCode?: string;
  badanHukumName?: string;
};

const roleSeeds: SeedItem[] = [
  { code: "superadmin", name: "Super Admin", description: "Akses penuh." },
  { code: "admin-keuskupan", name: "Admin Keuskupan" },
  { code: "admin-kevikepan", name: "Admin Kevikepan" },
  { code: "admin-kategorial", name: "Admin Kategorial" },
  { code: "admin-paroki", name: "Admin Paroki" },
  { code: "admin-badan", name: "Admin Badan Hukum" },
  { code: "admin-unit", name: "Admin Unit" },
  { code: "admin-aset", name: "Admin Aset" },
];

const permissionSeeds: SeedItem[] = [
  { code: "unit.read", name: "Unit Read" },
  { code: "unit.create", name: "Unit Create" },
  { code: "unit.update", name: "Unit Update" },
  { code: "unit.delete", name: "Unit Delete" },
  { code: "badan-hukum.read", name: "Badan Hukum Read" },
  { code: "badan-hukum.create", name: "Badan Hukum Create" },
  { code: "badan-hukum.update", name: "Badan Hukum Update" },
  { code: "badan-hukum.delete", name: "Badan Hukum Delete" },
  { code: "asset.read", name: "Asset Read" },
  { code: "asset.create", name: "Asset Create" },
  { code: "asset.update", name: "Asset Update" },
  { code: "asset.delete", name: "Asset Delete" },
  { code: "asset.disposal.view", name: "Asset Disposal View" },
  { code: "asset.disposal.create", name: "Asset Disposal Create" },
  { code: "asset.disposal.edit", name: "Asset Disposal Edit" },
  { code: "asset.disposal.submit", name: "Asset Disposal Submit" },
  { code: "asset.disposal.review", name: "Asset Disposal Review" },
  { code: "asset.disposal.approve", name: "Asset Disposal Approve" },
  { code: "asset.disposal.complete", name: "Asset Disposal Complete" },
  { code: "asset.disposal.reject", name: "Asset Disposal Reject" },
  { code: "asset.disposal.cancel", name: "Asset Disposal Cancel" },
  { code: "asset.disposal.delete", name: "Asset Disposal Delete" },
  { code: "asset.disposal.viewFinancialFields", name: "Asset Disposal View Financial Fields" },
  { code: "asset.disposal.uploadDocuments", name: "Asset Disposal Upload Documents" },
  { code: "asset.disposal.downloadDocuments", name: "Asset Disposal Download Documents" },
  { code: "tax-master.read", name: "Tax Master Read" },
  { code: "tax-master.update", name: "Tax Master Update" },
  { code: "rbac.manage", name: "RBAC Manage" },
  { code: "audit.read", name: "Audit Read" },
];

const rolePermissionMap: Record<string, string[]> = {
  superadmin: permissionSeeds.map((permission) => permission.code),
  "admin-keuskupan": ["unit.read", "unit.update", "asset.read", "asset.create", "asset.update", "asset.disposal.view", "asset.disposal.create", "asset.disposal.edit", "asset.disposal.submit", "asset.disposal.review", "asset.disposal.approve", "asset.disposal.complete", "asset.disposal.reject", "asset.disposal.cancel", "asset.disposal.viewFinancialFields", "asset.disposal.uploadDocuments", "asset.disposal.downloadDocuments", "audit.read"],
  "admin-kevikepan": ["unit.read", "unit.update", "asset.read", "asset.create", "asset.update", "asset.disposal.view", "asset.disposal.create", "asset.disposal.edit", "asset.disposal.submit", "asset.disposal.review", "asset.disposal.reject", "asset.disposal.cancel", "asset.disposal.uploadDocuments", "asset.disposal.downloadDocuments", "audit.read"],
  "admin-kategorial": ["unit.read", "unit.update", "asset.read", "asset.create", "asset.update", "asset.disposal.view", "asset.disposal.create", "asset.disposal.edit", "asset.disposal.submit", "asset.disposal.review", "asset.disposal.reject", "asset.disposal.cancel", "asset.disposal.uploadDocuments", "asset.disposal.downloadDocuments", "audit.read"],
  "admin-paroki": ["unit.read", "unit.update", "asset.read", "asset.create", "asset.update", "asset.disposal.view", "asset.disposal.create", "asset.disposal.edit", "asset.disposal.submit", "asset.disposal.review", "asset.disposal.reject", "asset.disposal.cancel", "asset.disposal.uploadDocuments", "asset.disposal.downloadDocuments", "audit.read"],
  "admin-badan": ["badan-hukum.read", "badan-hukum.create", "badan-hukum.update", "asset.read", "asset.create", "asset.update", "asset.disposal.view", "asset.disposal.create", "asset.disposal.edit", "asset.disposal.submit", "asset.disposal.review", "asset.disposal.reject", "asset.disposal.cancel", "asset.disposal.uploadDocuments", "asset.disposal.downloadDocuments", "audit.read"],
  "admin-unit": ["unit.read", "unit.create", "unit.update", "asset.read", "asset.create", "asset.update", "asset.disposal.view", "asset.disposal.create", "asset.disposal.edit", "asset.disposal.submit", "asset.disposal.review", "asset.disposal.reject", "asset.disposal.cancel", "asset.disposal.uploadDocuments", "asset.disposal.downloadDocuments", "audit.read"],
  "admin-aset": ["asset.read", "asset.create", "asset.update", "asset.delete", "asset.disposal.view", "asset.disposal.create", "asset.disposal.edit", "asset.disposal.submit", "asset.disposal.review", "asset.disposal.approve", "asset.disposal.complete", "asset.disposal.reject", "asset.disposal.cancel", "asset.disposal.delete", "asset.disposal.viewFinancialFields", "asset.disposal.uploadDocuments", "asset.disposal.downloadDocuments", "tax-master.read", "audit.read"],
};

const userSeeds: UserSeed[] = [
  {
    email: "superadmin@siakas.local",
    name: "Super Admin",
    roleCode: "superadmin",
  },
  {
    email: "keuskupan@siakas.local",
    name: "Admin Keuskupan",
    roleCode: "admin-keuskupan",
    unitCode: "KEUSKUPAN-SBY",
  },
  {
    email: "kevikepan@siakas.local",
    name: "Admin Kevikepan",
    roleCode: "admin-kevikepan",
    unitCode: "KEUSKUPAN-SBY",
  },
  {
    email: "kategorial@siakas.local",
    name: "Admin Kategorial",
    roleCode: "admin-kategorial",
    unitCode: "PAROKI-KATEDRAL",
  },
  {
    email: "paroki@siakas.local",
    name: "Admin Paroki",
    roleCode: "admin-paroki",
    unitCode: "PAROKI-KATEDRAL",
  },
  {
    email: "badan@siakas.local",
    name: "Admin Badan Hukum",
    roleCode: "admin-badan",
    badanHukumName: "Yayasan Contoh Keuskupan",
  },
  {
    email: "unit@siakas.local",
    name: "Admin Unit",
    roleCode: "admin-unit",
    unitCode: "PAROKI-KATEDRAL",
  },
  {
    email: "aset@siakas.local",
    name: "Admin Aset",
    roleCode: "admin-aset",
    unitCode: "PAROKI-KATEDRAL",
  },
];

async function seedRoles() {
  await db
    .insert(roles)
    .values(
      roleSeeds.map((role) => ({
        code: role.code,
        name: role.name,
        description: role.description,
        isSystem: true,
      }))
    )
    .onConflictDoNothing();
}

async function seedPermissions() {
  await db
    .insert(permissions)
    .values(
      permissionSeeds.map((permission) => {
        const [resource, action] = permission.code.split(".");

        return {
          code: permission.code,
          resource,
          action,
          description: permission.name,
        };
      })
    )
    .onConflictDoNothing();
}

async function seedRolePermissions() {
  const existingRoles = await db.select().from(roles);
  const existingPermissions = await db.select().from(permissions);

  const roleIdByCode = new Map(existingRoles.map((role) => [role.code, role.id]));
  const permissionIdByCode = new Map(existingPermissions.map((permission) => [permission.code, permission.id]));

  const mappings = Object.entries(rolePermissionMap).flatMap(([roleCode, permissionCodes]) => {
    const roleId = roleIdByCode.get(roleCode);
    if (!roleId) return [];

    return permissionCodes.flatMap((permissionCode) => {
      const permissionId = permissionIdByCode.get(permissionCode);
      if (!permissionId) return [];

      return [
        {
          roleId,
          permissionId,
          granted: true,
        },
      ];
    });
  });

  if (mappings.length > 0) {
    await db.insert(rolePermissions).values(mappings).onConflictDoNothing();
  }
}

async function seedTaxMasters() {
  const taxGroupSeeds = [
    {
      code: "land",
      name: "Tanah",
      assetCategory: "tanah",
      methodDefault: "tidak_disusutkan",
      usefulLifeYears: 0,
      ratePercent: "0",
      isDepreciable: false,
      effectiveFrom: "2025-01-01",
      isActive: true,
      notes: "Tanah tidak disusutkan.",
    },
    {
      code: "building-permanent",
      name: "Bangunan Permanen",
      assetCategory: "bangunan",
      methodDefault: "garis_lurus",
      usefulLifeYears: 20,
      ratePercent: "5",
      isDepreciable: true,
      effectiveFrom: "2025-01-01",
      isActive: true,
      notes: "Kelompok fiskal bangunan permanen.",
    },
    {
      code: "building-nonpermanent",
      name: "Bangunan Tidak Permanen",
      assetCategory: "bangunan",
      methodDefault: "garis_lurus",
      usefulLifeYears: 10,
      ratePercent: "10",
      isDepreciable: true,
      effectiveFrom: "2025-01-01",
      isActive: true,
      notes: "Kelompok fiskal bangunan tidak permanen.",
    },
    ...assetVehicleCategories.map((category) => ({
      code: category.depreciationGroupCode,
      name: category.depreciationGroupName,
      assetCategory: "kendaraan",
      methodDefault: "garis_lurus",
      usefulLifeYears: category.usefulLifeYears,
      ratePercent: category.ratePercent,
      isDepreciable: true,
      effectiveFrom: "2025-01-01",
      isActive: true,
      notes: `${category.label}. ${category.depreciationGroupLabel}, masa manfaat ${category.usefulLifeYears} tahun.`,
    })),
    ...assetItemCategories.map((category) => ({
      code: category.depreciationGroupCode,
      name: category.depreciationGroupName,
      assetCategory: "benda",
      methodDefault: "garis_lurus",
      usefulLifeYears: category.usefulLifeYears,
      ratePercent: category.ratePercent,
      isDepreciable: true,
      effectiveFrom: "2025-01-01",
      isActive: true,
      notes: `${category.label}. ${category.depreciationGroupLabel}, masa manfaat ${category.usefulLifeYears} tahun.`,
    })),
  ];

  for (const group of taxGroupSeeds) {
    await db.insert(taxDepreciationGroups).values(group).onConflictDoNothing();
  }

  const existingGroups = await db.select().from(taxDepreciationGroups);
  const groupIdByCode = new Map(existingGroups.map((group) => [group.code, group.id]));
  const taxRuleSeeds = [
    {
      code: "land",
      taxYear: 2025,
      method: "tidak_disusutkan",
      usefulLifeYears: 0,
      ratePercent: "0",
      residualValuePercent: "0",
      sourceRegulation: "PMK 81 Tahun 2024",
      effectiveFrom: "2025-01-01",
      isActive: true,
      notes: "Tanah tidak disusutkan.",
    },
    {
      code: "building-permanent",
      taxYear: 2025,
      method: "garis_lurus",
      usefulLifeYears: 20,
      ratePercent: "5",
      residualValuePercent: "0",
      sourceRegulation: "PMK 81 Tahun 2024",
      effectiveFrom: "2025-01-01",
      isActive: true,
      notes: "Bangunan permanen.",
    },
    {
      code: "building-nonpermanent",
      taxYear: 2025,
      method: "garis_lurus",
      usefulLifeYears: 10,
      ratePercent: "10",
      residualValuePercent: "0",
      sourceRegulation: "PMK 81 Tahun 2024",
      effectiveFrom: "2025-01-01",
      isActive: true,
      notes: "Bangunan tidak permanen.",
    },
    ...assetVehicleCategories.map((category) => ({
      code: category.depreciationGroupCode,
      taxYear: 2025,
      method: "garis_lurus",
      usefulLifeYears: category.usefulLifeYears,
      ratePercent: category.ratePercent,
      residualValuePercent: "0",
      sourceRegulation: "PMK 81 Tahun 2024",
      effectiveFrom: "2025-01-01",
      isActive: true,
      notes: `${category.depreciationGroupLabel}, masa manfaat ${category.usefulLifeYears} tahun.`,
    })),
    ...assetItemCategories.map((category) => ({
      code: category.depreciationGroupCode,
      taxYear: 2025,
      method: "garis_lurus",
      usefulLifeYears: category.usefulLifeYears,
      ratePercent: category.ratePercent,
      residualValuePercent: "0",
      sourceRegulation: "PMK 81 Tahun 2024",
      effectiveFrom: "2025-01-01",
      isActive: true,
      notes: `${category.depreciationGroupLabel}, masa manfaat ${category.usefulLifeYears} tahun.`,
    })),
  ];

  for (const seed of taxRuleSeeds) {
    const groupId = groupIdByCode.get(seed.code);
    if (!groupId) continue;

    await db.insert(taxDepreciationRules).values({
      groupId,
      taxYear: seed.taxYear,
      method: seed.method,
      usefulLifeYears: seed.usefulLifeYears,
      ratePercent: seed.ratePercent,
      residualValuePercent: seed.residualValuePercent,
      sourceRegulation: seed.sourceRegulation,
      effectiveFrom: seed.effectiveFrom,
      isActive: seed.isActive,
      notes: seed.notes,
    }).onConflictDoNothing();
  }
}


async function seedUsers() {
  const existingRoles = await db.select().from(roles);
  const existingUnits = await db.select().from(units);
  const existingBadanHukums = await db.select().from(badanHukums);

  const roleIdByCode = new Map(existingRoles.map((role) => [role.code, role.id]));
  const unitIdByCode = new Map(existingUnits.map((unit) => [unit.code, unit.id]));
  const badanHukumIdByName = new Map(existingBadanHukums.map((badanHukum) => [badanHukum.name, badanHukum.id]));
  const passwordHash = hashPassword("password");

  for (const seed of userSeeds) {
    const roleId = roleIdByCode.get(seed.roleCode);
    if (!roleId) continue;

    await db
      .insert(users)
      .values({
        email: seed.email,
        name: seed.name,
        passwordHash,
        roleId,
        unitId: seed.unitCode ? unitIdByCode.get(seed.unitCode) ?? null : null,
        badanHukumId: seed.badanHukumName ? badanHukumIdByName.get(seed.badanHukumName) ?? null : null,
        isActive: true,
      })
      .onConflictDoNothing();
  }

  await db.execute(sql`
    UPDATE ${assetItemDetails}
    SET item_category = CASE item_category
      WHEN 'peralatan kantor' THEN 'KTR-UMUM'
      WHEN 'elektronik' THEN 'NL-ELK'
      WHEN 'peralatan ibadah' THEN 'NL-ELK'
      WHEN 'furnitur' THEN 'NL-NONLOG'
      WHEN 'peralatan kesehatan' THEN 'OPS-KMN-UMUM'
      WHEN 'liturgical_metal' THEN 'LIT-LOG'
      WHEN 'liturgical_wood_fabric' THEN 'LIT-NONLOG'
      WHEN 'non_liturgical_electronics' THEN 'NL-ELK'
      WHEN 'non_liturgical_wood_fabric_plastic' THEN 'NL-NONLOG'
      WHEN 'office_metal_air_conditioning' THEN 'KTR-LOGUD'
      WHEN 'office_main' THEN 'KTR-UMUM'
      WHEN 'rectory_metal_air_conditioning' THEN 'PAS-LOGUD'
      WHEN 'rectory_main' THEN 'PAS-UMUM'
      WHEN 'misc_tent_canopy' THEN 'OPS-LAP-LAIN'
      WHEN 'misc_blower' THEN 'OPS-KBR-UMUM'
      WHEN 'misc_floor_polisher' THEN 'OPS-KBR-LAIN'
      WHEN 'misc_vacuum_cleaner' THEN 'OPS-KBR-UMUM'
      WHEN 'misc_compressor' THEN 'OPS-TEK-LAIN'
      WHEN 'misc_metal_detector' THEN 'OPS-KMN-UMUM'
      WHEN 'misc_fogging_tool' THEN 'OPS-KBR-LAIN'
      WHEN 'misc_other' THEN 'OPS-LAP-LAIN'
      ELSE item_category
    END
    WHERE item_category IN (
      'peralatan kantor',
      'elektronik',
      'peralatan ibadah',
      'furnitur',
      'peralatan kesehatan',
      'liturgical_metal',
      'liturgical_wood_fabric',
      'non_liturgical_electronics',
      'non_liturgical_wood_fabric_plastic',
      'office_metal_air_conditioning',
      'office_main',
      'rectory_metal_air_conditioning',
      'rectory_main',
      'misc_tent_canopy',
      'misc_blower',
      'misc_floor_polisher',
      'misc_vacuum_cleaner',
      'misc_compressor',
      'misc_metal_detector',
      'misc_fogging_tool',
      'misc_other'
    )
  `);

  await db.execute(sql`
    UPDATE ${assetBuildingDetails}
    SET building_category = 'permanent'
    WHERE building_category IS NULL OR building_category = ''
  `);

  await db.execute(sql`
    UPDATE ${assetVehicleDetails}
    SET vehicle_category = CASE vehicle_category
      WHEN 'motor' THEN 'KND-R2'
      WHEN 'sepeda' THEN 'KND-R2'
      WHEN 'sepeda motor' THEN 'KND-R2'
      WHEN 'mobil' THEN 'KND-R4'
      WHEN 'truk' THEN 'KND-R4'
      WHEN 'bus' THEN 'KND-R4'
      WHEN 'pickup' THEN 'KND-R4'
      WHEN 'alat berat' THEN 'KND-R4'
      WHEN 'lainnya' THEN 'KND-R4'
      ELSE vehicle_category
    END
    WHERE vehicle_category IN ('motor', 'sepeda', 'sepeda motor', 'mobil', 'truk', 'bus', 'pickup', 'alat berat', 'lainnya')
  `);
}

async function seedReferenceData() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "asset_category_options" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "asset_type" varchar(32) NOT NULL,
      "code" varchar(64) NOT NULL,
      "label" varchar(191) NOT NULL,
      "depreciation_group_code" varchar(64) NOT NULL,
      "depreciation_group_label" varchar(64),
      "useful_life_years" integer NOT NULL,
      "rate_percent" numeric(6, 2) DEFAULT '0' NOT NULL,
      "examples" jsonb,
      "allowed_types" jsonb,
      "sort_order" integer DEFAULT 0 NOT NULL,
      "is_active" boolean DEFAULT true NOT NULL,
      "is_system" boolean DEFAULT false NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    )
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "asset_category_options_type_code_idx"
      ON "asset_category_options" USING btree ("asset_type", "code")
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "asset_category_options_type_idx"
      ON "asset_category_options" USING btree ("asset_type")
  `);

  await db
    .insert(assetCategoryOptions)
    .values(assetCategoryDefaults.map((category) => ({ ...category, isSystem: true })))
    .onConflictDoNothing();

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "asset_disposal_lookup_options" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "category" varchar(64) NOT NULL,
      "code" varchar(64) NOT NULL,
      "label" varchar(160) NOT NULL,
      "description" text,
      "sort_order" integer DEFAULT 0 NOT NULL,
      "is_active" boolean DEFAULT true NOT NULL,
      "is_system" boolean DEFAULT false NOT NULL,
      "metadata" jsonb,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    )
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "asset_disposal_lookup_options_category_code_idx"
      ON "asset_disposal_lookup_options" USING btree ("category", "code")
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "asset_disposal_lookup_options_category_idx"
      ON "asset_disposal_lookup_options" USING btree ("category")
  `);

  for (const [category, options] of Object.entries(disposalLookupDefaults) as Array<[DisposalLookupCategory, (typeof disposalLookupDefaults)[DisposalLookupCategory]]>) {
    await db
      .insert(assetDisposalLookupOptions)
      .values(
        options.map((option) => ({
          category,
          code: option.code,
          label: option.label,
          sortOrder: option.sortOrder,
          isActive: true,
          isSystem: true,
          metadata: "metadata" in option ? option.metadata : null,
        }))
      )
      .onConflictDoNothing();
  }

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "asset_status_options" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "code" varchar(64) NOT NULL,
      "label" varchar(160) NOT NULL,
      "description" text,
      "sort_order" integer DEFAULT 0 NOT NULL,
      "is_active" boolean DEFAULT true NOT NULL,
      "is_system" boolean DEFAULT false NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    )
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "asset_status_options_code_idx"
      ON "asset_status_options" USING btree ("code")
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "asset_status_options_active_idx"
      ON "asset_status_options" USING btree ("is_active")
  `);

  await db
    .insert(assetStatusOptions)
    .values(
      assetStatusDefaults.map((option) => ({
        code: option.code,
        label: option.label,
        description: option.description,
        sortOrder: option.sortOrder,
        isActive: option.isActive,
        isSystem: option.isSystem,
      }))
    )
    .onConflictDoNothing();

  await db.execute(sql`
    UPDATE assets SET status = 'inactive', updated_at = now() WHERE status = 'archived'
  `);
  await db.execute(sql`
    UPDATE asset_status_options
    SET is_active = false, updated_at = now()
    WHERE code = 'archived'
  `);
  await db.execute(sql`
    UPDATE asset_status_options
    SET
      description = ${inactiveAssetStatusDescription},
      label = 'Nonaktif',
      updated_at = now()
    WHERE code = 'inactive'
  `);

  await db.execute(sql`
    ALTER TABLE assets ADD COLUMN IF NOT EXISTS loaned_to varchar(191)
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "asset_status_histories" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "asset_id" uuid NOT NULL REFERENCES "assets"("id") ON DELETE cascade,
      "previous_status" varchar(32),
      "new_status" varchar(32) NOT NULL,
      "recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
      "recorded_by_user_id" uuid REFERENCES "users"("id") ON DELETE set null,
      "source" varchar(32) NOT NULL,
      "related_entity_type" varchar(32),
      "related_entity_id" uuid,
      "notes" text
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "asset_status_histories_asset_recorded_idx"
      ON "asset_status_histories" USING btree ("asset_id", "recorded_at")
  `);
  await db.execute(sql`
    UPDATE assets AS a
    SET loaned_to = TRIM(REPLACE(h.notes, 'Dipinjamkan kepada:', ''))
  FROM (
    SELECT DISTINCT ON (asset_id)
      asset_id,
      notes
    FROM asset_status_histories
    WHERE new_status = 'on_loan'
      AND notes LIKE 'Dipinjamkan kepada:%'
    ORDER BY asset_id, recorded_at DESC
  ) AS h
  WHERE a.id = h.asset_id
    AND a.status = 'on_loan'
    AND a.loaned_to IS NULL
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "asset_condition_histories" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "asset_id" uuid NOT NULL REFERENCES "assets"("id") ON DELETE cascade,
      "previous_condition" varchar(64),
      "new_condition" varchar(64),
      "recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
      "recorded_by_user_id" uuid REFERENCES "users"("id") ON DELETE set null,
      "source" varchar(32) NOT NULL,
      "related_entity_type" varchar(32),
      "related_entity_id" uuid,
      "notes" text
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "asset_condition_histories_asset_recorded_idx"
      ON "asset_condition_histories" USING btree ("asset_id", "recorded_at")
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "asset_loan_histories" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "asset_id" uuid NOT NULL REFERENCES "assets"("id") ON DELETE cascade,
      "previous_loaned_to" varchar(191),
      "new_loaned_to" varchar(191),
      "event_type" varchar(32) NOT NULL,
      "recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
      "recorded_by_user_id" uuid REFERENCES "users"("id") ON DELETE set null,
      "source" varchar(32) NOT NULL,
      "notes" text
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "asset_loan_histories_asset_recorded_idx"
      ON "asset_loan_histories" USING btree ("asset_id", "recorded_at")
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "asset_placement_histories" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "asset_id" uuid NOT NULL REFERENCES "assets"("id") ON DELETE cascade,
      "previous_unit_id" uuid REFERENCES "units"("id") ON DELETE set null,
      "new_unit_id" uuid REFERENCES "units"("id") ON DELETE set null,
      "previous_location_id" uuid REFERENCES "asset_locations"("id") ON DELETE set null,
      "new_location_id" uuid REFERENCES "asset_locations"("id") ON DELETE set null,
      "recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
      "recorded_by_user_id" uuid REFERENCES "users"("id") ON DELETE set null,
      "source" varchar(32) NOT NULL,
      "related_entity_type" varchar(32),
      "related_entity_id" uuid,
      "notes" text
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "asset_placement_histories_asset_recorded_idx"
      ON "asset_placement_histories" USING btree ("asset_id", "recorded_at")
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "asset_status_histories"
        ADD CONSTRAINT "asset_status_histories_source_check"
        CHECK (source IN ('manual', 'disposal_start', 'disposal_complete', 'disposal_cancel', 'disposal_reject', 'system'));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `);
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "asset_condition_histories"
        ADD CONSTRAINT "asset_condition_histories_source_check"
        CHECK (source IN ('manual', 'disposal_start', 'disposal_complete', 'disposal_cancel', 'disposal_reject', 'system'));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `);
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "asset_loan_histories"
        ADD CONSTRAINT "asset_loan_histories_source_check"
        CHECK (source IN ('manual', 'disposal_start', 'disposal_complete', 'disposal_cancel', 'disposal_reject', 'system'));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `);
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "asset_loan_histories"
        ADD CONSTRAINT "asset_loan_histories_event_type_check"
        CHECK (event_type IN ('loan_start', 'loan_update', 'loan_end'));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `);
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "asset_placement_histories"
        ADD CONSTRAINT "asset_placement_histories_source_check"
        CHECK (source IN ('manual', 'donation_internal', 'system'));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `);
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "asset_placement_histories"
        ADD CONSTRAINT "asset_placement_histories_related_entity_id_fkey"
        FOREIGN KEY ("related_entity_id") REFERENCES "asset_disposals"("id") ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `);
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "asset_status_histories"
        ADD CONSTRAINT "asset_status_histories_related_entity_id_fkey"
        FOREIGN KEY ("related_entity_id") REFERENCES "asset_disposals"("id") ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `);
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "asset_condition_histories"
        ADD CONSTRAINT "asset_condition_histories_related_entity_id_fkey"
        FOREIGN KEY ("related_entity_id") REFERENCES "asset_disposals"("id") ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `);

  await db.execute(sql`
    ALTER TABLE "asset_disposals" ADD COLUMN IF NOT EXISTS "donation_recipient_kind" varchar(32)
  `);
  await db.execute(sql`
    ALTER TABLE "asset_disposals" ADD COLUMN IF NOT EXISTS "recipient_unit_id" uuid REFERENCES "units"("id") ON DELETE set null
  `);
  await db.execute(sql`
    DELETE FROM "asset_disposal_lookup_options" WHERE "category" = 'recipient_type'
  `);
  await db.execute(sql`
    ALTER TABLE "asset_disposals" DROP COLUMN IF EXISTS "recipient_type"
  `);

  await db
    .insert(units)
    .values({
      code: "KEUSKUPAN-SBY",
      name: "Keuskupan Surabaya",
      kind: "keuskupan",
      category: "wilayah",
      legalParentType: "langsung_keuskupan",
      address: "Surabaya, Jawa Timur",
      responsiblePerson: "Administrator",
      notes: "Root unit",
    })
    .onConflictDoNothing();

  const existingUnitsAfterRoot = await db.select().from(units);
  const rootUnitId = existingUnitsAfterRoot.find((unit) => unit.code === "KEUSKUPAN-SBY")?.id ?? null;

  await db
    .insert(units)
    .values({
      code: "PAROKI-KATEDRAL",
      name: "Paroki Katedral",
      kind: "paroki",
      category: "pastoral",
      parentId: rootUnitId ?? undefined,
      legalParentType: "langsung_keuskupan",
      address: "Surabaya, Jawa Timur",
      responsiblePerson: "Romo Administrator",
      notes: "Contoh unit anak",
    })
    .onConflictDoNothing();

  const additionalUnits = [
    {
      code: "PAROKI-SANTO-YUSUP",
      name: "Paroki Santo Yusup",
      kind: "paroki",
      category: "pastoral",
      parentId: rootUnitId ?? undefined,
      legalParentType: "langsung_keuskupan",
      address: "Surabaya Selatan",
      responsiblePerson: "Romo Paroki",
      notes: "Unit contoh untuk seed aset",
    },
    {
      code: "SEKOLAH-SANTA-MARIA",
      name: "Sekolah Santa Maria",
      kind: "unit karya",
      category: "pendidikan",
      parentId: rootUnitId ?? undefined,
      legalParentType: "yayasan",
      address: "Surabaya Timur",
      responsiblePerson: "Kepala Sekolah",
      notes: "Unit karya pendidikan",
    },
    {
      code: "KLINIK-BETHANIA",
      name: "Klinik Bethania",
      kind: "unit karya",
      category: "kesehatan",
      parentId: rootUnitId ?? undefined,
      legalParentType: "yayasan",
      address: "Surabaya Barat",
      responsiblePerson: "Kepala Klinik",
      notes: "Unit karya kesehatan",
    },
  ];

  for (const unit of additionalUnits) {
    await db.insert(units).values(unit).onConflictDoNothing();
  }

  await db.execute(sql`
    ALTER TABLE "asset_locations" ADD COLUMN IF NOT EXISTS "location_kind" varchar(32) NOT NULL DEFAULT 'ruang'
  `);
  await db.execute(sql`
    UPDATE "asset_locations"
    SET "location_kind" = 'garasi_parkir'
    WHERE LOWER("name") LIKE '%garasi%'
       OR LOWER("name") LIKE '%parkir%'
  `);

  const existingUnits = await db.select().from(units);
  const unitIdByCode = new Map(existingUnits.map((unit) => [unit.code, unit.id]));

  const locationSeeds = [
    ["KEUSKUPAN-SBY", "Kantor Aset Keuskupan", "KUS-ASET", "ruang", "Lokasi administrasi dan arsip aset keuskupan."],
    ["KEUSKUPAN-SBY", "Gudang Arsip Properti", "KUS-ARSIP", "ruang", "Penyimpanan dokumen legal aset keuskupan."],
    ["KEUSKUPAN-SBY", "Pusat Layanan Pastoral", "KUS-PLP", "ruang", "Lokasi layanan dan operasional aset keuskupan."],
    ["PAROKI-KATEDRAL", "Ruang Sekretariat", "KAT-RS", "ruang", "Lokasi administrasi paroki."],
    ["PAROKI-KATEDRAL", "Aula Paroki", "KAT-AULA", "ruang", "Ruang kegiatan dan pertemuan."],
    ["PAROKI-KATEDRAL", "Garasi Paroki", "KAT-GAR", "garasi_parkir", "Lokasi parkir kendaraan operasional."],
    ["PAROKI-SANTO-YUSUP", "Ruang Inventaris", "SY-RI", "ruang", "Penyimpanan inventaris paroki."],
    ["PAROKI-SANTO-YUSUP", "Gudang Pastoran", "SY-GP", "ruang", "Gudang operasional pastoran."],
    ["SEKOLAH-SANTA-MARIA", "Ruang Tata Usaha", "SM-TU", "ruang", "Lokasi aset administrasi sekolah."],
    ["SEKOLAH-SANTA-MARIA", "Laboratorium", "SM-LAB", "ruang", "Lokasi aset pembelajaran."],
    ["KLINIK-BETHANIA", "Ruang Administrasi", "KB-ADM", "ruang", "Lokasi aset administrasi klinik."],
    ["KLINIK-BETHANIA", "Ruang Periksa", "KB-RP", "ruang", "Lokasi aset layanan kesehatan."],
  ] as const;

  for (const [unitCode, name, code, locationKind, description] of locationSeeds) {
    const unitId = unitIdByCode.get(unitCode);
    if (!unitId) continue;

    await db
      .insert(assetLocations)
      .values({ unitId, name, code, locationKind, description, isActive: true })
      .onConflictDoNothing();
  }

  await db
    .insert(badanHukums)
    .values({
      name: "Yayasan Contoh Keuskupan",
      type: "yayasan",
      field: "sosial",
      legalBasis: "Akta Pendirian",
      kemenkumhamNumber: "AHU-0000000.AH.01.01.TAHUN 2025",
      establishedAt: "2025-01-01",
      representative: "Uskup",
      status: "aktif",
      notes: "Data contoh awal",
    })
    .onConflictDoNothing();

  const additionalBadanHukums = [
    {
      name: "Yayasan Pendidikan Santa Maria",
      type: "yayasan",
      field: "pendidikan",
      legalBasis: "Akta Pendirian",
      kemenkumhamNumber: "AHU-0000001.AH.01.01.TAHUN 2025",
      establishedAt: "2025-01-01",
      representative: "Ketua Yayasan",
      status: "aktif",
      notes: "Badan hukum contoh untuk seed aset",
    },
    {
      name: "PT Sumber Berkat",
      type: "pt",
      field: "penyewaan aset",
      legalBasis: "Akta Pendirian",
      kemenkumhamNumber: "AHU-0000002.AH.01.01.TAHUN 2025",
      establishedAt: "2025-01-01",
      representative: "Direktur",
      status: "aktif",
      notes: "Badan hukum contoh untuk variasi relasi aset",
    },
  ];

  for (const badanHukum of additionalBadanHukums) {
    await db.insert(badanHukums).values(badanHukum).onConflictDoNothing();
  }

}

function seedRecordedAtFromAcquisition(acquisitionDate: string | null | Date, monthOffset = 0) {
  const base =
    acquisitionDate instanceof Date
      ? new Date(acquisitionDate)
      : acquisitionDate
        ? new Date(`${acquisitionDate}T08:00:00+07:00`)
        : new Date();

  if (monthOffset > 0) {
    base.setMonth(base.getMonth() + monthOffset);
  }

  return base;
}

function seedVariantIndex(seedKey: string, modulo: number) {
  let hash = 0;
  for (const char of seedKey) {
    hash = (hash + char.charCodeAt(0) * 17) % modulo;
  }
  return hash;
}

type HistoryStep<T> = {
  previous: T | null;
  next: T;
  notes: string;
  monthOffset: number;
};

function buildStatusHistorySteps(asset: {
  status: string;
  code: string;
  loanedTo: string | null;
}): HistoryStep<string>[] {
  const current = asset.status === "archived" ? "inactive" : asset.status;
  const variant = seedVariantIndex(asset.code, 2);
  const borrowerNote =
    (current === "on_loan" && asset.loanedTo
      ? buildStatusHistoryNote("on_loan", asset.loanedTo)
      : null) ?? "Dipinjamkan kepada unit paroki mitra";

  const paths: Record<string, Array<HistoryStep<string>[]>> = {
    active: [
      [
        { previous: null, next: "active", notes: "Pencatatan awal aset ke inventori", monthOffset: 0 },
        { previous: "active", next: "in_maintenance", notes: "Perawatan berkala", monthOffset: 6 },
        { previous: "in_maintenance", next: "active", notes: "Selesai perawatan, kembali operasional", monthOffset: 12 },
      ],
      [
        { previous: null, next: "active", notes: "Pencatatan awal aset ke inventori", monthOffset: 0 },
        { previous: "active", next: "on_loan", notes: borrowerNote, monthOffset: 4 },
        { previous: "on_loan", next: "active", notes: "Aset dikembalikan dan aktif kembali", monthOffset: 10 },
      ],
    ],
    inactive: [
      [
        { previous: null, next: "active", notes: "Pencatatan awal aset ke inventori", monthOffset: 0 },
        { previous: "active", next: "on_loan", notes: borrowerNote, monthOffset: 5 },
        { previous: "on_loan", next: "inactive", notes: "Aset tidak lagi dipinjamkan dan dinonaktifkan", monthOffset: 11 },
      ],
      [
        { previous: null, next: "active", notes: "Pencatatan awal aset ke inventori", monthOffset: 0 },
        { previous: "active", next: "in_maintenance", notes: "Perbaikan sebelum disimpan", monthOffset: 6 },
        { previous: "in_maintenance", next: "inactive", notes: "Aset disimpan dan tidak aktif dipakai", monthOffset: 12 },
      ],
    ],
    on_loan: [
      [
        { previous: null, next: "active", notes: "Pencatatan awal aset ke inventori", monthOffset: 0 },
        { previous: "active", next: "in_maintenance", notes: "Persiapan sebelum dipinjamkan", monthOffset: 4 },
        { previous: "in_maintenance", next: "on_loan", notes: borrowerNote, monthOffset: 8 },
      ],
      [
        { previous: null, next: "active", notes: "Pencatatan awal aset ke inventori", monthOffset: 0 },
        { previous: "active", next: "on_loan", notes: borrowerNote, monthOffset: 3 },
        { previous: "on_loan", next: "active", notes: "Aset dikembalikan sementara untuk perawatan ringan", monthOffset: 9 },
      ],
    ],
    in_maintenance: [
      [
        { previous: null, next: "active", notes: "Pencatatan awal aset ke inventori", monthOffset: 0 },
        { previous: "active", next: "on_loan", notes: borrowerNote, monthOffset: 5 },
        { previous: "on_loan", next: "in_maintenance", notes: "Aset dikembalikan dan masuk perawatan", monthOffset: 10 },
      ],
      [
        { previous: null, next: "active", notes: "Pencatatan awal aset ke inventori", monthOffset: 0 },
        { previous: "active", next: "in_maintenance", notes: "Mulai perawatan rutin", monthOffset: 6 },
        { previous: "in_maintenance", next: "in_maintenance", notes: "Perawatan diperpanjang menunggu suku cadang", monthOffset: 12 },
      ],
    ],
  };

  const selected = paths[current]?.[variant] ?? paths.active[variant];
  const lastStep = selected[selected.length - 1];
  if (lastStep.next !== current) {
    return [
      ...selected.slice(0, 2),
      {
        previous: selected[1].next,
        next: current,
        notes: "Penyesuaian status operasional terbaru",
        monthOffset: selected[2]?.monthOffset ?? 12,
      },
    ];
  }

  return selected;
}

function extractBorrowerFromStatusNote(notes: string) {
  if (notes.startsWith("Dipinjamkan kepada:")) {
    return notes.replace("Dipinjamkan kepada:", "").trim();
  }
  return null;
}

function buildLoanHistorySteps(
  asset: { loanedTo: string | null },
  statusSteps: HistoryStep<string>[]
): HistoryStep<string | null>[] {
  let currentLoanedTo: string | null = null;
  const steps: HistoryStep<string | null>[] = [];

  for (const step of statusSteps) {
    if (step.next === "on_loan") {
      const nextBorrower = extractBorrowerFromStatusNote(step.notes) ?? asset.loanedTo ?? "Unit paroki mitra";
      if (currentLoanedTo !== nextBorrower) {
        steps.push({
          previous: currentLoanedTo,
          next: nextBorrower,
          notes: step.notes,
          monthOffset: step.monthOffset,
        });
        currentLoanedTo = nextBorrower;
      }
      continue;
    }

    if (step.previous === "on_loan" && step.next !== "on_loan" && currentLoanedTo) {
      steps.push({
        previous: currentLoanedTo,
        next: null,
        notes: step.notes,
        monthOffset: step.monthOffset,
      });
      currentLoanedTo = null;
    }
  }

  return steps;
}

function getConditionScale(assetType: string): string[] {
  if (assetType === "bangunan") return [...buildingConditions];
  if (assetType === "kendaraan") return [...vehicleConditions];
  if (assetType === "benda") return [...itemConditions];
  return [];
}

function resolveSeedCondition(assetType: string, condition: string | null) {
  if (condition?.trim()) {
    return condition.trim();
  }

  if (assetType === "bangunan") return "sangat baik/terawat";
  if (assetType === "kendaraan") return "baik";
  if (assetType === "benda") return "baik";
  return "Tanah terpelihara";
}

function buildConditionHistorySteps(asset: {
  assetType: string;
  code: string;
  condition: string | null;
}): HistoryStep<string>[] {
  const current = resolveSeedCondition(asset.assetType, asset.condition);
  const variant = seedVariantIndex(`${asset.code}-condition`, 2);

  if (asset.assetType === "tanah") {
    const tanahPaths: Array<HistoryStep<string>[]> = [
      [
        { previous: null, next: "Tanah rata, siap pakai", notes: "Kondisi awal saat pencatatan", monthOffset: 0 },
        { previous: "Tanah rata, siap pakai", next: "Perlu perataan ulang area tertentu", notes: "Setelah penyesuaian drainase", monthOffset: 6 },
        { previous: "Perlu perataan ulang area tertentu", next: current, notes: "Kondisi fisik terkini setelah perawatan", monthOffset: 12 },
      ],
      [
        { previous: null, next: "Tanah terpelihara", notes: "Kondisi awal saat pencatatan", monthOffset: 0 },
        { previous: "Tanah terpelihara", next: "Bibir tanah berbatu di sisi utara", notes: "Setelah pemangkasan vegetasi", monthOffset: 5 },
        { previous: "Bibir tanah berbatu di sisi utara", next: current, notes: "Kondisi fisik terkini", monthOffset: 11 },
      ],
    ];

    return tanahPaths[variant];
  }

  const scale = getConditionScale(asset.assetType);
  const currentIndex = Math.max(0, scale.indexOf(current as (typeof scale)[number]));
  const firstIndex = Math.max(0, currentIndex - 2);
  const middleIndex =
    currentIndex > firstIndex ? currentIndex - 1 : Math.min(scale.length - 1, firstIndex + 1);
  const first = scale[firstIndex] ?? current;
  const middle = scale[middleIndex] ?? current;
  const last = scale[currentIndex] ?? current;

  const improvingPaths: Array<HistoryStep<string>[]> = [
    [
      { previous: null, next: first, notes: "Kondisi fisik saat pencatatan awal", monthOffset: 0 },
      { previous: first, next: middle, notes: "Penurunan kondisi setelah pemakaian", monthOffset: 6 },
      { previous: middle, next: last, notes: "Kondisi fisik terkini", monthOffset: 12 },
    ],
    [
      { previous: null, next: first, notes: "Kondisi fisik saat pencatatan awal", monthOffset: 0 },
      { previous: first, next: last, notes: "Perbaikan ringan sebelum digunakan kembali", monthOffset: 8 },
      { previous: last, next: last, notes: "Kondisi fisik terkini setelah inspeksi", monthOffset: 12 },
    ],
  ];

  const steps = improvingPaths[variant];
  const tail = steps[steps.length - 1];
  if (tail.next !== current) {
    return [
      ...steps.slice(0, 2),
      {
        previous: steps[1].next,
        next: current,
        notes: "Kondisi fisik terkini",
        monthOffset: 12,
      },
    ];
  }

  return steps;
}

async function seedAssetOperationalHistories(actorUserId: string | null) {
  const allAssets = await db.select().from(assets);

  for (const asset of allAssets) {
    const [statusCountRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(assetStatusHistories)
      .where(eq(assetStatusHistories.assetId, asset.id));

    if ((statusCountRow?.count ?? 0) < 3) {
      await db
        .delete(assetStatusHistories)
        .where(and(eq(assetStatusHistories.assetId, asset.id), eq(assetStatusHistories.source, "system")));

      const statusSteps = buildStatusHistorySteps(asset);
      for (const step of statusSteps) {
        await db.insert(assetStatusHistories).values({
          assetId: asset.id,
          previousStatus: step.previous,
          newStatus: step.next,
          recordedAt: seedRecordedAtFromAcquisition(asset.acquisitionDate, step.monthOffset),
          recordedByUserId: actorUserId,
          source: "system",
          notes: step.notes,
        });
      }
    }

    const [conditionCountRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(assetConditionHistories)
      .where(eq(assetConditionHistories.assetId, asset.id));

    if ((conditionCountRow?.count ?? 0) < 3) {
      await db
        .delete(assetConditionHistories)
        .where(and(eq(assetConditionHistories.assetId, asset.id), eq(assetConditionHistories.source, "system")));

      const conditionSteps = buildConditionHistorySteps(asset);
      for (const step of conditionSteps) {
        await db.insert(assetConditionHistories).values({
          assetId: asset.id,
          previousCondition: step.previous,
          newCondition: step.next,
          recordedAt: seedRecordedAtFromAcquisition(asset.acquisitionDate, step.monthOffset),
          recordedByUserId: actorUserId,
          source: "system",
          notes: step.notes,
        });
      }
    }

    const [systemLoanCountRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(assetLoanHistories)
      .where(and(eq(assetLoanHistories.assetId, asset.id), eq(assetLoanHistories.source, "system")));

    const statusSteps = buildStatusHistorySteps(asset);
    const loanSteps = buildLoanHistorySteps(asset, statusSteps);

    if (loanSteps.length > 0 && (systemLoanCountRow?.count ?? 0) < loanSteps.length) {
      await db
        .delete(assetLoanHistories)
        .where(and(eq(assetLoanHistories.assetId, asset.id), eq(assetLoanHistories.source, "system")));

      for (const step of loanSteps) {
        await db.insert(assetLoanHistories).values({
          assetId: asset.id,
          previousLoanedTo: step.previous,
          newLoanedTo: step.next,
          eventType: resolveLoanHistoryEventType(step.previous, step.next),
          recordedAt: seedRecordedAtFromAcquisition(asset.acquisitionDate, step.monthOffset),
          recordedByUserId: actorUserId,
          source: "system",
          notes: step.notes,
        });
      }
    }
  }
}

async function purgeAllAssetData() {
  await db.execute(sql`
    TRUNCATE TABLE
      asset_placement_histories,
      asset_loan_histories,
      asset_status_histories,
      asset_condition_histories,
      asset_disposals,
      tax_asset_depreciation,
      tax_asset_coretax,
      asset_building_lands,
      asset_organizations,
      asset_attachments,
      asset_land_details,
      asset_building_details,
      asset_vehicle_details,
      asset_item_details,
      assets
    RESTART IDENTITY CASCADE
  `);
}

async function seedAssets() {
  await purgeAllAssetData();

  await db.execute(sql`
    ALTER TABLE ${assetBuildingDetails} ADD COLUMN IF NOT EXISTS "building_category" varchar(32)
  `);

  const existingUnits = await db.select().from(units);
  const existingBadanHukums = await db.select().from(badanHukums);
  const existingUsers = await db.select().from(users);
  const existingLocations = await db.select().from(assetLocations);

  const unitIdByCode = new Map(existingUnits.map((unit) => [unit.code, unit.id]));
  const badanHukumIdByName = new Map(existingBadanHukums.map((badanHukum) => [badanHukum.name, badanHukum.id]));
  const userIdByEmail = new Map(existingUsers.map((user) => [user.email, user.id]));
  const locationIdsByUnitId = new Map<string, string[]>();

  for (const location of existingLocations) {
    const current = locationIdsByUnitId.get(location.unitId) ?? [];
    current.push(location.id);
    locationIdsByUnitId.set(location.unitId, current);
  }

  const pickLocationId = (unitId: string | null | undefined, index = 0) => {
    if (!unitId) return null;
    const locationIds = locationIdsByUnitId.get(unitId) ?? [];
    if (locationIds.length === 0) return null;
    return locationIds[index % locationIds.length];
  };

  const keuskupanId = unitIdByCode.get("KEUSKUPAN-SBY");
  const parokiId = unitIdByCode.get("PAROKI-KATEDRAL");
  const yayasanId = badanHukumIdByName.get("Yayasan Contoh Keuskupan");
  const adminAsetId = userIdByEmail.get("aset@siakas.local") ?? userIdByEmail.get("keuskupan@siakas.local");

  if (!keuskupanId || !parokiId || !yayasanId) return;

  const unitIds = ["PAROKI-KATEDRAL", "PAROKI-SANTO-YUSUP", "SEKOLAH-SANTA-MARIA", "KLINIK-BETHANIA"]
    .map((code) => unitIdByCode.get(code))
    .filter(Boolean) as string[];
  const badanHukumIds = ["Yayasan Contoh Keuskupan", "Yayasan Pendidikan Santa Maria", "PT Sumber Berkat"]
    .map((name) => badanHukumIdByName.get(name))
    .filter(Boolean) as string[];

  const assetSeeds: Array<{
    asset: Record<string, string | number | null>;
    detail: "land" | "building" | "vehicle" | "item";
    detailValues: Record<string, unknown>;
    financedByUnitId?: string | null;
    financedByBadanHukumId?: string | null;
  }> = [
    {
      asset: {
        code: "AST-TNH-0001",
        name: "Tanah Pastoran Katedral",
        assetType: "tanah",
        ownershipLevel: "keuskupan",
        unitId: parokiId,
        badanHukumId: null,
        locationId: pickLocationId(parokiId, 0),
        acquisitionDate: "2018-04-12",
        acquisitionValue: "3500000000",
        legalStatus: "sertifikat lengkap",
        ownerName: "Keuskupan Surabaya",
        condition: "sangat baik/terawat",
        status: "active",
        notes: "Contoh aset tanah.",
      },
      detail: "land" as const,
      detailValues: {
        address: "Jl. Polisi Istimewa, Surabaya",
        areaSquareMeters: "2400",
        certificateType: "SHM",
        certificateNumber: "SHM-1122/SBY",
        certificateHolderName: "Keuskupan Surabaya",
        certificateIssuedAt: "2018-04-12",
        certificateExpiredAt: null,
        issuingInstitution: "BPN Surabaya",
        legalOwnerType: "Keuskupan Surabaya (Pusat)",
        actualOwnerName: "Keuskupan Surabaya",
        lastNjopValue: "2800000000",
        appraisalValue: "3600000000",
        appraisalDate: "2025-01-10",
        nopPbb: "35.78.010.001.001-0001.0",
        boundaryNorth: "Jalan lingkungan",
        boundarySouth: "Bangunan paroki",
        boundaryEast: "Permukiman",
        boundaryWest: "Area parkir",
        latitude: "-7.2812345",
        longitude: "112.7423456",
        landUse: "Tempat ibadah/pastoral",
        acquisitionMethod: "hibah/donasi umat",
        disputeStatus: "aman/tidak ada sengketa",
        notes: "Data contoh untuk laporan tanah.",
      },
    },
    {
      asset: {
        code: "AST-BGN-0001",
        name: "Gedung Aula Paroki Katedral",
        assetType: "bangunan",
        ownershipLevel: "keuskupan",
        unitId: parokiId,
        badanHukumId: null,
        locationId: pickLocationId(parokiId, 1),
        acquisitionDate: "2020-08-20",
        acquisitionValue: "1750000000",
        legalStatus: "izin lengkap",
        ownerName: "Keuskupan Surabaya",
        condition: "sangat baik/terawat",
        status: "active",
        notes: "Contoh aset bangunan.",
      },
      detail: "building" as const,
      detailValues: {
        address: "Kompleks Paroki Katedral, Surabaya",
        buildingCategory: "permanent",
        buildingType: "Aula",
        acquisitionMethod: "pembangunan sendiri",
        disputeStatus: "aman/tidak ada sengketa",
        buildingAreaSquareMeters: "850",
        floorCount: 2,
        constructionYear: 2020,
        lastRenovationYear: 2024,
        structureType: "Beton bertulang",
        footprintAreaSquareMeters: "500",
        permitType: "PBG/IMB",
        permitNumber: "PBG-2020-0091",
        permitIssuedAt: "2020-07-01",
        permitExpiredAt: null,
        permitIssuer: "Pemkot Surabaya",
        slfNumber: "SLF-2024-0012",
        slfIssuedAt: "2024-02-01",
        slfExpiredAt: "2029-02-01",
        leaseAgreementDocument: null,
        electricityCapacity: "23000 VA",
        waterSource: "PDAM",
        parkingCapacity: "40 mobil",
        facilities: "Ruang pertemuan, panggung, sound system",
        latitude: "-7.2811111",
        longitude: "112.7421111",
        notes: "Data contoh untuk laporan bangunan.",
      },
    },
    {
      asset: {
        code: "AST-KEND-0001",
        name: "Toyota Avanza Operasional",
        assetType: "kendaraan",
        ownershipLevel: "keuskupan",
        unitId: parokiId,
        badanHukumId: null,
        locationId: pickLocationId(parokiId, 2),
        acquisitionDate: "2025-01-15",
        acquisitionValue: "250000000",
        legalStatus: "bpkb_atas_nama_yayasan",
        ownerName: "Yayasan Contoh Keuskupan",
        condition: "baik",
        status: "active",
        notes: "Contoh aset kendaraan.",
      },
      detail: "vehicle" as const,
      detailValues: {
        vehicleCategory: "KND-R4",
        brand: "Toyota",
        model: "Avanza",
        manufactureYear: 2024,
        color: "Putih",
        plateNumber: "L 1234 KS",
        chassisNumber: "MHKM1BA3JPK000001",
        engineNumber: "1NRX000001",
        stnkNumber: "STNK-AVZ-0001",
        bpkbNumber: "BPKB-AVZ-0001",
        documentCompletenessStatus: "lengkap",
        stnkIssuedAt: "2025-01-20",
        stnkExpiredAt: "2030-01-20",
        lastTaxPaidAt: "2026-01-10",
        taxDueAt: "2027-01-20",
        taxStatus: "aktif",
        issuingInstitution: "Samsat Surabaya",
        registeredOwnerName: "Yayasan Contoh Keuskupan",
        insurancePolicyNumber: "INS-AVZ-0001",
        insuranceValidUntil: "2027-01-15",
        domicileLocation: "Garasi Paroki Katedral",
        condition: "baik",
        operationalStatus: "digunakan",
        notes: "Data contoh untuk laporan kendaraan.",
      },
    },
    {
      asset: {
        code: "AST-KEND-LOAN-01",
        name: "Honda Beat Pinjaman Paroki",
        assetType: "kendaraan",
        ownershipLevel: "keuskupan",
        unitId: parokiId,
        badanHukumId: null,
        locationId: pickLocationId(parokiId, 3),
        acquisitionDate: "2023-03-10",
        acquisitionValue: "22000000",
        legalStatus: "bpkb_atas_nama_yayasan",
        ownerName: "Yayasan Contoh Keuskupan",
        condition: "baik",
        status: "on_loan",
        loanedTo: "Paroki Santo Yusup",
        notes: "Contoh aset kendaraan sedang dipinjamkan.",
      },
      detail: "vehicle" as const,
      detailValues: {
        vehicleCategory: "KND-R2",
        brand: "Honda",
        model: "Beat",
        manufactureYear: 2022,
        color: "Hitam",
        plateNumber: "L 5678 KS",
        chassisNumber: "MH1JM8120PK000002",
        engineNumber: "JM82E2000002",
        stnkNumber: "STNK-BEAT-0002",
        bpkbNumber: "BPKB-BEAT-0002",
        documentCompletenessStatus: "lengkap",
        stnkIssuedAt: "2023-03-15",
        stnkExpiredAt: "2028-03-15",
        lastTaxPaidAt: "2026-01-10",
        taxDueAt: "2027-03-15",
        taxStatus: "aktif",
        issuingInstitution: "Samsat Surabaya",
        registeredOwnerName: "Yayasan Contoh Keuskupan",
        insurancePolicyNumber: "INS-BEAT-0002",
        insuranceValidUntil: "2027-03-10",
        domicileLocation: "Paroki Santo Yusup",
        condition: "baik",
        operationalStatus: "dipinjamkan",
        notes: "Sedang dipinjamkan ke paroki mitra.",
      },
    },
    {
      asset: {
        code: "AST-BND-0001",
        name: "Laptop Inventaris Sekretariat",
        assetType: "benda",
        ownershipLevel: "badan_hukum",
        unitId: null,
        badanHukumId: yayasanId,
        locationId: null,
        acquisitionDate: "2024-11-05",
        acquisitionValue: "18000000",
        legalStatus: "milik sendiri",
        ownerName: "Yayasan Contoh Keuskupan",
        condition: "sangat baik",
        status: "active",
        notes: "Contoh aset benda.",
      },
      detail: "item" as const,
      detailValues: {
        itemCategory: "KTR-UMUM",
        description: "Laptop untuk administrasi sekretariat.",
        brand: "Lenovo",
        model: "ThinkPad E14",
        serialNumber: "LEN-E14-0001",
        quantity: "1",
        unit: "unit",
        storageLocation: "Ruang Sekretariat Yayasan",
        responsiblePerson: "Admin Badan Hukum",
        evidenceDocumentNumber: "INV-2024-1105",
        evidenceDocumentDate: "2024-11-05",
        evidenceIssuer: "Toko Komputer Surabaya",
        evidenceRegisteredName: "Yayasan Contoh Keuskupan",
        documentStatus: "lengkap",
        condition: "sangat baik",
        notes: "Data contoh untuk laporan benda.",
      },
    },
  ];

  const conditions = ["sangat baik/terawat", "baik", "cukup", "rusak ringan"];
  const vehicleConditions = ["sangat baik", "baik", "cukup", "rusak ringan"];
  const itemConditions = ["baru", "sangat baik", "baik", "cukup", "rusak"];
  const statuses = ["active", "active", "active", "inactive"];
  const landUses = ["Tempat ibadah/pastoral", "Pendidikan", "Kesehatan", "Tanah kosong/idle", "Pastoran"];
  const buildingTypes = ["Aula", "Ruang kelas", "Klinik", "Pastoran", "Kantor"];
  const vehicleBrands = [
    ["Toyota", "Avanza"],
    ["Daihatsu", "Gran Max"],
    ["Honda", "Beat"],
    ["Mitsubishi", "L300"],
    ["Suzuki", "Ertiga"],
  ];
  const itemCatalog = assetItemCategories.flatMap((category) =>
    category.examples.slice(0, 5).map((itemName, exampleIndex) => ({
      category: category.code,
      itemName,
      brand: category.code,
      model: `${category.depreciationGroupLabel.replace(" ", "-")}-${exampleIndex + 1}`,
    }))
  );


  const surabayaLandSeeds = [
    { code: "AST-TNH-SBY-0001", name: "Tanah Kantor Keuskupan Darmo", address: "Jl. Raya Darmo, Surabaya", areaSquareMeters: "2650", certificateNumber: "SHM-SBY-0001", acquisitionDate: "2016-03-15", acquisitionValue: "4200000000", lastNjopValue: "3650000000", appraisalValue: "4200000000", nopPbb: "35.78.001.001.1001-0001.0", latitude: "-7.2896500", longitude: "112.7348200", landUse: "Kantor dan pelayanan pastoral", acquisitionMethod: "pembelian/transaksi komersial", locationIndex: 0, boundaryPatokCoordinates: [{ label: "Patok 1", lat: -7.2898100, lng: 112.7346600 }, { label: "Patok 2", lat: -7.2898100, lng: 112.7349800 }, { label: "Patok 3", lat: -7.2894900, lng: 112.7349800 }, { label: "Patok 4", lat: -7.2894900, lng: 112.7346600 }] },
    { code: "AST-TNH-SBY-0002", name: "Tanah Pastoral Manyar", address: "Jl. Manyar Kertoarjo, Surabaya", areaSquareMeters: "1980", certificateNumber: "SHM-SBY-0002", acquisitionDate: "2017-06-21", acquisitionValue: "3100000000", lastNjopValue: "2740000000", appraisalValue: "3250000000", nopPbb: "35.78.002.001.1002-0001.0", latitude: "-7.2759800", longitude: "112.7792400", landUse: "Pelayanan pastoral", acquisitionMethod: "hibah/donasi umat", locationIndex: 1, boundaryPatokCoordinates: [{ label: "Patok 1", lat: -7.2761300, lng: 112.7790700 }, { label: "Patok 2", lat: -7.2761300, lng: 112.7794100 }, { label: "Patok 3", lat: -7.2758300, lng: 112.7794100 }, { label: "Patok 4", lat: -7.2758300, lng: 112.7790700 }] },
    { code: "AST-TNH-SBY-0003", name: "Tanah Pendidikan Rungkut", address: "Jl. Rungkut Madya, Surabaya", areaSquareMeters: "2300", certificateNumber: "SHM-SBY-0003", acquisitionDate: "2018-09-10", acquisitionValue: "3550000000", lastNjopValue: "3010000000", appraisalValue: "3590000000", nopPbb: "35.78.003.001.1003-0001.0", latitude: "-7.3184200", longitude: "112.7811500", landUse: "Pendidikan", acquisitionMethod: "pembelian/transaksi komersial", locationIndex: 2, boundaryPatokCoordinates: [{ label: "Patok 1", lat: -7.3185900, lng: 112.7809700 }, { label: "Patok 2", lat: -7.3185900, lng: 112.7813300 }, { label: "Patok 3", lat: -7.3182500, lng: 112.7813300 }, { label: "Patok 4", lat: -7.3182500, lng: 112.7809700 }] },
    { code: "AST-TNH-SBY-0004", name: "Tanah Sosial Wiyung", address: "Jl. Raya Wiyung, Surabaya", areaSquareMeters: "1760", certificateNumber: "SHM-SBY-0004", acquisitionDate: "2019-11-05", acquisitionValue: "2875000000", lastNjopValue: "2510000000", appraisalValue: "2960000000", nopPbb: "35.78.004.001.1004-0001.0", latitude: "-7.3098700", longitude: "112.6884300", landUse: "Kegiatan sosial dan pelayanan", acquisitionMethod: "hibah/donasi umat", locationIndex: 0, boundaryPatokCoordinates: [{ label: "Patok 1", lat: -7.3100200, lng: 112.6882600 }, { label: "Patok 2", lat: -7.3100200, lng: 112.6886000 }, { label: "Patok 3", lat: -7.3097200, lng: 112.6886000 }, { label: "Patok 4", lat: -7.3097200, lng: 112.6882600 }] },
    { code: "AST-TNH-SBY-0005", name: "Tanah Retret Lakarsantri", address: "Jl. Lakarsantri, Surabaya", areaSquareMeters: "2140", certificateNumber: "SHM-SBY-0005", acquisitionDate: "2021-02-18", acquisitionValue: "2680000000", lastNjopValue: "2250000000", appraisalValue: "2750000000", nopPbb: "35.78.005.001.1005-0001.0", latitude: "-7.2975600", longitude: "112.6539800", landUse: "Retret dan pembinaan", acquisitionMethod: "pembelian/transaksi komersial", locationIndex: 1, boundaryPatokCoordinates: [{ label: "Patok 1", lat: -7.2977200, lng: 112.6538000 }, { label: "Patok 2", lat: -7.2977200, lng: 112.6541600 }, { label: "Patok 3", lat: -7.2974000, lng: 112.6541600 }, { label: "Patok 4", lat: -7.2974000, lng: 112.6538000 }] },
  ];

  const surabayaBuildingSeeds = [
    { code: "AST-BGN-SBY-0001", name: "Gedung Pusat Administrasi Keuskupan", address: "Jl. Raya Darmo, Surabaya", buildingType: "Kantor", acquisitionDate: "2020-08-20", acquisitionValue: "4850000000", buildingAreaSquareMeters: "1250", footprintAreaSquareMeters: "540", floorCount: 3, constructionYear: 2020, lastRenovationYear: 2024, permitNumber: "PBG-SBY-1001", slfNumber: "SLF-SBY-1001", slfExpiredAt: "2029-08-01", electricityCapacity: "33000 VA", parkingCapacity: "28 mobil", facilities: "Ruang kerja, arsip, rapat, kapel kecil", latitude: "-7.2894800", longitude: "112.7349600", locationIndex: 0 },
    { code: "AST-BGN-SBY-0002", name: "Gedung Pastoral Keluarga Kudus Manyar", address: "Jl. Manyar Kertoarjo, Surabaya", buildingType: "Aula", acquisitionDate: "2019-04-11", acquisitionValue: "2625000000", buildingAreaSquareMeters: "780", footprintAreaSquareMeters: "430", floorCount: 2, constructionYear: 2019, lastRenovationYear: 2023, permitNumber: "PBG-SBY-1002", slfNumber: "SLF-SBY-1002", slfExpiredAt: "2028-04-01", electricityCapacity: "22000 VA", parkingCapacity: "18 mobil", facilities: "Ruang konseling, aula, kantor kecil", latitude: "-7.2762200", longitude: "112.7795100", locationIndex: 1 },
    { code: "AST-BGN-SBY-0003", name: "Gedung Pendidikan Santa Maria Rungkut", address: "Jl. Rungkut Madya, Surabaya", buildingType: "Ruang kelas", acquisitionDate: "2021-07-09", acquisitionValue: "3980000000", buildingAreaSquareMeters: "990", footprintAreaSquareMeters: "410", floorCount: 3, constructionYear: 2021, lastRenovationYear: 2024, permitNumber: "PBG-SBY-1003", slfNumber: "SLF-SBY-1003", slfExpiredAt: "2030-07-01", electricityCapacity: "27000 VA", parkingCapacity: "24 mobil", facilities: "Kelas, perpustakaan, ruang guru, multimedia", latitude: "-7.3181000", longitude: "112.7809400", locationIndex: 2 },
    { code: "AST-BGN-SBY-0004", name: "Gedung Klinik Santo Lukas Wiyung", address: "Jl. Raya Wiyung, Surabaya", buildingType: "Klinik", acquisitionDate: "2018-12-03", acquisitionValue: "2450000000", buildingAreaSquareMeters: "640", footprintAreaSquareMeters: "360", floorCount: 2, constructionYear: 2018, lastRenovationYear: 2022, permitNumber: "PBG-SBY-1004", slfNumber: "SLF-SBY-1004", slfExpiredAt: "2027-11-20", electricityCapacity: "16500 VA", parkingCapacity: "12 mobil", facilities: "Ruang periksa, farmasi, administrasi, ruang tunggu", latitude: "-7.3095200", longitude: "112.6887500", locationIndex: 0 },
    { code: "AST-BGN-SBY-0005", name: "Gedung Rumah Retret Lakarsantri", address: "Jl. Lakarsantri, Surabaya", buildingType: "Pastoran", acquisitionDate: "2022-05-17", acquisitionValue: "3180000000", buildingAreaSquareMeters: "860", footprintAreaSquareMeters: "470", floorCount: 2, constructionYear: 2022, lastRenovationYear: 2024, permitNumber: "PBG-SBY-1005", slfNumber: "SLF-SBY-1005", slfExpiredAt: "2031-05-05", electricityCapacity: "23000 VA", parkingCapacity: "16 mobil", facilities: "Kamar retret, aula kecil, dapur, ruang doa", latitude: "-7.2979100", longitude: "112.6543200", locationIndex: 1 },
  ];

  for (const seed of surabayaLandSeeds) {
    assetSeeds.push({
      asset: {
        code: seed.code,
        name: seed.name,
        assetType: "tanah",
        ownershipLevel: "keuskupan",
        unitId: keuskupanId,
        badanHukumId: null,
        locationId: pickLocationId(keuskupanId, seed.locationIndex),
        acquisitionDate: seed.acquisitionDate,
        acquisitionValue: seed.acquisitionValue,
        legalStatus: "sertifikat lengkap",
        ownerName: "Keuskupan Surabaya",
        condition: "sangat baik/terawat",
        status: "active",
        notes: "Seed tambahan tanah Surabaya untuk unit keuskupan.",
      },
      detail: "land",
      financedByUnitId: keuskupanId,
      detailValues: {
        address: seed.address,
        areaSquareMeters: seed.areaSquareMeters,
        certificateType: "SHM",
        certificateNumber: seed.certificateNumber,
        certificateHolderName: "Keuskupan Surabaya",
        certificateIssuedAt: seed.acquisitionDate,
        certificateExpiredAt: null,
        issuingInstitution: "BPN Kota Surabaya",
        legalOwnerType: "Keuskupan Surabaya (Pusat)",
        actualOwnerName: "Keuskupan Surabaya",
        lastNjopValue: seed.lastNjopValue,
        appraisalValue: seed.appraisalValue,
        appraisalDate: "2025-01-12",
        nopPbb: seed.nopPbb,
        boundaryNorth: "Jalan lingkungan",
        boundarySouth: "Permukiman",
        boundaryEast: "Fasilitas kota",
        boundaryWest: "Bangunan penunjang",
        boundaryPatokCoordinates: seed.boundaryPatokCoordinates,
        latitude: seed.latitude,
        longitude: seed.longitude,
        landUse: seed.landUse,
        acquisitionMethod: seed.acquisitionMethod,
        disputeStatus: "aman/tidak ada sengketa",
        notes: "Koordinat berada di wilayah Surabaya.",
      },
    });
  }

  for (const seed of surabayaBuildingSeeds) {
    assetSeeds.push({
      asset: {
        code: seed.code,
        name: seed.name,
        assetType: "bangunan",
        ownershipLevel: "keuskupan",
        unitId: keuskupanId,
        badanHukumId: null,
        locationId: pickLocationId(keuskupanId, seed.locationIndex),
        acquisitionDate: seed.acquisitionDate,
        acquisitionValue: seed.acquisitionValue,
        legalStatus: "izin lengkap",
        ownerName: "Keuskupan Surabaya",
        condition: "sangat baik/terawat",
        status: "active",
        notes: "Seed tambahan bangunan Surabaya untuk unit keuskupan.",
      },
      detail: "building",
      financedByUnitId: keuskupanId,
      detailValues: {
        address: seed.address,
        buildingCategory: "permanent",
        buildingType: seed.buildingType,
        acquisitionMethod: "pembangunan sendiri",
        disputeStatus: "aman/tidak ada sengketa",
        buildingAreaSquareMeters: seed.buildingAreaSquareMeters,
        floorCount: seed.floorCount,
        constructionYear: seed.constructionYear,
        lastRenovationYear: seed.lastRenovationYear,
        structureType: "Beton bertulang",
        footprintAreaSquareMeters: seed.footprintAreaSquareMeters,
        permitType: "PBG/IMB",
        permitNumber: seed.permitNumber,
        permitIssuedAt: seed.acquisitionDate,
        permitExpiredAt: null,
        permitIssuer: "Pemkot Surabaya",
        slfNumber: seed.slfNumber,
        slfIssuedAt: seed.acquisitionDate,
        slfExpiredAt: seed.slfExpiredAt,
        leaseAgreementDocument: null,
        electricityCapacity: seed.electricityCapacity,
        waterSource: "PDAM",
        parkingCapacity: seed.parkingCapacity,
        facilities: seed.facilities,
        latitude: seed.latitude,
        longitude: seed.longitude,
        notes: "Koordinat berada di wilayah Surabaya.",
      },
    });
  }

  for (let index = 2; index <= 13; index += 1) {
    const unitId = unitIds[index % unitIds.length] ?? parokiId;
    const financedByBadanHukumId = badanHukumIds[index % badanHukumIds.length] ?? yayasanId;
    const area = 700 + index * 125;

    assetSeeds.push({
      asset: {
        code: `AST-TNH-${String(index).padStart(4, "0")}`,
        name: `Tanah Unit ${index}`,
        assetType: "tanah",
        ownershipLevel: index % 4 === 0 ? "badan_hukum" : "keuskupan",
        unitId: index % 4 === 0 ? null : unitId,
        badanHukumId: index % 4 === 0 ? financedByBadanHukumId : null,
        locationId: index % 4 === 0 ? null : pickLocationId(unitId, index),
        acquisitionDate: `20${10 + (index % 10)}-0${(index % 9) + 1}-12`,
        acquisitionValue: String(900000000 + index * 185000000),
        legalStatus: index % 6 === 0 ? "sertifikat proses balik nama" : "sertifikat lengkap",
        ownerName: index % 4 === 0 ? "Yayasan Pendidikan Santa Maria" : "Keuskupan Surabaya",
        condition: conditions[index % conditions.length],
        status: statuses[index % statuses.length],
        notes: "Seed tanah tambahan.",
      },
      detail: "land",
      financedByBadanHukumId,
      detailValues: {
        address: `Alamat tanah contoh ${index}, Surabaya`,
        areaSquareMeters: String(area),
        certificateType: index % 5 === 0 ? "SHGB" : "SHM",
        certificateNumber: `SHM-${String(index).padStart(4, "0")}/SBY`,
        certificateHolderName: index % 4 === 0 ? "Yayasan Pendidikan Santa Maria" : "Keuskupan Surabaya",
        certificateIssuedAt: `20${10 + (index % 10)}-03-10`,
        certificateExpiredAt: index % 5 === 0 ? `20${30 + (index % 10)}-03-10` : null,
        issuingInstitution: "BPN Surabaya",
        legalOwnerType: index % 4 === 0 ? "Yayasan Keuskupan" : "Keuskupan Surabaya (Pusat)",
        actualOwnerName: index % 4 === 0 ? "Yayasan Pendidikan Santa Maria" : "Keuskupan Surabaya",
        lastNjopValue: String(700000000 + index * 150000000),
        appraisalValue: String(950000000 + index * 190000000),
        appraisalDate: "2025-01-10",
        nopPbb: `35.78.010.001.${String(index).padStart(4, "0")}-0001.0`,
        boundaryNorth: "Jalan lingkungan",
        boundarySouth: "Permukiman",
        boundaryEast: "Fasilitas umum",
        boundaryWest: "Area terbuka",
        latitude: String(-7.2 - index / 1000),
        longitude: String(112.7 + index / 1000),
        landUse: landUses[index % landUses.length],
        acquisitionMethod: index % 3 === 0 ? "pembelian/transaksi komersial" : "hibah/donasi umat",
        disputeStatus: index % 11 === 0 ? "dalam sengketa hukum/pengadilan" : "aman/tidak ada sengketa",
        notes: "Seed laporan tanah.",
      },
    });
  }

  for (let index = 2; index <= 13; index += 1) {
    const unitId = unitIds[index % unitIds.length] ?? parokiId;
    const financedByUnitId = unitIds[(index + 1) % unitIds.length] ?? keuskupanId;
    const area = 180 + index * 55;

    assetSeeds.push({
      asset: {
        code: `AST-BGN-${String(index).padStart(4, "0")}`,
        name: `Bangunan Fasilitas ${index}`,
        assetType: "bangunan",
        ownershipLevel: "keuskupan",
        unitId,
        badanHukumId: null,
        locationId: pickLocationId(unitId, index),
        acquisitionDate: `20${12 + (index % 10)}-0${(index % 9) + 1}-20`,
        acquisitionValue: String(450000000 + index * 125000000),
        legalStatus: index % 5 === 0 ? "izin perlu pembaruan" : "izin lengkap",
        ownerName: "Keuskupan Surabaya",
        condition: conditions[index % conditions.length],
        status: statuses[(index + 1) % statuses.length],
        notes: "Seed bangunan tambahan.",
      },
      detail: "building",
      financedByUnitId,
      detailValues: {
        address: `Kompleks unit contoh ${index}, Surabaya`,
        buildingCategory: "permanent",
        buildingType: buildingTypes[index % buildingTypes.length],
        acquisitionMethod: index % 2 === 0 ? "pembangunan sendiri" : "hibah/donasi umat",
        disputeStatus: index % 10 === 0 ? "dalam sengketa hukum/pengadilan" : "aman/tidak ada sengketa",
        buildingAreaSquareMeters: String(area),
        floorCount: (index % 3) + 1,
        constructionYear: 2008 + index,
        lastRenovationYear: index % 4 === 0 ? 2024 : 2020 + (index % 5),
        structureType: index % 2 === 0 ? "Beton bertulang" : "Baja ringan",
        footprintAreaSquareMeters: String(Math.round(area * 0.7)),
        permitType: "PBG/IMB",
        permitNumber: index % 5 === 0 ? null : `PBG-20${12 + (index % 10)}-${String(index).padStart(4, "0")}`,
        permitIssuedAt: `20${12 + (index % 10)}-02-01`,
        permitExpiredAt: index % 4 === 0 ? `20${28 + (index % 5)}-02-01` : null,
        permitIssuer: "Pemkot Surabaya",
        slfNumber: index % 3 === 0 ? null : `SLF-${String(index).padStart(4, "0")}`,
        slfIssuedAt: index % 3 === 0 ? null : "2024-01-15",
        slfExpiredAt: index % 3 === 0 ? null : "2029-01-15",
        leaseAgreementDocument: null,
        electricityCapacity: `${6600 + index * 1200} VA`,
        waterSource: index % 2 === 0 ? "PDAM" : "Sumur",
        parkingCapacity: `${10 + index} mobil`,
        facilities: "Ruang kerja, gudang, toilet",
        latitude: String(-7.23 - index / 1000),
        longitude: String(112.72 + index / 1000),
        notes: "Seed laporan bangunan.",
      },
    });
  }

  for (let index = 2; index <= 17; index += 1) {
    const unitId = unitIds[index % unitIds.length] ?? parokiId;
    const [brand, model] = vehicleBrands[index % vehicleBrands.length];
    const year = 2010 + (index % 15);

    assetSeeds.push({
      asset: {
        code: `AST-KEND-${String(index).padStart(4, "0")}`,
        name: `${brand} ${model} ${index}`,
        assetType: "kendaraan",
        ownershipLevel: index % 5 === 0 ? "badan_hukum" : "keuskupan",
        unitId: index % 5 === 0 ? null : unitId,
        badanHukumId: index % 5 === 0 ? badanHukumIds[index % badanHukumIds.length] ?? yayasanId : null,
        locationId: index % 5 === 0 ? null : pickLocationId(unitId, index),
        acquisitionDate: `${year}-06-15`,
        acquisitionValue: String(35000000 + index * 17000000),
        legalStatus: index % 4 === 0 ? "bpkb atas nama pihak terkait" : "bpkb_atas_nama_yayasan",
        ownerName: index % 5 === 0 ? "Yayasan Contoh Keuskupan" : "Keuskupan Surabaya",
        condition: vehicleConditions[index % vehicleConditions.length],
        status: statuses[index % statuses.length],
        notes: "Seed kendaraan tambahan.",
      },
      detail: "vehicle",
      financedByUnitId: keuskupanId ?? null,
      detailValues: {
        vehicleCategory: index % 3 === 0 ? "KND-R2" : "KND-R4",
        brand,
        model,
        manufactureYear: year,
        color: index % 2 === 0 ? "Putih" : "Hitam",
        plateNumber: `L ${1200 + index} KS`,
        chassisNumber: `CHS-${String(index).padStart(6, "0")}`,
        engineNumber: `ENG-${String(index).padStart(6, "0")}`,
        stnkNumber: `STNK-${String(index).padStart(4, "0")}`,
        bpkbNumber: index % 6 === 0 ? null : `BPKB-${String(index).padStart(4, "0")}`,
        documentCompletenessStatus: index % 6 === 0 ? "belum lengkap" : "lengkap",
        stnkIssuedAt: `${year + 1}-01-20`,
        stnkExpiredAt: `${2027 + (index % 5)}-01-20`,
        lastTaxPaidAt: "2026-01-10",
        taxDueAt: `${2027 + (index % 3)}-01-20`,
        taxStatus: index % 5 === 0 ? "jatuh tempo" : "aktif",
        issuingInstitution: "Samsat Surabaya",
        registeredOwnerName: index % 5 === 0 ? "Yayasan Contoh Keuskupan" : "Keuskupan Surabaya",
        insurancePolicyNumber: index % 4 === 0 ? null : `INS-${String(index).padStart(4, "0")}`,
        insuranceValidUntil: index % 4 === 0 ? null : `${2027 + (index % 3)}-01-15`,
        domicileLocation: `Garasi unit ${index}`,
        condition: vehicleConditions[index % vehicleConditions.length],
        operationalStatus: index % 7 === 0 ? "tidak digunakan" : "digunakan",
        notes: "Seed laporan kendaraan.",
      },
    });
  }

  for (let index = 2; index <= itemCatalog.length + 1; index += 1) {
    const unitId = unitIds[index % unitIds.length] ?? parokiId;
    const { category, itemName, brand, model } = itemCatalog[index - 2];
    const normalizedItemName = itemName
      .split(" ")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

    assetSeeds.push({
      asset: {
        code: `AST-BND-${category}-${String(index - 1).padStart(4, "0")}`,
        name: `${normalizedItemName} ${category}`,
        assetType: "benda",
        ownershipLevel: index % 4 === 0 ? "badan_hukum" : "keuskupan",
        unitId: index % 4 === 0 ? null : unitId,
        badanHukumId: index % 4 === 0 ? badanHukumIds[index % badanHukumIds.length] ?? yayasanId : null,
        locationId: index % 4 === 0 ? null : pickLocationId(unitId, index),
        acquisitionDate: `202${index % 6}-0${(index % 9) + 1}-05`,
        acquisitionValue: String(3000000 + index * 1250000),
        legalStatus: index % 6 === 0 ? "bukti pembelian belum lengkap" : "milik sendiri",
        ownerName: index % 4 === 0 ? "Yayasan Contoh Keuskupan" : "Keuskupan Surabaya",
        condition: itemConditions[index % itemConditions.length],
        status: statuses[(index + 2) % statuses.length],
        notes: "Seed benda tambahan.",
      },
      detail: "item",
      financedByBadanHukumId: badanHukumIds[(index + 1) % badanHukumIds.length] ?? yayasanId,
      detailValues: {
        itemCategory: category,
        description: `${normalizedItemName} untuk kategori ${category}.`,
        brand,
        model,
        serialNumber: index % 8 === 0 ? null : `SN-${brand.toUpperCase()}-${String(index).padStart(4, "0")}`,
        quantity: String((index % 5) + 1),
        unit: "unit",
        storageLocation: `Ruang inventaris ${index % 6}`,
        responsiblePerson: index % 3 === 0 ? "Admin Unit" : "Petugas Inventaris",
        evidenceDocumentNumber: index % 6 === 0 ? null : `INV-202${index % 6}-${String(index).padStart(4, "0")}`,
        evidenceDocumentDate: `202${index % 6}-0${(index % 9) + 1}-05`,
        evidenceIssuer: "Vendor Surabaya",
        evidenceRegisteredName: index % 4 === 0 ? "Yayasan Contoh Keuskupan" : "Keuskupan Surabaya",
        documentStatus: index % 6 === 0 ? "belum lengkap" : "lengkap",
        condition: itemConditions[index % itemConditions.length],
        notes: "Seed laporan benda.",
      },
    });
  }

  for (const seed of assetSeeds) {
    await db.insert(assets).values(seed.asset as unknown as typeof assets.$inferInsert).onConflictDoNothing();
  }

  const seededAssets = await db.select().from(assets);
  const assetIdByCode = new Map(seededAssets.map((asset) => [asset.code, asset.id]));

  for (const seed of assetSeeds) {
    const assetId = assetIdByCode.get(String(seed.asset.code));
    if (!assetId) continue;

    await db
      .update(assets)
      .set({ locationId: seed.asset.locationId as string | null })
      .where(eq(assets.id, assetId));

    if (seed.detail === "land") {
      await db.insert(assetLandDetails).values({ assetId, ...seed.detailValues } as unknown as typeof assetLandDetails.$inferInsert).onConflictDoNothing();
    }
    if (seed.detail === "building") {
      await db.insert(assetBuildingDetails).values({ assetId, ...seed.detailValues } as unknown as typeof assetBuildingDetails.$inferInsert).onConflictDoNothing();
    }
    if (seed.detail === "vehicle") {
      await db.insert(assetVehicleDetails).values({ assetId, ...seed.detailValues } as unknown as typeof assetVehicleDetails.$inferInsert).onConflictDoNothing();
    }
    if (seed.detail === "item") {
      await db.insert(assetItemDetails).values({ assetId, ...seed.detailValues } as unknown as typeof assetItemDetails.$inferInsert).onConflictDoNothing();
    }

    await db
      .insert(assetOrganizations)
      .values([
        {
          assetId,
          relationType: "financed_by",
          unitId: seed.financedByUnitId !== undefined ? seed.financedByUnitId : keuskupanId ?? null,
          badanHukumId: seed.financedByBadanHukumId ?? null,
          userId: null,
          notes: seed.financedByBadanHukumId ? "Dana badan hukum" : "Dana internal unit",
        },
        { assetId, relationType: "owned_by", unitId: seed.asset.ownershipLevel === "keuskupan" ? keuskupanId ?? null : null, badanHukumId: seed.asset.ownershipLevel === "badan_hukum" ? yayasanId : null, userId: null, notes: null },
        { assetId, relationType: "used_by", unitId: seed.asset.unitId, badanHukumId: seed.asset.badanHukumId, userId: null, notes: null },
        { assetId, relationType: "inputted_by", unitId: null, badanHukumId: null, userId: adminAsetId ?? null, notes: "Seed data" },
      ] as unknown as Array<typeof assetOrganizations.$inferInsert>)
      .onConflictDoNothing();
  }

  await seedAssetOperationalHistories(adminAsetId ?? null);
}

export async function seed() {
  await seedRoles();
  await seedPermissions();
  await seedRolePermissions();
  await seedTaxMasters();
  await seedReferenceData();
  await seedUsers();
  await seedAssets();
}

seed()
  .then(() => {
    console.log("Seed completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });









