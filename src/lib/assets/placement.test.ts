import assert from "node:assert/strict";
import test from "node:test";

import {
  getPlacementLocationFieldLabel,
  needsPlacementLocationReminder,
  requiresPlacementLocation,
  usesMasterDataPlacementLocation,
} from "@/lib/assets/placement";

test("usesMasterDataPlacementLocation only applies to benda and kendaraan", () => {
  assert.equal(usesMasterDataPlacementLocation("benda"), true);
  assert.equal(usesMasterDataPlacementLocation("kendaraan"), true);
  assert.equal(usesMasterDataPlacementLocation("tanah"), false);
  assert.equal(usesMasterDataPlacementLocation("bangunan"), false);
});

test("getPlacementLocationFieldLabel returns type-specific labels", () => {
  assert.equal(getPlacementLocationFieldLabel("benda"), "Ruang penempatan");
  assert.equal(getPlacementLocationFieldLabel("kendaraan"), "Garasi / area parkir");
});

test("requiresPlacementLocation only for active movable assets", () => {
  assert.equal(requiresPlacementLocation("benda", "active"), true);
  assert.equal(requiresPlacementLocation("benda", "inactive"), false);
  assert.equal(requiresPlacementLocation("tanah", "active"), false);
});

test("needsPlacementLocationReminder detects active movable assets without location", () => {
  assert.equal(
    needsPlacementLocationReminder({
      assetType: "benda",
      ownershipLevel: "keuskupan",
      status: "active",
      locationId: null,
    }),
    true
  );
  assert.equal(
    needsPlacementLocationReminder({
      assetType: "benda",
      ownershipLevel: "keuskupan",
      status: "active",
      locationId: "loc-1",
    }),
    false
  );
});
