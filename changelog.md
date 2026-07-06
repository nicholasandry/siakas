# Changelog

## 2026-07-06 11:15 (UTC+7)

### Fase 5 — penyempurnaan & perbaikan build

- `optionalTrimmedString` selalu mengembalikan `string | null` (bukan `undefined`) — memperbaiki error TypeScript di semua server actions.
- `UnitParentOption` menyertakan `parentId` untuk anti-loop hierarki di form unit (client-side).
- Validasi client Zod pada form aset (kode, nama, kepemilikan, nilai perolehan).
- `ResponsiveTable` diterapkan di daftar badan hukum dan aset.
- Build produksi (`npm run build`) lulus.

## 2026-07-06 11:05 (UTC+7)

### Fase 5 — Validasi bisnis, Zod, polish UX

- Schema Zod di `lib/validators/` untuk unit, badan hukum, aset, dan RBAC.
- Validasi server di actions master data, aset, dan RBAC; pesan error terstruktur.
- Validasi client inline (unit & badan hukum) via `useZodForm`.
- Anti-loop hierarki unit: filter parent di UI (`getBlockedParentIds`) + `assertKeuskupanRootRule` di server.
- UX: `FieldHint` (Coretax & depresiasi), `ConfirmDeleteForm`, `ResponsiveTable` untuk mobile.
- Dokumentasi: [docs/smoke-test.md](docs/smoke-test.md) dan [README.md](README.md) dengan kredensial seed.

## 2026-07-06 10:55 (UTC+7)

### Fase 4 — Audit & administrasi RBAC

- **Pengguna:** tambah akun baru (dialog), edit profil/role/scope, reset password dengan audit trail.
- **Audit log:** label aksi/entitas dalam Bahasa Indonesia, halaman detail `/settings/audit/[id]` dengan JSON before/after terformat.
- **Role permissions:** tombol pilih semua / kosongkan per grup resource.
- `ActionAlert` mendukung variant sukses (hijau).

## 2026-07-06 10:45 (UTC+7)

### Fase 3 — Pajak & depresiasi dari master DB

- `lib/depreciation.ts` di-refactor: perhitungan dari kelompok + aturan master (`calculateDepreciationFromMaster`), bukan hardcode.
- `appendAssetDepreciation` menggantikan delete+insert — histori depresiasi aset tidak ditimpa saat regulasi berubah.
- Form aset: pilihan **kelompok fiskal** (bangunan permanen/tidak permanen, kendaraan, benda); tanah otomatis tidak disusutkan.
- Halaman **Settings → Master Pajak** (`/settings/tax-master`): CRUD kelompok fiskal + aturan per tahun pajak.
- Detail aset menampilkan snapshot depresiasi terbaru + tabel histori perhitungan.
- Permission: `tax-master.read`, `tax-master.update`.

## 2026-07-06 10:30 (UTC+7)

### Fase 1 & 2 — penyempurnaan modul aset dan audit

**Fase 1**
- Filter audit log diperluas: dropdown **pengguna (aktor)** dan **rentang tanggal** (`dateFrom` / `dateTo`).
- `listAuditActorOptions()` untuk opsi filter; paginasi audit mempertahankan semua parameter filter.

**Fase 2**
- Form bangunan lengkap: `buildingType`, luas, cara perolehan, status sengketa, tanah utama + multi tanah terkait (`asset_building_lands`).
- Tab **Coretax** di form aset + `upsertTaxAssetCoretax()` di service layer.
- Upload lampiran multi-file (PDF/gambar, max 10 MB) ke `public/uploads/assets/{assetId}/`; komponen `AssetAttachmentsField`.
- Halaman detail aset `/assets/[id]` (read-only) + tautan Detail/Edit di daftar aset; redirect ke detail setelah create/update.
- Perbaikan TypeScript pada `AssetForm` (`normalizeFieldValue` untuk field skalar vs array).

## 2026-07-06 10:12 (UTC+7)

### UI — `FormSelect` otomatis pakai SearchableSelect (>4 opsi)

- Komponen baru `FormSelect`: native `<select>` jika ≤4 opsi, `SearchableSelect` jika lebih.
- Diterapkan di form aset, badan hukum, RBAC user, dan filter audit log.

## 2026-07-06 10:08 (UTC+7)

### Assets — level kepemilikan Keuskupan / Badan Hukum

- Opsi level kepemilikan: **Keuskupan** dan **Badan Hukum** (menggantikan Unit).
- Keuskupan → tampil dropdown **Unit pengelola**; Badan Hukum → dropdown **Badan hukum** (saling eksklusif).
- Validasi server di `assets/actions.ts`; migration `0003` mengubah nilai lama `unit` → `keuskupan`.

