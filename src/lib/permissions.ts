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
  "asset.disposal.view",
  "asset.disposal.create",
  "asset.disposal.edit",
  "asset.disposal.submit",
  "asset.disposal.review",
  "asset.disposal.approve",
  "asset.disposal.complete",
  "asset.disposal.reject",
  "asset.disposal.cancel",
  "asset.disposal.delete",
  "asset.disposal.viewFinancialFields",
  "asset.disposal.uploadDocuments",
  "asset.disposal.downloadDocuments",
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
