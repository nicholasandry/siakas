import assert from "node:assert/strict";
import test from "node:test";

import { formatHistoryTitle } from "@/lib/assets/histories.display";
import { hasPlacementHistoryValueChanged } from "@/lib/assets/histories.helpers";

test("hasPlacementHistoryValueChanged detects unit and location changes", () => {
  assert.equal(
    hasPlacementHistoryValueChanged({ unitId: "u1", locationId: "l1" }, { unitId: "u1", locationId: "l1" }),
    false
  );
  assert.equal(
    hasPlacementHistoryValueChanged({ unitId: "u1", locationId: "l1" }, { unitId: "u2", locationId: "l1" }),
    true
  );
  assert.equal(
    hasPlacementHistoryValueChanged({ unitId: "u1", locationId: "l1" }, { unitId: "u1", locationId: "l2" }),
    true
  );
});

test("formatHistoryTitle renders placement changes", () => {
  const title = formatHistoryTitle({
    kind: "placement",
    id: "placement-1",
    recordedAt: new Date("2026-07-09T10:00:00.000Z"),
    source: "donation_internal",
    notes: null,
    recordedByName: "Admin",
    relatedEntityType: "asset_disposal",
    relatedEntityId: "disposal-1",
    previousUnitId: "u1",
    newUnitId: "u2",
    previousLocationId: "l1",
    newLocationId: null,
    previousUnitName: "Paroki A",
    newUnitName: "Paroki B",
    previousLocationName: "Ruang Rapat",
    newLocationName: null,
  });

  assert.match(title, /Paroki A/);
  assert.match(title, /Paroki B/);
  assert.match(title, /Ruang Rapat/);
});
