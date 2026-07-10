import assert from "node:assert/strict";
import test from "node:test";

import { assetQuickPlacementSchema } from "@/lib/validators/asset-quick-placement";

function parsePlacement(data: Record<string, string>) {
  return assetQuickPlacementSchema.safeParse(data);
}

test("quick placement requires a different destination location", () => {
  const unchanged = parsePlacement({
    assetId: "asset-1",
    assetType: "benda",
    currentLocationId: "loc-1",
    currentStatus: "active",
    locationId: "loc-1",
  });
  const changed = parsePlacement({
    assetId: "asset-1",
    assetType: "benda",
    currentLocationId: "loc-1",
    currentStatus: "active",
    locationId: "loc-2",
  });

  assert.equal(unchanged.success, false);
  assert.equal(changed.success, true);
});

test("quick placement only allows benda and kendaraan", () => {
  const invalid = parsePlacement({
    assetId: "asset-1",
    assetType: "tanah",
    currentLocationId: "",
    currentStatus: "active",
    locationId: "loc-1",
  });

  assert.equal(invalid.success, false);
});
