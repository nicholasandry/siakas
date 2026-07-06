# Tax Master Tables

## 1. Tujuan
Dokumen ini mendefinisikan tabel master pajak dan depresiasi untuk aset SIAKAS.

## 2. Prinsip Desain
- Semua aset memiliki depresiasi sebagai bagian dari model data.
- Tanah disimpan sebagai `not depreciable`.
- Bangunan, kendaraan, dan benda menyimpan konfigurasi depresiasi fiskal.
- Aturan pajak harus bisa berubah tanpa mengubah histori aset.

## 3. Tabel Master
### 3.1 tax_depreciation_groups
Menyimpan kelompok fiskal dan aturan dasar depresiasi.

Field:
- id
- code
- name
- asset_category
- method_default
- useful_life_years
- rate_percent
- is_depreciable
- effective_from
- effective_to nullable
- is_active
- notes nullable
- created_at
- updated_at

Contoh `asset_category`:
- tanah
- bangunan
- kendaraan
- benda

Contoh `method_default`:
- garis_lurus
- saldo_menurun
- tidak_disusutkan

### 3.2 tax_depreciation_rules
Menyimpan aturan versi historis yang dipakai untuk menghitung depresiasi.

Field:
- id
- group_id
- tax_year
- method
- useful_life_years
- rate_percent
- residual_value_percent nullable
- source_regulation
- effective_from
- effective_to nullable
- is_active
- notes nullable
- created_at
- updated_at

Fungsi:
- menyimpan perubahan regulasi per periode
- menjaga histori perhitungan tetap konsisten
- menjadi referensi saat aset dihitung ulang

### 3.3 tax_asset_depreciation
Menyimpan hasil depresiasi per aset.

Field:
- id
- asset_id
- depreciation_group_id
- rule_id nullable
- acquisition_value
- residual_value
- depreciable_base
- annual_depreciation
- accumulated_depreciation
- book_value
- start_date
- end_date nullable
- status
- calculation_method
- tax_year
- notes nullable
- created_at
- updated_at

Aturan:
- satu aset bisa punya banyak baris histori depresiasi
- perhitungan baru menambah histori, bukan menimpa hasil lama
- jika aset pindah metode atau tarif karena perubahan regulasi, simpan sebagai record baru

## 4. Kebutuhan Khusus Per Aset
### 4.1 Tanah
- `is_depreciable = false`
- `method_default = tidak_disusutkan`
- `rate_percent = 0`

### 4.2 Bangunan
- pilih kelompok fiskal bangunan permanen atau tidak permanen
- gunakan rule per periode berlaku

### 4.3 Kendaraan dan Benda
- gunakan kelompok fiskal harta berwujud bukan bangunan
- metode garis lurus atau saldo menurun mengikuti rule aktif

## 5. Coretax Mapping
Field coretax yang perlu dipetakan:
- jenis harta coretax
- kode harta
- tipe golongan harta
- sumber kepemilikan
- nama pemilik terdaftar SPT
- keterangan tambahan pajak
- catatan audit

## 6. Catatan Implementasi
- Simpan `source_regulation` sebagai referensi dokumen hukum.
- Gunakan `effective_from` dan `effective_to` untuk versioning aturan.
- Jangan hitung depresiasi langsung di UI; lakukan di server side service.
