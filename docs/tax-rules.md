# Tax Rules

## 1. Prinsip Umum
- Semua aset memiliki modul depresiasi.
- Tanah tidak disusutkan.
- Bangunan disusutkan sesuai kategori fiskal bangunan.
- Kendaraan dan benda disusutkan sebagai harta berwujud bukan bangunan sesuai kelompok fiskal.
- Konfigurasi fiskal harus bisa diperbarui tanpa mengubah histori aset.

## 2. Field Depresiasi
- status depresiasi
- metode depresiasi
- kelompok harta fiskal
- masa manfaat fiskal
- tarif depresiasi fiskal
- nilai residu
- nilai depresiasi tahunan
- akumulasi depresiasi
- nilai buku
- tanggal mulai depresiasi
- catatan depresiasi

## 3. Aturan Konfigurasi
- metode, kelompok fiskal, masa manfaat, dan tarif disimpan sebagai master pajak
- perhitungan mengikuti ketentuan pajak yang berlaku pada periode berjalan
- histori aset tidak boleh ikut berubah ketika master pajak diperbarui

## 4. Coretax
Field coretax umum:
- jenis harta coretax
- kode harta
- tipe golongan harta
- sumber kepemilikan
- nama pemilik terdaftar SPT
- keterangan tambahan pajak
- catatan audit

## 5. Referensi Regulasi
- PMK 81 Tahun 2024: Ketentuan Perpajakan dalam Rangka Pelaksanaan Sistem Inti Administrasi Perpajakan
- PMK 18/PMK.03/2021: Pelaksanaan UU Cipta Kerja di bidang PPh, PPN, PPnBM, dan KUP

## 6. Catatan Implementasi
- Simpan aturan depresiasi dalam tabel master pajak.
- Tandai bangunan permanen dan tidak permanen sebagai kategori fiskal.
- Perbedaan metode dan tarif harus dikelola dari master data, bukan hardcode form.
