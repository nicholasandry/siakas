import { NewAssetPage } from "@/components/assets/new-asset-page";

export default async function NewVehicleAssetPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <NewAssetPage assetType="kendaraan" error={error} />;
}
