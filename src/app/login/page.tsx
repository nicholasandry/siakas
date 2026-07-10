import { Building2, LogIn, Mail, Lock } from "lucide-react";

const fieldClassName =
  "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
      <section className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-900 text-white">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">SIAKAS</p>
            <h1 className="text-lg font-semibold text-slate-950">Masuk</h1>
          </div>
        </div>

        {error === "invalid" ? (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
            Email atau password tidak valid.
          </div>
        ) : null}

        <form action="/api/login" method="post" className="space-y-4">
          {next ? <input type="hidden" name="next" value={next} /> : null}

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <span className="relative block">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                className={`${fieldClassName} pl-9`}
              />
            </span>
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <span className="relative block">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                className={`${fieldClassName} pl-9`}
              />
            </span>
          </label>

          <button
            type="submit"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/20"
          >
            <LogIn className="h-4 w-4" />
            Masuk
          </button>
        </form>
      </section>
    </main>
  );
}
