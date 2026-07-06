# Fase 5 — Polish & Validasi Bisnis

**Referensi:** [Master Data](master-data.md)

## Tujuan

Validasi bisnis ketat, UX form yang konsisten, dan smoke test per role.

## Cakupan

### 1. Validasi bisnis unit

- Keuskupan = root tanpa parent
- Satu parent langsung per unit
- Anti-loop hierarki (perkuat di server + UI)
- Tolak parent = diri sendiri atau leluhur

### 2. Validasi Zod

- Schema Zod untuk semua form (unit, badan hukum, aset per jenis)
- Enum stabil: status legalitas, jenis unit, jenis badan hukum, dll.
- Pesan error inline di form

### 3. UX & aksesibilitas

- Responsif mobile untuk tabel dan form panjang
- Tooltip untuk field teknis (Coretax, depresiasi)
- Konfirmasi sebelum hapus data penting

### 4. Smoke test per role

- Matriks uji: superadmin, admin-keuskupan, admin-paroki, admin-badan, admin-aset
- Dokumentasi kredensial seed di README

## Deliverables

- [x] Zod schemas di `lib/validators/`
- [x] Validasi keuskupan root + anti-loop hierarki (server + UI filter parent)
- [x] Error handling inline di form unit & badan hukum (client Zod)
- [x] Checklist smoke test: [smoke-test.md](smoke-test.md) + kredensial di [README.md](../README.md)

## Uji manual

1. Coba set parent unit = child sendiri — ditolak
2. Buat keuskupan dengan parent — ditolak
3. Submit form kosong — pesan validasi jelas per field
4. Jalankan smoke test 5 role dari seed
