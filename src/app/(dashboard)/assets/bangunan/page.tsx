import { AssetListPage } from "@/components/assets/asset-list-page";

export default async function BuildingAssetsPage({ searchParams }: { searchParams: Promise<{ error?: string; q?: string; sort?: string; page?: string; pageSize?: string }> }) {
  const params = await searchParams;
  return <AssetListPage error={params.error} assetType="bangunan" searchParams={params} />;
}
