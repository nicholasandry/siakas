import { redirect } from "next/navigation";

import { AssetDashboardPage } from "@/components/assets/dashboard/asset-dashboard-page";
import { EmptyState } from "@/components/ui/empty-state";
import { auditPageView } from "@/lib/audit";
import { getAssetDashboardData } from "@/lib/asset-dashboard/asset-dashboard.service";
import { requireAuthenticatedScope } from "@/lib/server-guards";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardAsetPage({ searchParams }: PageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const { user, scope } = await requireAuthenticatedScope("asset.read");
  const data = await getAssetDashboardData(user, scope, resolvedSearchParams);

  if ("error" in data) {
    if (data.error === "FORBIDDEN_DESCENDANT") {
      redirect("/forbidden?reason=scope");
    }

    return (
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
        <EmptyState title="Data belum tersedia" description="Anda belum memiliki organisasi yang dapat dipilih." />
      </main>
    );
  }

  await auditPageView(user.id, {
    entity: "asset-dashboard",
    view: "dashboard",
    metadata: data.params,
  });

  return <AssetDashboardPage data={data} />;
}
