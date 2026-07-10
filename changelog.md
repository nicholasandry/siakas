# Changelog

## 2026-07-09 16:05 (UTC+7)

### Kategori master lokasi (2 jenis) + filter form aset

- Kolom `location_kind` pada `asset_locations`: `ruang` (benda) dan `garasi_parkir` (kendaraan).
- Form master lokasi: field kategori penempatan; daftar lokasi menampilkan kategori.
- Dropdown penempatan di form aset & quick move difilter per jenis aset; validasi server menolak mismatch.

## 2026-07-09 15:57 (UTC+7)

### Form aset: penempatan lokasi di section detail

- Dropdown lokasi dipindah ke section detail benda/kendaraan, tepat setelah status operasional.
- Indikator wajib (`RequiredMark`) dan `required` HTML mengikuti status: aktif = wajib, non-aktif = opsional.

## 2026-07-09 15:38 (UTC+7)

### Quick move penempatan + pengingat setelah hibah

- Tombol **Pindah ruang** / **Pindah garasi** di daftar aset (benda & kendaraan, unit keuskupan); mencatat `asset_placement_histories`.
- Banner pengingat di detail aset jika aktif tanpa lokasi (umum setelah hibah internal).
- Deskripsi riwayat operasional diperbarui mencakup penempatan unit/lokasi.

## 2026-07-09 15:26 (UTC+7)

### Lokasi aset — aturan per jenis

- Field master lokasi hanya untuk **benda** dan **kendaraan** (keuskupan); disembunyikan untuk tanah/bangunan.
- **Benda aktif**: wajib pilih **Ruang penempatan**; **kendaraan aktif**: wajib **Garasi / area parkir**.
- Validasi client (Zod) + server; label berbeda di form dan detail aset.

## 2026-07-09 15:10 (UTC+7)

### Riwayat penempatan aset (`asset_placement_histories`)

- Tabel baru mencatat perubahan **unit pengelola** dan **lokasi fisik** dalam satu timeline.
- Ditulis saat edit aset (perubahan `unit_id` / `location_id`) dan hibah internal **COMPLETED**.
- Tab filter **Penempatan** di riwayat aset + integrasi unified history (`kind: placement`).

## 2026-07-09 15:00 (UTC+7)

### Hibah internal — sinkron relasi organisasi

- Saat hibah internal **COMPLETED**: `owned_by` dan `used_by` di `asset_organizations` disinkronkan ke unit penerima (update atau insert jika belum ada).

## 2026-07-09 14:50 (UTC+7)

### Hapus `recipient_type` (cleanup penuh)

- Hapus kategori master-data **Jenis Penerima** dari disposal lookups.
- Hapus kolom `recipient_type` dari `asset_disposals` (seed: `DROP COLUMN`).
- Hapus data lookup `recipient_type` dari `asset_disposal_lookup_options`.
- Bersihkan dead code: constants, form props, validations, payload insert.

## 2026-07-09 14:45 (UTC+7)

### Hibah disposal — perbaikan bundle client

- Pisahkan `resolveDonationRecipientInput` ke `donation-recipient.server.ts` (`server-only`) agar form client tidak menarik modul `pg` ke browser.

## 2026-07-09 14:35 (UTC+7)

### Hibah disposal — perbaikan test

- Perbaikan import `getUnitKindLabel` (bukan `labelUnitKind`) di `donation-recipient.ts`.
- Penyesuaian assertion urutan grup unit di unit test (sort alfabetis per label jenis unit).

## 2026-07-09 14:30 (UTC+7)

### Hibah disposal — penerima unit internal / pihak lain + transfer ownership

- **Jenis penerima hibah** diganti menjadi **Unit internal** atau **Pihak lain** (tidak lagi memakai lookup `recipient_type`).
- **Unit internal**: dropdown unit dengan grup per jenis + search (`SearchableSelect`); unit pengelola saat ini disembunyikan.
- **Pihak lain**: input nama penerima manual.
- Kolom baru `donation_recipient_kind`, `recipient_unit_id` pada `asset_disposals`.
- Saat **COMPLETED** + hibah internal: `unit_id` pindah ke unit penerima, `location_id` di-reset, status dikembalikan dari riwayat sebelum `disposal_start`, audit `ASSET_OWNERSHIP_TRANSFERRED_BY_DONATION`.
- Hibah eksternal tetap status `donated`.

## 2026-07-09 13:45 (UTC+7)

