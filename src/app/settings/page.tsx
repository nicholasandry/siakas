import Link from "next/link";
import { ArrowRight, Calculator, ClipboardList, ScrollText, ShieldCheck, Users } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auditPageView } from "@/lib/audit";
import { hasPermission } from "@/lib/authz";
import { listRbacRoles, listRbacUsers } from "@/lib/rbac";
import { listTaxDepreciationGroups } from "@/lib/tax-master";
import { requireAnyPageAccess } from "@/lib/server-guards";

const actionClassName =
  "inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type SettingsModule = {
  title: string;
  description: string;
  href: string;
  icon: typeof ScrollText;
  permission: "audit.read" | "rbac.manage" | "tax-master.read";
  accent: string;
  countLabel?: (counts: { users: number; roles: number; taxGroups: number }) => string;
};

const modules: SettingsModule[] = [
  {
    title: "Master Pajak",
    description: "Kelompok fiskal dan aturan depresiasi per tahun pajak.",
    href: "/settings/tax-master",
    icon: Calculator,
    permission: "tax-master.read",
    accent: "bg-emerald-50 text-emerald-800",
    countLabel: ({ taxGroups }) => `${taxGroups} kelompok fiskal`,
  },
  {
    title: "Audit Log",
    description: "Riwayat login, create, update, dan delete di seluruh modul.",
    href: "/settings/audit",
    icon: ScrollText,
    permission: "audit.read",
    accent: "bg-amber-50 text-amber-800",
  },
  {
    title: "Pengguna",
    description: "Kelola akun, role, unit scope, dan status aktif pengguna.",
    href: "/settings/rbac/users",
    icon: Users,
    permission: "rbac.manage",
    accent: "bg-violet-50 text-violet-800",
    countLabel: ({ users }) => `${users} akun terdaftar`,
  },
  {
    title: "Role & Permission",
    description: "Atur permission per role sesuai kebijakan akses organisasi.",
    href: "/settings/rbac/roles",
    icon: ShieldCheck,
    permission: "rbac.manage",
    accent: "bg-sky-50 text-sky-800",
    countLabel: ({ roles }) => `${roles} role terdaftar`,
  },
];

export default async function SettingsPage() {
  const user = await requireAnyPageAccess(["audit.read", "rbac.manage", "tax-master.read"]);
  const visibleModules = modules.filter((module) => hasPermission(user, module.permission));

  const [rbacCounts, taxGroups] = await Promise.all([
    hasPermission(user, "rbac.manage")
      ? Promise.all([listRbacUsers(), listRbacRoles()]).then(([users, roles]) => ({
          users: users.length,
          roles: roles.length,
        }))
      : Promise.resolve({ users: 0, roles: 0 }),
    hasPermission(user, "tax-master.read") ? listTaxDepreciationGroups() : Promise.resolve([]),
  ]);

  const hubCounts = { ...rbacCounts, taxGroups: taxGroups.length };

  await auditPageView(user.id, {
    entity: "settings",
    view: "hub",
    metadata: { modules: visibleModules.map((module) => module.title), ...hubCounts },
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <section className="flex flex-col gap-4">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Settings</p>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-3">
            <h1 className="font-display text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">Konfigurasi sistem</h1>
            <p className="text-base leading-7 text-slate-600">
              Kelola audit trail, master pajak, pengguna, dan kebijakan role-based access control.
            </p>
          </div>
          <Link href="/dashboard" className={actionClassName}>
            Kembali ke dashboard
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleModules.map((module) => {
          const Icon = module.icon;

          return (
            <Link key={module.title} href={module.href} className="group">
              <Card className="h-full border-white/70 bg-white/85 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-glow">
                <CardHeader className="flex-row items-start gap-4 space-y-0">
                  <div className={`rounded-2xl p-3 ${module.accent}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-2">
                    <CardTitle className="text-xl">{module.title}</CardTitle>
                    <CardDescription className="text-sm leading-6">
                      {module.countLabel ? `${module.countLabel(hubCounts)} — ${module.description}` : module.description}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-800 group-hover:underline">
                    Buka modul
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>

      {hasPermission(user, "audit.read") ? (
        <Card className="border-dashed border-amber-200 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="h-5 w-5 text-amber-800" />
              Tentang audit log
            </CardTitle>
            <CardDescription>
              Setiap mutasi data (unit, badan hukum, aset) dan login berhasil dicatat otomatis beserta IP dan user agent.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}
    </main>
  );
}
