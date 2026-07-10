import assert from "node:assert/strict";
import test from "node:test";

import {
  assertLocationKindMatchesAssetType,
  filterLocationsForAssetType,
  getLocationKindForAssetType,
} from "@/lib/assets/location-kind";

const locations = [
  { id: "loc-ruang", locationKind: "ruang", name: "Ruang TU" },
  { id: "loc-garasi", locationKind: "garasi_parkir", name: "Garasi" },
];

test("getLocationKindForAssetType maps benda and kendaraan", () => {
  assert.equal(getLocationKindForAssetType("benda"), "ruang");
  assert.equal(getLocationKindForAssetType("kendaraan"), "garasi_parkir");
  assert.equal(getLocationKindForAssetType("tanah"), null);
});

test("filterLocationsForAssetType keeps only matching kind", () => {
  assert.deepEqual(
    filterLocationsForAssetType(locations, "benda").map((item) => item.id),
    ["loc-ruang"]
  );
  assert.deepEqual(
    filterLocationsForAssetType(locations, "kendaraan").map((item) => item.id),
    ["loc-garasi"]
  );
});

test("filterLocationsForAssetType keeps current location for legacy mismatch", () => {
  assert.deepEqual(
    filterLocationsForAssetType(locations, "benda", "loc-garasi").map((item) => item.id),
    ["loc-ruang", "loc-garasi"]
  );
});

test("assertLocationKindMatchesAssetType rejects mismatched kind", () => {
  assert.throws(() => assertLocationKindMatchesAssetType("ruang", "kendaraan"), /garasi/);
  assert.throws(() => assertLocationKindMatchesAssetType("garasi_parkir", "benda"), /ruang/);
  assert.doesNotThrow(() => assertLocationKindMatchesAssetType("ruang", "benda"));
});
