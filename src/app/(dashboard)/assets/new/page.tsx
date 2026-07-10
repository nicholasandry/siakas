import { redirect } from "next/navigation";

import { getAssetTypeConfig } from "@/lib/asset-types";

export default async function LegacyNewAssetPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const assetType = getAssetTypeConfig(type)?.type ?? "tanah";
  redirect(`/assets/${assetType}/new`);
}
