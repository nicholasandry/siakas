import { NewAssetPage } from "@/components/assets/new-asset-page";

export default async function NewLandAssetPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <NewAssetPage assetType="tanah" error={error} />;
}