### Riwayat & aset — 7 perbaikan lanjutan

- **Tab count konsisten**: `countUnifiedAssetHistoryFilters` dan halaman detail memakai hitungan **grup tampilan** (sama dengan `/history`), via `getAssetHistoryDetailBundle`.
- **Performa detail aset**: satu query index + satu hydrate untuk preview semua tab (menggantikan 1 count + 4 CTE penuh).
- **Quick update**: `hasStatusHistoryValueChanged` untuk status (konsisten dengan create/update).
- **Upload lampiran di luar transaksi**: create upload setelah commit; update upload sebelum transaksi lalu simpan path di dalam transaksi.
- **Kondisi fisik disposal**: dihapus dari input/Zod/form; hanya diset server dari riwayat kondisi.
- **Schema Drizzle**: CHECK `source`/`event_type` + FK `related_entity_id` → `asset_disposals` pada tabel history.
- **`revalidateAssetPaths`** pada edit draft disposal.

## 2026-07-09 13:15 (UTC+7)

### Riwayat aset — 9 perbaikan (performa, disposal, transaksi, constraint)

- **Performa halaman riwayat lengkap**: indeks ringan (`listUnifiedHistoryIndex`) + hydrate hanya baris halaman aktif (`fetchUnifiedHistoryItemsByKeys`); pagination tetap per grup tampilan.
- **Kondisi fisik disposal** diambil dari `asset_condition_histories` terakhir (`getLatestAssetConditionFromHistory`), bukan input user; form menampilkan nilai read-only dari riwayat.
- **`revalidateAssetPaths`** memuat `/assets/[id]/history` — dipakai di create/update/quick update/delete aset dan transisi disposal.
- **Normalisasi `archived` → `inactive`** di `recordAssetHistoryChanges` / `hasStatusHistoryValueChanged` agar tidak muncul entri status palsu.
- **Aset `on_loan` tetap tidak bisa disposal** (perilaku existing, tanpa perubahan).
- **Batch `recorded_at`** tunggal per panggilan `recordAssetHistoryChanges` untuk merge kartu ≤2 detik lebih andal.
- **Transaksi create/update aset**: `createAssetWithInitialHistory` / `updateAssetWithHistory` + `persistAssetDetails` dalam satu `db.transaction`; helper detail upsert menerima `executor`.
- **Constraint DB** (seed): CHECK `source` / `event_type`; FK `related_entity_id` → `asset_disposals`.
- **Dead code dihapus**: `buildUnifiedAssetHistory`, `listAssetStatusHistories`, dll.

## 2026-07-09 12:30 (UTC+7)

### Riwayat aset — 5 perbaikan (disposal, loaned_to, filter, merge, pagination + export)

- **Disposal complete/cancel/reject** memakai `recordAssetHistoryChanges` (konsisten dengan start disposal); `loaned_to` dinormalisasi lewat `normalizeAssetLoanedTo`.
- **Invariant `loaned_to`**: `normalizeAssetLoanedTo` + `assertLoanedToInvariant` di create/update/quick update dan resolver `resolveLoanedTo`.
- **Tab filter Disposal** di timeline; status operasional terpisah dari entri `disposal_*`.
- **Kartu timeline duplikat** digabung (`groupAssetHistoryForDisplay`) bila actor, sumber, dan waktu berdekatan (≤2 detik).
- **Pagination DB** (`UNION ALL` CTE) untuk halaman riwayat lengkap; detail aset memuat 30 entri terakhir + hitungan filter dari DB.
- **Ekspor CSV** di `/assets/[id]/history/export` (dengan filter aktif).
- **Fix** `db.execute` Drizzle mengembalikan `{ rows }`, bukan array langsung — pagination riwayat tidak lagi error `rows.map is not a function`.

## 2026-07-09 13:05 (UTC+7)

### Detail aset — kartu disposal & riwayat operasional di bagian bawah

- Kartu **Proses Disposal** dan **Riwayat perubahan operasional** dipindah ke paling bawah halaman detail (setelah lampiran).

## 2026-07-09 13:00 (UTC+7)

### Detail aset — pisahkan Proses Disposal vs riwayat operasional

- Kartu **Proses Disposal** (dulu "Riwayat Disposal / Penghapusan") untuk pengajuan, workflow, dan angka keuangan.
- **Riwayat perubahan operasional** fokus status/kondisi/peminjaman; tab Disposal disembunyikan di preview detail.
- Link **Lihat audit perubahan status disposal** dari kartu proses ke `/history?filter=disposal`.
- Tab filter disposal di halaman riwayat lengkap diubah label menjadi **Audit status disposal**.

