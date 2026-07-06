export const permissions = [
  "unit.read",
  "unit.create",
  "unit.update",
  "unit.delete",
  "badan-hukum.read",
  "badan-hukum.create",
  "badan-hukum.update",
  "badan-hukum.delete",
  "asset.read",
  "asset.create",
  "asset.update",
  "asset.delete",
  "tax-master.read",
  "tax-master.update",
  "rbac.manage",
  "audit.read",
] as const;

export type PermissionCode = (typeof permissions)[number];

export const roles = [
  "superadmin",
  "admin-keuskupan",
  "admin-kevikepan",
  "admin-kategorial",
  "admin-paroki",
  "admin-badan",
  "admin-unit",
  "admin-aset",
] as const;

export type RoleCode = (typeof roles)[number];
