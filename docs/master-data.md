# Master Data

## 1. Daftar Badan Hukum
Field wajib:
1. nama badan hukum
2. jenis: yayasan, pt, cv, koperasi, lainnya
3. bidang: pendidikan, sosial, kesehatan, rumah bina
4. dasar hukum pendirian
5. nomor SK Kemenkumham
6. tanggal pendirian
7. pembina/pengurus mewakili keuskupan
8. status terkini
9. catatan

## 2. Daftar Unit
Field wajib:
1. kode unit
2. nama unit
3. jenis unit: keuskupan, kevikepan, kategorial, paroki, unit karya, unit usaha
4. unit induk (relasi ke daftar unit)
5. alamat
6. penanggungjawab
7. catatan

## 3. Aturan Hierarki Unit
- Keuskupan adalah root dan tidak memiliki parent.
- Setiap unit selain keuskupan hanya boleh memiliki satu parent langsung.
- Relasi unit satu arah dan tidak boleh membentuk looping.
- Saat memilih parent atau child, sistem harus menolak diri sendiri, parent langsung, dan semua leluhur.
- Unit karya dan unit usaha boleh saling menjadi parent-child sesuai struktur organisasi.
- Kategori unit adalah atribut terpisah dari jenis unit.
- Contoh: unit karya dengan kategori pendidikan dapat memiliki child berupa unit usaha dengan kategori koperasi.
