import Link from "next/link";
import { ArrowLeft, Building2, Lock, LogIn, Mail, ShieldCheck, Sparkles } from "lucide-react";

const fieldClassName =
  "h-12 w-full rounded-xl border border-slate-200/80 bg-white/90 px-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20";

const highlights = [
  "Autentikasi berbasis database & RBAC",
  "Scope akses per unit dan badan hukum",
  "Audit trail untuk setiap perubahan data",
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next } = await searchParams;

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.18),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(250,204,21,0.16),transparent_28%),linear-gradient(180deg,#f8fafc_0%,#ecfdf5_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-32 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 bottom-16 h-80 w-80 rounded-full bg-amber-300/15 blur-3xl"
      />

      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-6 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:px-10 lg:py-16">
        <section className="hidden flex-col justify-center space-y-8 lg:flex">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/70 bg-white/70 px-4 py-2 text-sm text-slate-600 shadow-sm backdrop-blur">
            <Sparkles className="h-4 w-4 text-emerald-700" />
            Keuskupan Surabaya
          </div>
          <div className="space-y-4">
            <h1 className="max-w-lg text-balance font-display text-5xl font-semibold tracking-tight text-slate-950">
              SIAKAS
            </h1>
            <p className="max-w-md text-pretty text-lg leading-8 text-slate-600">
              Sistem Informasi Aset Keuskupan Surabaya — kelola master data, aset, dan pelaporan fiskal dalam satu
              platform terpadu.
            </p>
          </div>
          <ul className="space-y-3">
            {highlights.map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm text-slate-700">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                {item}
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/60 p-4 text-sm text-slate-600 shadow-glow backdrop-blur">
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-800">
              <Building2 className="h-5 w-5" />
            </div>
            <p className="leading-6">
              Masuk dengan akun yang sudah terdaftar. Hubungi administrator jika belum memiliki akses.
            </p>
          </div>
        </section>

        <section className="mx-auto w-full max-w-md lg:max-w-none">
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">SIAKAS</p>
              <h1 className="font-display text-2xl font-semibold text-slate-950">Masuk</h1>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Beranda
            </Link>
          </div>

          <div className="rounded-3xl border border-white/80 bg-white/85 p-8 shadow-glow backdrop-blur-md sm:p-10">
            <div className="mb-8 space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
                <Lock className="h-3.5 w-3.5" />
                Area aman
              </div>
              <h2 className="font-display text-3xl font-semibold tracking-tight text-slate-950">Selamat datang kembali</h2>
              <p className="text-sm leading-6 text-slate-600">Masukkan email dan password akun SIAKAS Anda.</p>
            </div>

            {error === "invalid" ? (
              <div
                className="mb-6 rounded-2xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-800"
                role="alert"
              >
                Email atau password tidak valid, atau akun tidak aktif.
              </div>
            ) : null}

            <form action="/api/login" method="post" className="space-y-5">
              {next ? <input type="hidden" name="next" value={next} /> : null}

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Email</span>
                <span className="relative block">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    placeholder="nama@siakas.local"
                    className={`${fieldClassName} pl-10`}
                  />
                </span>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Password</span>
                <span className="relative block">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    name="password"
                    required
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    className={`${fieldClassName} pl-10`}
                  />
                </span>
              </label>

              <button
                type="submit"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 text-sm font-medium text-white transition hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30"
              >
                <LogIn className="h-4 w-4" />
                Masuk ke dashboard
              </button>
            </form>

            <p className="mt-6 text-center text-xs leading-5 text-slate-500">
              Lupa password? Hubungi administrator sistem Keuskupan.
            </p>

            <Link
              href="/"
              className="mt-4 hidden items-center justify-center gap-1 text-sm font-medium text-slate-700 underline-offset-4 hover:text-emerald-800 hover:underline lg:inline-flex"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke beranda
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
