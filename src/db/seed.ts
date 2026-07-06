import { db } from "@/db";
import { hashPassword } from "@/lib/password";
import {
  assets,
  badanHukums,
  permissions,
  users,
  rolePermissions,
  roles,
  taxDepreciationGroups,
  taxDepreciationRules,
  units,
} from "@/db/schema";

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
  { code: "tax-master.read", name: "Tax Master Read" },
  { code: "tax-master.update", name: "Tax Master Update" },
  { code: "rbac.manage", name: "RBAC Manage" },
  { code: "audit.read", name: "Audit Read" },
];

const rolePermissionMap: Record<string, string[]> = {
  superadmin: permissionSeeds.map((permission) => permission.code),
  "admin-keuskupan": ["unit.read", "unit.update", "asset.read", "asset.create", "asset.update", "audit.read"],
  "admin-kevikepan": ["unit.read", "unit.update", "asset.read", "asset.create", "asset.update", "audit.read"],
  "admin-kategorial": ["unit.read", "unit.update", "asset.read", "asset.create", "asset.update", "audit.read"],
  "admin-paroki": ["unit.read", "unit.update", "asset.read", "asset.create", "asset.update", "audit.read"],
  "admin-badan": ["badan-hukum.read", "badan-hukum.create", "badan-hukum.update", "asset.read", "asset.create", "asset.update", "audit.read"],
  "admin-unit": ["unit.read", "unit.create", "unit.update", "asset.read", "asset.create", "asset.update", "audit.read"],
  "admin-aset": ["asset.read", "asset.create", "asset.update", "asset.delete", "tax-master.read", "audit.read"],
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
    {
      code: "vehicle-group-1",
      name: "Kendaraan Kelompok I",
      assetCategory: "kendaraan",
      methodDefault: "garis_lurus",
      usefulLifeYears: 4,
      ratePercent: "25",
      isDepreciable: true,
      effectiveFrom: "2025-01-01",
      isActive: true,
      notes: "Contoh konfigurasi awal untuk kendaraan.",
    },
    {
      code: "item-group-1",
      name: "Benda Kelompok I",
      assetCategory: "benda",
      methodDefault: "garis_lurus",
      usefulLifeYears: 4,
      ratePercent: "25",
      isDepreciable: true,
      effectiveFrom: "2025-01-01",
      isActive: true,
      notes: "Contoh konfigurasi awal untuk benda.",
    },
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
    {
      code: "vehicle-group-1",
      taxYear: 2025,
      method: "garis_lurus",
      usefulLifeYears: 4,
      ratePercent: "25",
      residualValuePercent: "0",
      sourceRegulation: "PMK 81 Tahun 2024",
      effectiveFrom: "2025-01-01",
      isActive: true,
      notes: "Kelompok awal kendaraan.",
    },
    {
      code: "item-group-1",
      taxYear: 2025,
      method: "garis_lurus",
      usefulLifeYears: 4,
      ratePercent: "25",
      residualValuePercent: "0",
      sourceRegulation: "PMK 81 Tahun 2024",
      effectiveFrom: "2025-01-01",
      isActive: true,
      notes: "Kelompok awal benda.",
    },
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
}

async function seedReferenceData() {
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

  const existingUnits = await db.select().from(units);
  const unitIdByCode = new Map(existingUnits.map((unit) => [unit.code, unit.id]));

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

  const existingBadanHukums = await db.select().from(badanHukums);
  const badanHukumId = existingBadanHukums[0]?.id;
  const assetUnitId = unitIdByCode.get("PAROKI-KATEDRAL");

  if (assetUnitId && badanHukumId) {
    await db
      .insert(assets)
      .values({
        code: "AST-KEND-0001",
        name: "Toyota Avanza",
        assetType: "kendaraan",
        ownershipLevel: "keuskupan",
        unitId: assetUnitId,
        badanHukumId,
        acquisitionDate: "2025-01-15",
        acquisitionValue: "250000000",
        legalStatus: "bpkb_atas_nama_yayasan",
        ownerName: "Yayasan Contoh Keuskupan",
        condition: "baik",
        status: "active",
        notes: "Contoh aset kendaraan",
      })
      .onConflictDoNothing();
  }
}

export async function seed() {
  await seedRoles();
  await seedPermissions();
  await seedRolePermissions();
  await seedTaxMasters();
  await seedReferenceData();
  await seedUsers();
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









