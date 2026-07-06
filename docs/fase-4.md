# Fase 4 — Audit & Administrasi

**Referensi:** [Implementation Pattern](implementation-pattern.md), ringkasan [docs.md](../docs.md)

## Tujuan

Audit trail otomatis dan UI administrasi RBAC yang fungsional.

## Cakupan

### 1. Audit trail otomatis

- Helper `writeAuditLog()` — dipanggil dari semua mutasi
- Entity: unit, badan hukum, aset, RBAC, tax master
- Field: `before_data`, `after_data`, actor, IP, user agent

### 2. Halaman audit

- Route `/settings/audit`
- Filter: entity, action, user, rentang tanggal

### 3. RBAC admin UI

- Kelola users (CRUD, assign role, unit, badan hukum)
- Kelola roles & role-permissions (bukan placeholder)
- Audit perubahan permission

## Deliverables

- [x] `lib/audit.ts` + integrasi ke server actions (unit, badan hukum, aset, RBAC, tax master, auth)
- [x] Halaman `/settings/audit` + filter + detail `/settings/audit/[id]`
- [x] Halaman kelola users (tambah, edit, reset password), roles & permissions
- [x] Guard `rbac.manage` pada mutasi RBAC

## Uji manual

1. Edit unit — baris audit muncul dengan before/after JSON
2. Superadmin ubah permission role — tercatat di audit
3. User tanpa `audit.read` tidak bisa buka halaman audit
