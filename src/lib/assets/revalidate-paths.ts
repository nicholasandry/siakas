import { revalidatePath } from "next/cache";

export function revalidateAssetPaths(assetId: string, assetType?: string | null) {
  revalidatePath("/assets");
  if (assetType) {
    revalidatePath(`/assets/${assetType}`);
  }
  revalidatePath(`/assets/${assetId}`);
  revalidatePath(`/assets/${assetId}/history`);
}
