export const auditEntityLabels: Record<string, string> = {
  session: "Sesi / Auth",
  dashboard: "Dashboard",
  master_data: "Master Data",
  settings: "Pengaturan",
  system: "Sistem",
  server_action: "Server Action",
  unit: "Unit",
  asset_location: "Lokasi Aset",
  asset_disposal_lookup_option: "Lookup Disposal Aset",
  badan_hukum: "Badan Hukum",
  asset: "Aset",
  user: "Pengguna",
  role: "Role",
  role_permissions: "Permission Role",
  tax_depreciation_group: "Kelompok Fiskal",
  tax_depreciation_rule: "Aturan Depresiasi",
  tax_master: "Master Pajak",
  audit_log: "Audit Log",
};

export const auditActionLabels: Record<string, string> = {
  login: "Login",
  login_failed: "Login gagal",
  logout: "Logout",
  read: "Baca",
  create: "Buat",
  update: "Ubah",
  delete: "Hapus",
  access_denied: "Akses ditolak",
};

export function formatAuditEntity(entity: string) {
  return auditEntityLabels[entity] ?? entity;
}

export function formatAuditAction(action: string) {
  return auditActionLabels[action] ?? action;
}

export const auditEntityOptions = Object.entries(auditEntityLabels).map(([value, label]) => ({
  value,
  label,
}));

export const auditActionOptions = Object.entries(auditActionLabels).map(([value, label]) => ({
  value,
  label,
}));