## 2026-07-09 12:55 (UTC+7)

### Riwayat aset — pagination selaras dengan merge kartu

- Halaman riwayat lengkap memuat semua event, **group dulu** (`groupAssetHistoryForDisplay`), baru paginate per **kartu tampilan** — merge status+kondisi+loan tidak terpecah antar halaman.
- Tab count di halaman riwayat memakai jumlah **kartu** (bukan raw rows) agar konsisten dengan pagination.
- `?page=` di luar range di-clamp ke halaman valid.
- API baru: `getAssetHistoryDisplayPage`, `paginateAssetHistoryDisplayGroups`.

## 2026-07-09 12:40 (UTC+7)

### Riwayat aset — transaksi create/update + preview filter server-side

- **Create/update asset + history** dalam satu `db.transaction` (`createAssetWithInitialHistory`, `updateAssetWithHistory`) — tidak ada lagi aset tersimpan tanpa riwayat jika insert history gagal.
- **Preview timeline di detail aset** memuat riwayat per filter dari server (`listAssetHistoryPreviewByFilter`, 12 baris/filter) — tab Status/Loan/Disposal menampilkan data yang benar, bukan client filter dari 30 baris "Semua".

## 2026-07-09 12:35 (UTC+7)

### Maps — Leaflet di-bundle lokal, bukan CDN unpkg

- Leaflet (`leaflet` npm) dimuat via dynamic import dari bundle aplikasi.
- Menghilangkan peringatan browser **Tracking Prevention** untuk `unpkg.com/leaflet`.

## 2026-07-09 12:00 (UTC+7)

### Riwayat operasional — preview + halaman lengkap

- Halaman detail menampilkan **5 riwayat terakhir** (sesuai filter) dengan tombol `Lihat semua riwayat (N)`.
- Halaman baru `/assets/[id]/history` untuk riwayat lengkap dengan filter tab + pagination (20/halaman).

## 2026-07-09 11:40 (UTC+7)

### Fix — timeline client bundle tidak lagi impor `pg`

- Konstanta/tipe riwayat aset dipindah ke `histories.shared.ts` (aman untuk client component).
- `asset-history-timeline.tsx` tidak lagi mengimpor `@/lib/assets/histories` yang membawa koneksi database.

## 2026-07-09 11:30 (UTC+7)

### Disposal — blokir aset dipinjamkan + perbaikan akses halaman

- Aset berstatus `on_loan` **tidak boleh** diajukan disposal; halaman `/disposal/new` menampilkan pesan jelas (bukan error 500).
- Tombol disposal disembunyikan untuk aset dipinjamkan; validasi server di `createAssetDisposal`.
- Mulai disposal mencatat `loan_end` + mengosongkan `loaned_to` lewat `recordAssetHistoryChanges`.
- Timeline riwayat punya filter: Semua / Status / Kondisi fisik / Peminjaman.
- Seeder development: **TRUNCATE** semua data aset sebelum seed ulang; contoh aset `on_loan` terpisah (`AST-KEND-LOAN-01`).

## 2026-07-09 11:15 (UTC+7)

### Riwayat aset — perbaikan 1–5 (unified timeline + `asset_loan_histories`)

- **Tabel baru `asset_loan_histories`** untuk audit peminjaman (`loan_start`, `loan_update`, `loan_end`).
- **Timeline gabungan** di detail aset: status, kondisi fisik, dan peminjaman dalam satu urutan kronologis.
- **Catatan terpisah**: `statusNotes`, `conditionNotes`, `loanNotes` — form & quick update punya field catatan kondisi fisik.
- **Perubahan peminjam** saat status tetap `on_loan` dicatat di riwayat peminjaman (bukan hanya di catatan status).
- **Disposal** tidak lagi membuat entri kondisi palsu (`previous === new`); kondisi fisik disposal dicatat di catatan riwayat status.
- Seeder menambahkan riwayat peminjaman `system` yang diturunkan dari alur status seed.

## 2026-07-09 10:43 (UTC+7)

### Seed — riwayat status & kondisi aset

