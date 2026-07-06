# Smoke Test SIAKAS

Password default semua akun seed: **`ChangeMe123!`**

Jalankan seed terlebih dahulu: `npm run db:seed`

## Matriks uji per role

| Role | Email | Scope / catatan | Uji utama |
|------|-------|-----------------|-----------|
| Super Admin | `superadmin@siakas.local` | Akses penuh | Semua modul, RBAC, audit, tax master |
| Admin Keuskupan | `keuskupan@siakas.local` | Unit keuskupan | Lihat/edit unit dalam scope, aset |
| Admin Paroki | `paroki@siakas.local` | Paroki Katedral + turunan | Hanya data paroki; tidak bisa RBAC |
| Admin Badan | `badan@siakas.local` | Badan hukum yayasan contoh | Badan hukum + aset badan hukum |
| Admin Aset | `aset@siakas.local` | Semua aset (role khusus) | CRUD aset, baca master pajak |

## Checklist superadmin

- [ ] Login / logout — entri audit `session`
- [ ] Buat unit paroki baru — validasi Zod + induk hukum
- [ ] Coba set parent unit = diri sendiri — ditolak (UI + server)
- [ ] Buat aset bangunan dengan kelompok fiskal permanen
- [ ] Upload lampiran aset
- [ ] Buka Settings → Audit → detail entri (JSON before/after)
- [ ] Tambah pengguna RBAC baru
- [ ] Ubah permission role `admin-paroki` — tercatat audit `role_permissions`
- [ ] Ubah aturan depresiasi tahun baru — histori aset lama tetap

## Checklist admin-paroki

- [ ] Login berhasil
- [ ] `/settings` — hanya modul yang diizinkan (audit jika punya `audit.read`)
- [ ] `/settings/rbac` — redirect `/forbidden`
- [ ] Daftar aset — hanya dalam scope paroki
- [ ] Buat aset tanah — tidak disusutkan, nilai buku = perolehan
- [ ] Edit unit di luar scope — ditolak

## Checklist admin-badan

- [ ] Login berhasil
- [ ] Daftar badan hukum — hanya dalam scope
- [ ] Buat/edit aset dengan kepemilikan Badan Hukum
- [ ] Tidak bisa hapus unit keuskupan

## Checklist admin-aset

- [ ] Login berhasil
- [ ] Akses penuh modul aset (create/update/delete)
- [ ] Baca master pajak (`/settings/tax-master`) — tanpa edit jika tidak punya `tax-master.update`
- [ ] Filter audit log per tanggal

## Validasi form (semua role yang bisa create)

- [ ] Submit form unit kosong — error inline di field wajib (client)
- [ ] Submit badan hukum tanpa nama — error inline
- [ ] Hapus data penting — dialog konfirmasi muncul

## Responsif mobile

- [ ] Tabel unit/aset bisa di-scroll horizontal di layar sempit
- [ ] Form aset tab navigasi tetap terjangkau
