import { NewAssetPage } from "@/components/assets/new-asset-page";

export default async function NewBuildingAssetPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <NewAssetPage assetType="bangunan" error={error} />;
}
