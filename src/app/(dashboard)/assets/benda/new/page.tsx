import { NewAssetPage } from "@/components/assets/new-asset-page";

export default async function NewItemAssetPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <NewAssetPage assetType="benda" error={error} />;
}
