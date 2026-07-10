import { NextResponse } from "next/server";

import { getAsset } from "@/lib/assets";
import { listAllUnifiedAssetHistories } from "@/lib/assets/histories";
import { buildAssetHistoryCsv } from "@/lib/assets/histories.display";
import { parseAssetHistoryFilter } from "@/lib/assets/histories.shared";
import { assertAssetInScope } from "@/lib/scope";
import { requireAuthenticatedScope } from "@/lib/server-guards";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const filter = parseAssetHistoryFilter(searchParams.get("filter") ?? undefined);

  const { scope } = await requireAuthenticatedScope("asset.read");
  const asset = await getAsset(id);
  if (!asset) {
    return new NextResponse("Aset tidak ditemukan", { status: 404 });
  }

  assertAssetInScope(scope, asset);

  const items = await listAllUnifiedAssetHistories(id, filter);
  const csv = `\uFEFF${buildAssetHistoryCsv(items)}`;
  const safeCode = asset.code.replace(/[^\w.-]+/g, "_");
  const filename = `riwayat-${safeCode}-${filter}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
