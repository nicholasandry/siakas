# Fase 3 — Pajak & Depresiasi

**Referensi:** [Tax Rules](tax-rules.md), [Tax Master Tables](tax-master-tables.md)

## Tujuan

Perhitungan depresiasi mengikuti master pajak; histori tidak ditimpa saat regulasi berubah.

## Cakupan

### 1. Service depresiasi server-side

- Hitung dari `tax_depreciation_groups` + `tax_depreciation_rules` (bukan hardcode)
- **Append histori** — insert record baru, jangan delete+insert
- Pilih kelompok fiskal bangunan (permanen vs tidak permanen) di form

### 2. UI master pajak

- CRUD `tax_depreciation_groups`
- CRUD `tax_depreciation_rules`
- Permission: `tax-master.read`, `tax-master.update`

### 3. Modul Coretax (pelaporan)

- Form mapping field Coretax per aset (jika belum selesai di Fase 2)
- (Opsional) export/laporan untuk SPT

## Deliverables

- [x] Refactor `lib/depreciation.ts` — baca dari master DB
- [x] Ganti `replaceAssetDepreciation` dengan append histori (`appendAssetDepreciation`)
- [x] Halaman `/settings/tax-master` + edit kelompok & aturan
- [x] Pilihan kelompok fiskal di form bangunan/kendaraan/benda

## Uji manual

1. Ubah rule depresiasi tahun 2025 — aset lama historinya tetap
2. Buat aset bangunan permanen vs tidak permanen — kelompok fiskal berbeda
3. Tanah: `is_depreciable = false`, nilai buku = nilai perolehan
