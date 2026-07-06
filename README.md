# SIAKAS

Sistem Informasi Aset Keuskupan — aplikasi Next.js untuk registrasi aset, master data, depresiasi fiskal, dan RBAC.

## Persiapan

```bash
npm install
cp .env.example .env   # sesuaikan DATABASE_URL
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Akun seed (development)

Password default semua akun: **`ChangeMe123!`**

| Role | Email |
|------|-------|
| Super Admin | `superadmin@siakas.local` |
| Admin Keuskupan | `keuskupan@siakas.local` |
| Admin Kevikepan | `kevikepan@siakas.local` |
| Admin Kategorial | `kategorial@siakas.local` |
| Admin Paroki | `paroki@siakas.local` |
| Admin Badan Hukum | `badan@siakas.local` |
| Admin Unit | `unit@siakas.local` |
| Admin Aset | `aset@siakas.local` |

Checklist uji per role: [docs/smoke-test.md](docs/smoke-test.md)

## Dokumentasi

- [Roadmap](docs/roadmap.md)
- [Fase 1–5](docs/fase-1.md)
- [Asset Model](docs/asset-model.md)
- [Tax Rules](docs/tax-rules.md)

## Skrip

| Perintah | Fungsi |
|----------|--------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run db:migrate` | Jalankan migration |
| `npm run db:seed` | Seed data awal |
