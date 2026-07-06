# Asset Model

## 1. Jenis Aset
1. tanah
2. bangunan
3. kendaraan
4. benda

## 2. Aturan Umum Aset
Setiap aset wajib memiliki:
- level kepemilikan: unit atau badan hukum
- unit pengelola
- kode aset
- nama aset
- tanggal perolehan
- nilai perolehan
- status legalitas
- pemilik aset/legalitas PGDP
- dimensi organisasi
- depresiasi
- coretax
- lampiran

## 3. Dimensi Organisasi
Field yang digunakan pada semua aset:
- dibiayai oleh / financed by
- dipakai oleh / used by
- dimiliki oleh / owned by
- diinput oleh / inputted by

## 4. Spesifikasi Per Aset

### 4.1 Tanah
#### Data Umum
- Level Kepemilikan: unit atau badan hukum
- Unit Pengelola
- kode aset
- nama aset
- alamat lengkap
- tanggal perolehan
- nilai perolehan
- status legalitas: milik sendiri, sewa kontrak, pinjam pakai pihak ketiga, sengketa/perlu perhatian
- pemilik aset/legalitas PGDP
- peruntukan tanah: gereja/rumah ibadah utama, kapel/stasi, pastoran/wisma pastur, sekolah/pendidikan, pemakaman, klinik/rumah sakit, panti asuhan/sosial, tanah kosong/idle, gedung komersial/sewaan, lainnya
- cara perolehan: pembelian/transaksi komersial, hibah/donasi umat, warisan, tukar guling, lainnya
- status sengketa: aman/tidak ada sengketa, dalam sengketa hukum/pengadilan
- catatan tambahan internal

#### Legalitas
- luas tanah
- jenis sertifikat: SHM, SHGB, Girik/Surat Ijo, Letter C/Petok D, lainnya/belum bersertifikat
- nomor sertifikat
- nama tertera di sertifikat
- tanggal terbit sertifikat
- tanggal kadaluarsa sertifikat
- instansi penerbit sertifikat
- jenis pemilik legal: PGDP (Kuria/Paroki), Keuskupan Surabaya (Pusat), Yayasan Keuskupan, Pribadi Pastor/Imam, Pribadi Umat/Donatur, belum bersertifikat, lainnya
- nama pemilik aktual saat ini
- NJOP terakhir
- nilai appraisal
- tanggal appraisal
- nomor objek pajak / NOP PBB
- batas tekstual sertifikat: utara, selatan, timur, barat
- koordinat GPS / geografis: latitude, longitude

#### Relasi Organisasi
- dibiayai oleh
- dipakai oleh
- dimiliki oleh
- diinput oleh

#### Lampiran
- jenis lampiran
- file_path

### 4.2 Bangunan
#### Data Umum
- Level Kepemilikan: unit atau badan hukum
- Unit Pengelola
- kode aset
- nama aset
- alamat lengkap
- tanggal perolehan
- nilai perolehan
- status legalitas: milik sendiri, sewa kontrak, pinjam pakai pihak ketiga, sengketa/perlu perhatian
- pemilik aset/legalitas PGDP
- jenis bangunan: gereja/rumah ibadah utama, kapel/stasi, pastoran/wisma pastur, sekolah/pendidikan, kantor sekretariat/kuria, aula paroki/serbaguna, klinik/rumah sakit, panti asuhan/sosial, rumah tinggal karyawan, gedung komersial/sewaan, lainnya
- kondisi bangunan: sangat baik/terawat, dalam proses renovasi, rusak ringan, rusak berat, tidak layak pakai
- cara perolehan: pembelian/transaksi komersial, hibah/donasi umat, warisan, tukar guling, lainnya
- status sengketa: aman/tidak ada sengketa, dalam sengketa hukum/pengadilan
- catatan tambahan internal

#### Relasi Tanah
- dapat memiliki banyak bidang tanah terkait
- hanya satu bidang tanah utama

#### Legalitas
- luas bangunan (m2)
- jumlah lantai
- tahun pembangunan
- tahun renovasi terakhir
- jenis struktur
- luas tapak
- jenis izin bangunan: IMB, PBG, izin lainnya, belum ada izin/proses
- nomor IMB/PBG
- tanggal terbit IMB/PBG
- tanggal kadaluarsa IMB
- penerbit dokumen IMB
- nomor SLF
- tanggal terbit SLF
- tanggal kadaluarsa SLF
- dokumen sewa/kerjasama
- kapasitas listrik
- sumber air: PDAM, sumur bor dalam, sumur gali tradisional, pasokan tandon luar/tangki, lainnya
- kapasitas parkir
- fasilitas pendukung
- koordinat GPS / geografis: latitude, longitude

#### Relasi Organisasi
- dibiayai oleh
- dipakai oleh
- dimiliki oleh
- diinput oleh

#### Lampiran
- jenis lampiran
- file_path

### 4.3 Kendaraan
#### Data Umum
- Level Kepemilikan: unit atau badan hukum
- Unit Pengelola
- kode aset
- nama aset
- kategori kendaraan: mobil, motor, truk, bus, alat berat, lainnya
- merek
- tipe/model
- tahun pembuatan
- warna
- nomor polisi
- nomor rangka
- nomor mesin
- nomor STNK
- nomor BPKB
- tanggal perolehan
- nilai perolehan
- status legalitas: milik sendiri, sewa, pinjam pakai, titipan, sengketa/perlu perhatian
- pemilik aset/legalitas PGDP
- kondisi kendaraan: sangat baik, baik, cukup, rusak ringan, rusak berat, tidak layak pakai
- status operasional: aktif, tidak aktif, cadangan, dalam perbaikan
- domisili/lokasi parkir
- catatan tambahan internal

#### Legalitas
- status dokumen kepemilikan: lengkap, sebagian, belum lengkap
- tanggal terbit STNK
- tanggal kadaluarsa STNK
- tanggal terbit pajak kendaraan terakhir
- tanggal jatuh tempo pajak kendaraan
- status pajak kendaraan: aktif, menunggak, dibayar lunas
- instansi penerbit dokumen
- nama tertera di dokumen
- nomor polis asuransi
- masa berlaku asuransi
- keterangan legalitas tambahan

#### Relasi Organisasi
- dibiayai oleh
- dipakai oleh
- dimiliki oleh
- diinput oleh

#### Lampiran
- jenis lampiran
- file_path

### 4.4 Benda
#### Data Umum
- Level Kepemilikan: unit atau badan hukum
- Unit Pengelola
- kode aset
- nama aset
- kategori benda: liturgis, perlengkapan kantor, alat kesehatan, alat pendidikan, perabot, mesin, koleksi, lainnya
- deskripsi benda
- merek
- model/seri
- nomor seri
- jumlah
- satuan
- tanggal perolehan
- nilai perolehan
- status legalitas: milik sendiri, titipan, pinjam pakai, hibah, sewa, sengketa/perlu perhatian
- pemilik aset/legalitas PGDP
- kondisi benda: baru, sangat baik, baik, cukup, rusak, tidak layak pakai
- lokasi penyimpanan
- penanggung jawab
- catatan tambahan internal

#### Legalitas
- bukti kepemilikan atau asal perolehan
- nomor dokumen/bukti
- tanggal terbit dokumen
- pihak pemberi atau penerbit
- nama tertera di dokumen
- status dokumen: lengkap, sebagian, belum ada
- keterangan legalitas tambahan

#### Relasi Organisasi
- dibiayai oleh
- dipakai oleh
- dimiliki oleh
- diinput oleh

#### Lampiran
- jenis lampiran
- file_path
