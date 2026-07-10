import assert from "node:assert/strict";
import test from "node:test";

import {
  describeDisposalPhysicalConditionSource,
  mapAssetConditionToDisposalPhysicalCondition,
} from "@/lib/assets/disposal-condition";

test("mapAssetConditionToDisposalPhysicalCondition maps empty condition to GOOD", () => {
  assert.equal(mapAssetConditionToDisposalPhysicalCondition(null), "GOOD");
  assert.equal(mapAssetConditionToDisposalPhysicalCondition(""), "GOOD");
});

test("mapAssetConditionToDisposalPhysicalCondition maps standard asset conditions", () => {
  assert.equal(mapAssetConditionToDisposalPhysicalCondition("baik"), "GOOD");
  assert.equal(mapAssetConditionToDisposalPhysicalCondition("rusak ringan"), "LIGHT_DAMAGE");
  assert.equal(mapAssetConditionToDisposalPhysicalCondition("rusak berat"), "HEAVY_DAMAGE");
  assert.equal(mapAssetConditionToDisposalPhysicalCondition("tidak layak pakai"), "TOTAL_LOSS");
  assert.equal(mapAssetConditionToDisposalPhysicalCondition("hilang"), "LOST");
});

test("mapAssetConditionToDisposalPhysicalCondition maps generic rusak to medium damage", () => {
  assert.equal(mapAssetConditionToDisposalPhysicalCondition("rusak"), "MEDIUM_DAMAGE");
});

test("describeDisposalPhysicalConditionSource includes the current asset condition label", () => {
  assert.match(describeDisposalPhysicalConditionSource("baik"), /Baik/);
  assert.match(describeDisposalPhysicalConditionSource(null), /Belum diisi/);
});
