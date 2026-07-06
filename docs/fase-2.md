# Fase 2 — Lengkapi Modul Aset

**Referensi:** [Asset Model](asset-model.md)

## Tujuan

Menyelaraskan form, actions, dan UI dengan schema aset terbaru (Coretax, relasi bangunan–tanah, field bangunan).

## Cakupan

### 1. Sinkron form/actions dengan schema

- Bangunan: `buildingType`, `acquisitionMethod`, `disputeStatus`, `buildingAreaSquareMeters`
- Coretax: section form + `upsertTaxAssetCoretax()` di service layer
- Relasi tanah: multi-select + sync `asset_building_lands` (selain `mainLandAssetId`)

### 2. Halaman detail aset

- Route `/assets/[id]` read-only
- Tampilkan: data umum, detail per jenis, dimensi organisasi, depresiasi, coretax, lampiran

### 3. Upload lampiran

- Storage lokal atau object storage
- Dukung banyak lampiran per aset (jenis + file)
- Ganti input teks `file_path` manual

## Deliverables

- [x] Form & actions bangunan lengkap
- [x] Modul Coretax di UI
- [x] Junction `asset_building_lands` di form bangunan
- [x] Halaman detail aset (`/assets/[id]`)
- [x] Upload lampiran (multi-file, storage lokal `public/uploads/assets/`)

## Uji manual

1. Buat bangunan dengan beberapa tanah terkait + satu tanah utama
2. Isi data Coretax pada aset
3. Upload minimal 2 lampiran per aset
4. Buka halaman detail — semua section tampil benar
