import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Building2, Layers3, MapPin, PackageSearch, SlidersHorizontal, Tags } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { auditAccessDenied, auditPageView } from "@/lib/audit";
import { redirectForbidden } from "@/lib/action-errors";
import { AuthorizationError, hasPermission } from "@/lib/authz";
import { listAssetStatusOptions } from "@/lib/asset-statuses";
import { listAssetCategoryOptions } from "@/lib/asset-categories";
import { listDisposalLookupOptions } from "@/lib/asset-disposals/lookups";
import { listAssetLocations, listBadanHukums, listUnits } from "@/lib/master-data";
import { resolveAccessScope } from "@/lib/scope";
import { getCurrentUser } from "@/lib/session";

const modules = [
  {
    title: "Unit",
    description: "Struktur unit.",
    href: "/master-data/units",
    icon: Layers3,
    permission: "unit.read" as const,
    countKey: "units" as const,
  },
  {
    title: "Badan Hukum",
    description: "Data badan hukum.",
    href: "/master-data/badan-hukum",
    icon: Building2,
    permission: "badan-hukum.read" as const,
    countKey: "badanHukums" as const,
  },
  {
    title: "Lokasi",
    description: "Ruangan dan lokasi aset per unit.",
    href: "/master-data/lokasi",
    icon: MapPin,
    permission: "unit.read" as const,
    countKey: "locations" as const,
  },
  {
    title: "Lookup Disposal",
    description: "Pilihan alasan, metode, kondisi, pembeli, penerima, kebijakan, dan kejadian.",
    href: "/master-data/disposal-lookups",
    icon: SlidersHorizontal,
    permission: "rbac.manage" as const,
    countKey: "disposalLookups" as const,
  },
  {
    title: "Status Aset",
    description: "Pilihan status aset pada form dan data aset.",
    href: "/master-data/asset-statuses",
    icon: Tags,
    permission: "rbac.manage" as const,
    countKey: "assetStatuses" as const,
  },
  {
    title: "Kategori Aset",
    description: "Kategori bangunan, kendaraan, benda, pairing pencarian, dan mapping depresiasi.",
    href: "/master-data/asset-categories",
    icon: PackageSearch,
    permission: "rbac.manage" as const,
    countKey: "assetCategories" as const,
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

  const [units, badanHukums, locations, disposalLookups, assetStatuses, assetCategories] = await Promise.all([
    hasPermission(user, "unit.read") ? listUnits(scope) : Promise.resolve([]),
    hasPermission(user, "badan-hukum.read") ? listBadanHukums(scope) : Promise.resolve([]),
    hasPermission(user, "unit.read") ? listAssetLocations(scope) : Promise.resolve([]),
    user.role === "superadmin" ? listDisposalLookupOptions() : Promise.resolve([]),
    user.role === "superadmin" ? listAssetStatusOptions() : Promise.resolve([]),
    user.role === "superadmin" ? listAssetCategoryOptions() : Promise.resolve([]),
  ]);

  const counts = { units: units.length, badanHukums: badanHukums.length, locations: locations.length, disposalLookups: disposalLookups.length, assetStatuses: assetStatuses.length, assetCategories: assetCategories.length };
  const visibleModules = modules.filter((module) => ["/master-data/disposal-lookups", "/master-data/asset-statuses", "/master-data/asset-categories"].includes(module.href) ? user.role === "superadmin" : hasPermission(user, module.permission));

  await auditPageView(user.id, {
    entity: "master_data",
    view: "hub",
    metadata: counts,
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <PageHeader
        eyebrow="Master Data"
        title="Master data"
      />

      <section className="grid gap-4 md:grid-cols-2">
        {visibleModules.map((module) => {
          const Icon = module.icon;

          return (
            <Card key={module.title} className="border-slate-200 bg-white shadow-sm">
              <CardHeader className="flex-row items-start gap-4 space-y-0 p-5">
                <div className="rounded-xl bg-emerald-50 p-3 text-emerald-900">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-xl">{module.title}</CardTitle>
                  <CardDescription className="text-sm leading-6">{module.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-4 p-5 pt-0">
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
