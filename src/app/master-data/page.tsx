import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Building2, Layers3 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auditAccessDenied, auditPageView } from "@/lib/audit";
import { redirectForbidden } from "@/lib/action-errors";
import { AuthorizationError, hasPermission } from "@/lib/authz";
import { listBadanHukums, listUnits } from "@/lib/master-data";
import { resolveAccessScope } from "@/lib/scope";
import { getCurrentUser } from "@/lib/session";

const actionClassName =
  "inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const modules = [
  {
    title: "Unit",
    description: "Kelola struktur keuskupan, kevikepan, paroki, unit karya, dan unit usaha.",
    href: "/master-data/units",
    icon: Layers3,
    permission: "unit.read" as const,
    countKey: "units" as const,
  },
  {
    title: "Badan Hukum",
    description: "Kelola yayasan, PT, CV, koperasi, dan badan hukum lain beserta legalitasnya.",
    href: "/master-data/badan-hukum",
    icon: Building2,
    permission: "badan-hukum.read" as const,
    countKey: "badanHukums" as const,
  },
];

export default async function MasterDataPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!hasPermission(user, "unit.read") && !hasPermission(user, "badan-hukum.read")) {
    await auditAccessDenied(user.id, { entity: "master_data", reason: "permission" });
    redirectForbidden("permission");
  }

  let scope;
  try {
    scope = await resolveAccessScope(user);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      await auditAccessDenied(user.id, { entity: "master_data", reason: "scope" });
      redirectForbidden("scope");
    }

    throw error;
  }

  const [units, badanHukums] = await Promise.all([
    hasPermission(user, "unit.read") ? listUnits(scope) : Promise.resolve([]),
    hasPermission(user, "badan-hukum.read") ? listBadanHukums(scope) : Promise.resolve([]),
  ]);

  const counts = { units: units.length, badanHukums: badanHukums.length };
  const visibleModules = modules.filter((module) => hasPermission(user, module.permission));

  await auditPageView(user.id, {
    entity: "master_data",
    view: "hub",
    metadata: counts,
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <section className="flex flex-col gap-4">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Master Data</p>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-3">
            <h1 className="font-display text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
              Data referensi inti sistem
            </h1>
            <p className="text-base leading-7 text-slate-600">
              Kelola unit organisasi dan badan hukum sesuai struktur Keuskupan Surabaya.
            </p>
          </div>
          <Link href="/dashboard" className={actionClassName}>
            Kembali ke dashboard
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {visibleModules.map((module) => {
          const Icon = module.icon;

          return (
            <Card key={module.title} className="border-white/70 bg-white/85 shadow-glow backdrop-blur">
              <CardHeader className="flex-row items-start gap-4 space-y-0">
                <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-900">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-xl">{module.title}</CardTitle>
                  <CardDescription className="text-sm leading-6">{module.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-4">
                <p className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">{counts[module.countKey]}</span> data terdaftar
                </p>
                <Link
                  href={module.href}
                  className="inline-flex items-center gap-1 text-sm font-medium text-emerald-800 hover:underline"
                >
                  Buka modul
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </main>
  );
}
