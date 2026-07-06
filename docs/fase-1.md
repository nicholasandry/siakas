# Fase 1 — Fondasi Keamanan & Akses

**Referensi:** [Implementation Pattern](implementation-pattern.md)

## Tujuan

Menyediakan autentikasi nyata, proteksi route, dan scope akses row-level sebelum modul bisnis dilanjutkan.

## Cakupan

### 1. Auth nyata dari database

- Login dengan email + password (`users.password_hash`)
- Session ditandatangani (HMAC), cookie `httpOnly`
- Permission efektif dimuat dari `role_permissions` saat validasi session
- Update `last_login_at` saat login berhasil
- Logout menghapus cookie session
- Audit log untuk login berhasil

### 2. Proxy route guard

- Proteksi prefix: `/dashboard`, `/master-data`, `/assets`, `/settings`
- Redirect ke `/login` bila session tidak valid
- Validasi token tanpa query DB (via `src/proxy.ts`, Next.js 16+)

### 3. Row-level scope

- `superadmin` dan `admin-aset`: akses semua data
- `admin-badan`: scope ke `badan_hukum_id` user
- Role unit (`admin-keuskupan`, `admin-kevikepan`, `admin-kategorial`, `admin-paroki`, `admin-unit`): scope ke unit user + seluruh descendant
- Filter list (unit, badan hukum, aset) dan guard mutasi di server actions
- Lookup form aset (unit, badan hukum, aset terkait) ikut difilter scope

### 4. Audit trail & error UX

- `writeAuditLog()` untuk create/update/delete unit, badan hukum, aset
- Server actions redirect dengan pesan error (`?error=`) alih-alih throw ke UI
- Halaman `/forbidden` dengan alasan akses ditolak
- Komponen `ActionAlert` di halaman list
- Filter audit log: aksi, entitas, **pengguna (aktor)**, **rentang tanggal**; paginasi mempertahankan filter

## Deliverables

- [x] Hapus mekanisme demo login
- [x] `lib/password.ts`, `lib/auth.ts`, `lib/scope.ts`
- [x] `src/proxy.ts` (Next.js route guard)
- [x] `/api/login`, `/api/logout`
- [x] Halaman login & dashboard diperbarui
- [x] Scope diterapkan di actions master data & aset
- [x] Audit trail pada mutasi master data & aset
- [x] Halaman `/forbidden` + redirect guard halaman
- [x] Auth guard halaman: `/assets/new`, `/settings`, `/settings/rbac`
- [x] UI berbasis permission (tombol create/edit/delete)
- [x] `listAssetLookups(scope)` — lookup form aset ter-scope
- [x] Filter audit log: pengguna + tanggal (`listAuditActorOptions`, `dateFrom`/`dateTo`)

## Uji manual

1. `npm run db:seed` — password default: `ChangeMe123!`
2. Login sebagai `paroki@siakas.local` — hanya lihat aset/unit dalam scope paroki
3. Login sebagai `superadmin@siakas.local` — akses penuh
4. Akses `/dashboard` tanpa login — redirect ke `/login`
5. Akses `/settings` tanpa `rbac.manage` — redirect ke `/forbidden`
6. Gagal simpan data (mis. parent unit invalid) — pesan error tampil di halaman list
7. Cek tabel `audit_logs` setelah create/update/delete atau login
