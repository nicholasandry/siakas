import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Layers3,
  LogOut,
  Package,
  ScrollText,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auditPageView } from "@/lib/audit";
import { hasPermission } from "@/lib/authz";
import { getCurrentUser } from "@/lib/session";

const modules = [
  {
    title: "Master Data",
    description: "Kelola unit, badan hukum, dan struktur organisasi Keuskupan.",
    href: "/master-data",
    icon: Layers3,
    permission: "unit.read" as const,
    accent: "bg-sky-50 text-sky-800",
  },
  {
    title: "Assets",
    description: "Registrasi aset, legalitas, lampiran, dan depresiasi fiskal.",
    href: "/assets",
    icon: Package,
    permission: "asset.read" as const,
    accent: "bg-emerald-50 text-emerald-800",
  },
  {
    title: "Audit Log",
    description: "Lihat riwayat login, create, update, dan delete di seluruh modul.",
    href: "/settings/audit",
    icon: ScrollText,
    permission: "audit.read" as const,
    accent: "bg-amber-50 text-amber-800",
  },
  {
    title: "Pengaturan & RBAC",
    description: "Kelola pengguna, role, permission, dan konfigurasi akses.",
    href: "/settings",
    icon: ShieldCheck,
    permission: "rbac.manage" as const,
    accent: "bg-violet-50 text-violet-800",
  },
];

function formatRole(role: string) {
  return role
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const visibleModules = modules.filter((module) => hasPermission(user, module.permission));
  const permissionCount = user.permissions.length;

  await auditPageView(user.id, {
    entity: "dashboard",
    view: "home",
    metadata: { moduleCount: visibleModules.length, permissionCount },
  });

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_30%),radial-gradient(circle_at_top_right,rgba(250,204,21,0.12),transparent_24%)]"
      />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-6 lg:px-10 lg:py-8">
        <header className="mb-8 flex flex-col gap-4 rounded-3xl border border-white/70 bg-white/75 p-5 shadow-glow backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-900 text-white">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">SIAKAS</p>
              <p className="font-display text-lg font-semibold text-slate-950">Dashboard</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-3 py-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-900">
                {getInitials(user.name)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
              </div>
            </div>
            <form action="/api/logout" method="post">
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
              >
                <LogOut className="h-4 w-4" />
                Keluar
              </button>
            </form>
          </div>
        </header>

        <section className="mb-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-white/70 bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 p-8 text-white shadow-glow">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-emerald-100">
              <Sparkles className="h-3.5 w-3.5" />
              Ringkasan operasional
            </div>
            <h1 className="max-w-xl text-balance font-display text-4xl font-semibold tracking-tight md:text-5xl">
              Halo, {user.name.split(" ")[0]}.
            </h1>
            <p className="mt-4 max-w-xl text-pretty text-base leading-7 text-emerald-50/90">
              Kelola master data, aset paroki, dan konfigurasi akses dari satu tempat. Role aktif menentukan modul dan
              scope data yang bisa Anda lihat.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium">{formatRole(user.role)}</span>
              {user.unitId ? (
                <span className="rounded-full bg-white/10 px-4 py-1.5 text-sm text-emerald-100">Scope: Unit</span>
              ) : null}
              {user.badanHukumId ? (
                <span className="rounded-full bg-white/10 px-4 py-1.5 text-sm text-emerald-100">Scope: Badan hukum</span>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-1">
            <Card className="border-white/70 bg-white/85 shadow-sm backdrop-blur">
              <CardHeader className="pb-2">
                <CardDescription>Izin aktif</CardDescription>
                <CardTitle className="text-3xl font-semibold tabular-nums">{permissionCount}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600">Permission efektif dari role Anda.</CardContent>
            </Card>
            <Card className="border-white/70 bg-white/85 shadow-sm backdrop-blur">
              <CardHeader className="pb-2">
                <CardDescription>Modul tersedia</CardDescription>
                <CardTitle className="text-3xl font-semibold tabular-nums">{visibleModules.length}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600">Berdasarkan permission yang dimiliki.</CardContent>
            </Card>
            <Card className="border-white/70 bg-white/85 shadow-sm backdrop-blur">
              <CardHeader className="pb-2">
                <CardDescription>Status sesi</CardDescription>
                <CardTitle className="flex items-center gap-2 text-xl font-semibold text-emerald-800">
                  <UserRound className="h-5 w-5" />
                  Aktif
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600">Session aman via cookie httpOnly.</CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Modul</p>
              <h2 className="font-display text-2xl font-semibold text-slate-950">Akses cepat</h2>
            </div>
          </div>

          {visibleModules.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleModules.map((module) => {
                const Icon = module.icon;

                return (
                  <Link
                    key={module.title}
                    href={module.href}
                    className="group rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30"
                  >
                    <div className="mb-5 flex items-start justify-between gap-4">
                      <div className={`rounded-2xl p-3 ${module.accent}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <ArrowRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-700" />
                    </div>
                    <h3 className="font-display text-xl font-semibold text-slate-950">{module.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{module.description}</p>
                    <span className="mt-5 inline-flex text-sm font-medium text-emerald-800">Buka modul</span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <Card className="border-dashed border-slate-300 bg-white/70">
              <CardHeader>
                <CardTitle>Tidak ada modul tersedia</CardTitle>
                <CardDescription>
                  Role Anda belum memiliki permission untuk modul utama. Hubungi administrator sistem.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </section>
      </div>
    </main>
  );
}
