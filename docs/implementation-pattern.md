# Implementation Pattern

## 1. Tujuan
Dokumen ini menjelaskan pola implementasi RBAC untuk SIAKAS pada Next.js, termasuk struktur `users`, `roles`, `permissions`, `role_permissions`, dan guard di proxy maupun server actions.

## 2. Rekomendasi Paket RBAC
Rekomendasi utama:
- `accesscontrol`

Alasan:
- mendukung RBAC dan ABAC
- mendukung inheritance role
- cocok untuk skema `superadmin`, `admin-aset`, dan role turunan
- sederhana dipakai di server-side Next.js

Alternatif bila ingin kontrol penuh tanpa dependency policy engine:
- custom RBAC evaluator berbasis tabel permission

## 3. Skema Konsep
### 3.1 Users
Tabel `users` menyimpan akun autentikasi dan relasi ke satu role aktif.

Field inti:
- id
- name
- email
- password_hash
- role_id
- unit_id nullable
- badan_hukum_id nullable
- is_active
- created_at
- updated_at

### 3.2 Roles
Tabel `roles` menyimpan role aplikasi.

Field inti:
- id
- code
- name
- description
- is_system
- created_at
- updated_at

Contoh role:
- superadmin
- admin-keuskupan
- admin-kevikepan
- admin-kategorial
- admin-paroki
- admin-badan
- admin-unit
- admin-aset

### 3.3 Permissions
Tabel `permissions` menyimpan izin granular.

Field inti:
- id
- code
- resource
- action
- description
- created_at
- updated_at

Contoh permission:
- unit.read
- unit.create
- unit.update
- unit.delete
- badan-hukum.read
- aset.read
- aset.create
- aset.update
- aset.delete
- tax-master.read
- tax-master.update

### 3.4 Role Permissions
Tabel `role_permissions` menjadi junction table many-to-many.

Field inti:
- role_id
- permission_id
- granted
- created_at

Aturan:
- `superadmin` dapat diberi semua permission
- role lain hanya mendapat permission yang relevan
- permissions sebaiknya dimodelkan per resource dan action agar mudah diaudit

## 4. Pola Guard
### 4.1 Proxy
Proxy (`src/proxy.ts`, Next.js 16+) dipakai untuk:
- menolak request unauthenticated
- menjaga route berdasarkan area aplikasi
- melakukan redirect cepat sebelum masuk page server component

Yang cocok dijaga di proxy:
- `/dashboard/*`
- `/master-data/*`
- `/assets/*`
- `/settings/*`

Proxy tidak ideal untuk:
- cek detail row-level access
- cek ownership yang butuh query database

### 4.2 Server Actions Guard
Server actions dipakai untuk:
- cek permission sebelum insert/update/delete
- cek scope akses berdasarkan unit atau badan hukum
- cek ownership atau ancestry unit

Pola yang disarankan:
1. ambil session user
2. ambil permission efektif
3. validasi scope resource
4. baru jalankan mutasi database

### 4.3 Service Guard
Untuk konsistensi, pisahkan helper:
- `requireUser()`
- `requirePermission()`
- `requireUnitScope()`
- `requireBadanHukumScope()`

Pola ini lebih aman daripada menyebar logika permission langsung di page atau action.

## 5. Rekomendasi Implementasi
- Simpan role dan permission di database, jangan hardcode penuh di UI.
- Pakai enum atau code string yang stabil.
- Gunakan satu sumber kebenaran untuk permission matrix.
- Buat audit trail untuk seluruh perubahan permission dan master data.