## 2026-07-06 10:02 (UTC+7)

### Assets — form baru pakai tab

- Komponen reusable `Tabs` untuk navigasi antar bagian form.
- `AssetForm` dibagi: **Umum**, **Detail** (per jenis), **Relasi**, **Lampiran & depresiasi**.
- Halaman `/assets/new` disederhanakan; pemilih jenis aset ada di atas tab, tombol simpan sticky di bawah.

## 2026-07-06 09:58 (UTC+7)

### Fix — hydration mismatch pada form hapus unit

- Menghapus atribut `method="post"` dari form yang memakai Server Action (Next.js menangani POST secara otomatis; atribut tersebut memicu perbedaan `POST` vs `post` saat hydrate).

## 2026-07-06 09:55 (UTC+7)

### Fix — migration induk hukum tidak ter-apply

- Menambahkan entri `0002_unit_legal_parent` ke `drizzle/meta/_journal.json` agar `db:migrate` benar-benar menjalankan SQL kolom induk hukum.

## 2026-07-06 09:50 (UTC+7)

### Master data unit — induk hukum

- Kolom baru di `units`: `legal_parent_type`, `legal_parent_unit_id`, `legal_parent_badan_hukum_id`, `legal_parent_label` (migration `0002_unit_legal_parent`).
- Form unit: dropdown **Induk hukum** dengan field kondisional — kevikepan/paroki dari daftar unit, yayasan/PT/CV/koperasi dari master badan hukum, belum jelas/lainnya dengan input teks opsional.
- Unit keuskupan otomatis **Langsung Keuskupan**; validasi server di `lib/unit-rules.ts`.
- Tabel daftar unit menampilkan kolom **Induk hukum**.

## 2026-07-06 09:15 (UTC+7)

### Master data unit — aturan keuskupan & dropdown pencarian

- Hanya satu unit jenis keuskupan; tidak boleh dihapus atau diubah jenisnya.
- Kevikepan/kategorial/paroki: parent otomatis keuskupan, kategori disembunyikan.
- Unit karya/usaha: kategori wajib (11 opsi tetap), parent dikelompokkan per jenis.
- Komponen reusable `SearchableSelect` dengan searchbox dan urutan abjad.
- Validasi server di `lib/unit-rules.ts`.

## 2026-07-06 09:05 (UTC+7)

### Master data — form tambah via dialog

- Unit & badan hukum: tabel utama dulu, tombol **Tambah** membuka dialog form (bukan layout dua kolom).
- Komponen baru: `Dialog`, `CreateUnitDialog`, `CreateBadanHukumDialog`.
- Form unit/badan hukum mendukung tombol **Batal** di dalam dialog.

## 2026-07-06 09:00 (UTC+7)

### Settings — hapus hub RBAC redundan

- `/settings/rbac` sekarang redirect ke `/settings` (satu pintu masuk pengaturan).
- Kartu Pengguna & Role di `/settings` menampilkan hitungan data.
- Tombol kembali di halaman users/roles mengarah ke `/settings`.

## 2026-07-06 08:55 (UTC+7)

### Audit log — cakupan penuh

- **Auth:** login berhasil, login gagal (kredensial/input invalid), logout.
- **Read:** setiap akses halaman terproteksi (dashboard, master data, aset, settings, RBAC, audit) dengan metadata view/count.
- **Akses ditolak:** permission/scope guard, server action forbidden, halaman `/forbidden`.
- **Aset:** snapshot lengkap (asset + detail jenis + organisasi + lampiran + depresiasi) pada create/update/delete.
- Helper baru: `auditPageView`, `auditAuthEvent`, `auditAccessDenied`; filter audit UI diperluas.

## 2026-07-06 08:50 (UTC+7)

### Audit log viewer + UI pengelolaan RBAC

- Added `/settings/audit` — tabel audit log dengan filter aksi/entitas dan pagination; permission `audit.read`.
- Added RBAC UI: `/settings/rbac/users` (daftar + edit role/scope/status), `/settings/rbac/roles` (daftar + edit permission matrix).
- Settings hub (`/settings`) menampilkan kartu modul Audit, Pengguna, dan Role sesuai permission.
- Dashboard: kartu **Audit Log** (`audit.read`) dan **Pengaturan & RBAC** (`rbac.manage`).
- `lib/rbac.ts`, `lib/audit.ts` (list/count), forms `rbac-user-form`, `role-permissions-form`.
- Mutasi RBAC tercatat di audit log.

