import Link from "next/link";
import { ArrowRight, Calculator, ScrollText, ShieldCheck, Users } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { auditPageView } from "@/lib/audit";
import { hasPermission } from "@/lib/authz";
import { listRbacRoles, listRbacUsers } from "@/lib/rbac";
import { listTaxDepreciationGroups } from "@/lib/tax-master";
import { requireAnyPageAccess } from "@/lib/server-guards";

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
    description: "Kelompok fiskal.",
    href: "/settings/tax-master",
    icon: Calculator,
    permission: "tax-master.read",
    accent: "bg-emerald-50 text-emerald-800",
    countLabel: ({ taxGroups }) => `${taxGroups} kelompok fiskal`,
  },
  {
    title: "Audit Log",
    description: "Riwayat aktivitas.",
    href: "/settings/audit",
    icon: ScrollText,
    permission: "audit.read",
    accent: "bg-amber-50 text-amber-800",
  },
  {
    title: "Pengguna",
    description: "Akun dan scope.",
    href: "/settings/rbac/users",
    icon: Users,
    permission: "rbac.manage",
    accent: "bg-violet-50 text-violet-800",
    countLabel: ({ users }) => `${users} akun terdaftar`,
  },
  {
    title: "Role & Permission",
    description: "Role dan permission.",
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
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <PageHeader
        eyebrow="Pengaturan"
        title="Konfigurasi sistem"
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleModules.map((module) => {
          const Icon = module.icon;

          return (
            <Link key={module.title} href={module.href} className="group">
              <Card className="h-full border-slate-200 bg-white shadow-sm transition hover:border-emerald-200 hover:shadow-md">
                <CardHeader className="flex-row items-start gap-4 space-y-0 p-5">
                  <div className={`rounded-xl p-3 ${module.accent}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-2">
                    <CardTitle className="text-lg">{module.title}</CardTitle>
                    <CardDescription className="text-sm leading-6">
                      {module.countLabel ? `${module.countLabel(hubCounts)} - ${module.description}` : module.description}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-5 pt-0">
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

    </main>
  );
}