- Seeder menambahkan **3 entri** riwayat status dan kondisi per aset (alur pencatatan → perubahan menengah → kondisi/status terkini).
- Sumber pencatatan: `system`; waktu dijarakkan 0/4–6/10–12 bulan dari tanggal perolehan.
- Jika riwayat `system` kurang dari 3, entri lama sumber `system` diganti saat seed dijalankan ulang.

## 2026-07-09 10:31 (UTC+7)

### Aset — kolom `loaned_to`

- Kolom baru `assets.loaned_to` menyimpan peminjam aktif saat status `on_loan`.
- Diisi otomatis dari field "Dipinjamkan kepada" (form & quick update); dikosongkan saat status bukan `on_loan`.
- Ditampilkan di halaman detail aset; data lama di-backfill dari riwayat status jika ada.

## 2026-07-09 10:21 (UTC+7)

### Form aset — parity dengan quick update status/kondisi

- Form aset mewajibkan catatan peminjam saat status diubah menjadi `on_loan` (validasi client + server).
- Helper text status **Nonaktif** ditambahkan di form aset (sama seperti dialog quick update).
- Catatan status dari form disimpan ke `asset_status_histories` (termasuk format `Dipinjamkan kepada: …`).

## 2026-07-09 10:09 (UTC+7)

### Status aset — satukan Arsip & Nonaktif

- Status `archived` digabung ke `inactive` (Nonaktif) sebagai satu pilihan manual.
- Opsi `archived` dinonaktifkan di master status; data lama dimigrasi ke `inactive` saat seed.
- Label legacy `archived` tetap ditampilkan sebagai Nonaktif; helper text dipindah ke status `inactive`.

## 2026-07-09 09:51 (UTC+7)

### Quick update status/kondisi & disposal kondisi otomatis

- Dialog **Status/Kondisi** di daftar aset untuk perbarui status operasional dan kondisi fisik tanpa membuka form edit penuh.
- Status `on_loan` mewajibkan catatan peminjam; helper menjelaskan arti status `inactive` (masih dimiliki, tidak aktif dipakai — bukan disposal).
- Form disposal: dropdown "Kondisi fisik terakhir" dihilangkan; nilai diambil otomatis dari `assets.condition` dan dicatat di riwayat kondisi.

## 2026-07-09 09:41 (UTC+7)

### Form aset — penempatan status & kondisi

- Status operasional aset dipasangkan berdampingan dengan kondisi fisik per jenis aset (bukan lagi terpisah di Data umum).
- Helper text menjelaskan perbedaan kondisi fisik vs status operasional/lifecycle.
- Status manual dibatasi: `expired_still_used` dan semua status keluar inventori hanya lewat Disposal.

## 2026-07-09 09:03 (UTC+7)

### Riwayat status & kondisi aset

- Tabel baru `asset_status_histories` dan `asset_condition_histories` untuk timeline per aset.
- Pencatatan otomatis saat buat/edit aset, mulai/selesai disposal, serta revert status saat disposal ditolak/dibatalkan.
- Form aset: dropdown status dibatasi ke status operasional; status disposal tidak bisa diubah manual.
- Halaman detail aset menampilkan timeline riwayat status dan kondisi fisik.

## 2026-07-09 08:53 (UTC+7)

### Opsi kondisi aset — constant terpusat & validasi Zod

- File baru `lib/assets/condition-options.ts`: opsi kondisi bangunan, kendaraan, dan benda beserta label dan helper select.
- Form aset memakai constant terpusat (menghapus array hardcoded di `asset-form.tsx`).
- `assetCommonSchema` memvalidasi kondisi per jenis aset: enum untuk bangunan/kendaraan/benda, free text maks. 64 karakter untuk tanah.
- Field `vehicleCondition` ditambahkan ke schema untuk validasi kendaraan.

## 2026-07-09 08:48 (UTC+7)

### Form aset — kondisi fisik tanah

- Field **Kondisi fisik tanah** dipindah dari tab Keuangan & Sewa ke tab Umum (section Data umum aset), setelah cara perolehan — selaras dengan penempatan kondisi bangunan, kendaraan, dan benda.

## 2026-07-09 08:40 (UTC+7)

### Form aset — penempatan field kondisi

- **Benda:** dropdown **Kondisi aset** dipindah dari tab Legalitas ke tab Umum (section Detail benda), setelah jumlah/satuan.
- **Kendaraan:** dropdown kondisi duplikat di tab Legalitas dihapus; kondisi hanya di tab Umum (**Kondisi kendaraan**). Nilai disinkronkan ke `assets.condition` saat simpan.

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