## 2026-07-06 08:45 (UTC+7)

### Fase 1 — sempurnakan audit, error UX, dan scope lookup

- Added `lib/audit.ts` with `writeAuditLog()` (IP, user-agent); wired to unit, badan hukum, asset mutations and login.
- Added `lib/action-errors.ts` with `handleActionFailure`, `redirectForbidden`, `redirectActionError`; server actions now redirect with `?error=` instead of throwing.
- Added `/forbidden` page and `ActionAlert` component on list pages (units, badan hukum, assets).
- Auth guard on `/assets/new` (`asset.create`), `/settings` and `/settings/rbac` (`rbac.manage`).
- Scoped `listAssetLookups(scope)` for asset form dropdowns.
- Permission-based UI on assets page (create cards, edit/delete buttons).
- Master data index page uses redirect guards instead of throwing `AuthorizationError`.
- Updated `docs/fase-1.md` deliverables and manual test checklist.

## 2026-07-06 08:10 (UTC+7)

### Fase 1 — Auth, proxy, row-level scope

- Removed all demo auth: `demo-auth.ts`, `/api/dev-login`, `/api/dev-logout`.
- Added real login via `/api/login` (email + password from DB, permissions from `role_permissions`).
- Added signed session token (`SESSION_SECRET`) with HMAC cookie `siakas_session`.
- Added `src/proxy.ts` for route protection (Next.js 16+ proxy convention).
- Added row-level scope (`lib/scope.ts`) for unit tree, badan hukum, and assets.
- Scoped list/mutate in master data and asset actions/pages.
- Added roadmap docs: `docs/roadmap.md`, `docs/fase-1.md` … `docs/fase-5.md`.

## 2026-07-06 08:20 (UTC+7)

### Docs & UI — proxy terminology + modern login/dashboard

- Replaced "middleware" with "proxy" in internal docs (`implementation-pattern.md`, `roadmap.md`, `fase-1.md`, `changelog.md`) and RBAC settings page.
- Redesigned login page: split layout, glass card, icon inputs, emerald brand accents.
- Redesigned dashboard: header with user profile, hero gradient, stat cards, module quick-access cards with permission filtering.

## 2026-07-06 08:40 (UTC+7)

### Master data — lengkapi modul Unit & Badan Hukum

- Form unit & badan hukum selaras schema/docs: field wajib, enum options, `maxLength`, helper text.
- Unit form (client): disable parent saat jenis keuskupan; validasi keuskupan root di server.
- Tabel list diperkaya kolom schema (kategori, penanggung jawab, alamat, SK, tanggal, pembina).
- UI berbasis permission: form create / tombol edit-hapus hanya jika punya izin.
- Halaman index master data dengan link modul dan hitungan data.
- Shared options di `lib/master-data-options.ts`.

## 2026-07-06 08:35 (UTC+7)

### Tailwind v4 — hapus `tailwind.config.ts`, migrasi ke `@theme`

- Removed `tailwind.config.ts`; theme tokens now live in `globals.css` via `@theme inline`.
- Updated `components.json` for shadcn (no JS config path).
- Preserved design tokens: shadcn colors, `font-display`, `shadow-glow`, radius xl/2xl.

## 2026-07-06 08:30 (UTC+7)

### Fix — Tailwind CSS v4 tidak ter-apply

- Root cause: `globals.css` masih memakai sintaks v3 (`@tailwind base/components/utilities`) padahal project memakai Tailwind v4 + `@tailwindcss/postcss`.
- Migrasi ke `@import "tailwindcss"` + `@config` agar utility classes (layout, warna, shadow, rounded) ter-compile.
- Tambah font Inter via `next/font` di `layout.tsx`.

## 2026-07-06 08:00 (UTC+7)

### Database schema — align with docs specification

- Added `tax_asset_coretax` table for Coretax mapping per asset (jenis harta, kode harta, golongan harta, sumber kepemilikan, pemilik SPT, catatan pajak & audit).
- Added `asset_building_lands` junction table for many-to-many building ↔ land relations with `is_primary` flag.
- Extended `asset_building_details` with `building_type`, `acquisition_method`, `dispute_status`, and `building_area_square_meters`.
- Changed `tax_asset_depreciation` index from unique to non-unique on `(asset_id, tax_year)` to allow multiple depreciation history records per year.
- Generated and applied migration `drizzle/0001_tidy_rockslide.sql` via `npm run db:migrate`.
