import assert from "node:assert/strict";
import test from "node:test";

import { assetCommonSchema } from "./asset";

function parseAsset(data: Record<string, string>) {
  return assetCommonSchema.safeParse(data);
}

const baseRecord = {
  code: "AST-001",
  name: "Aset uji",
  ownershipLevel: "keuskupan",
  unitId: "unit-1",
  locationId: "loc-1",
  status: "active",
};

test("bangunan accepts valid condition", () => {
  const result = parseAsset({
    ...baseRecord,
    assetType: "bangunan",
    condition: "sangat baik/terawat",
  });

  assert.equal(result.success, true);
});

test("bangunan rejects invalid condition", () => {
  const result = parseAsset({
    ...baseRecord,
    assetType: "bangunan",
    condition: "baru",
  });

  assert.equal(result.success, false);
});

test("kendaraan validates vehicleCondition", () => {
  const valid = parseAsset({
    ...baseRecord,
    assetType: "kendaraan",
    vehicleCondition: "baik",
  });
  const invalid = parseAsset({
    ...baseRecord,
    assetType: "kendaraan",
    vehicleCondition: "baru",
  });

  assert.equal(valid.success, true);
  assert.equal(invalid.success, false);
});

test("benda accepts valid condition", () => {
  const result = parseAsset({
    ...baseRecord,
    assetType: "benda",
    condition: "rusak",
  });

  assert.equal(result.success, true);
});

test("tanah accepts free-text condition", () => {
  const result = parseAsset({
    ...baseRecord,
    assetType: "tanah",
    condition: "Tanah rata/siap bangun, berkontur bukit",
  });

  assert.equal(result.success, true);
});

test("tanah rejects condition longer than max length", () => {
  const result = parseAsset({
    ...baseRecord,
    assetType: "tanah",
    condition: "x".repeat(65),
  });

  assert.equal(result.success, false);
});

test("on_loan requires borrower note when status changes", () => {
  const missingNote = parseAsset({
    ...baseRecord,
    assetType: "benda",
    status: "on_loan",
    currentStatus: "active",
  });
  const withNote = parseAsset({
    ...baseRecord,
    assetType: "benda",
    status: "on_loan",
    currentStatus: "active",
    statusNote: "Paroki St. Petrus",
  });
  const unchangedOnLoan = parseAsset({
    ...baseRecord,
    assetType: "benda",
    status: "on_loan",
    currentStatus: "on_loan",
  });

  assert.equal(missingNote.success, false);
  assert.equal(withNote.success, true);
  assert.equal(unchangedOnLoan.success, true);
});

test("benda aktif wajib ruang penempatan untuk unit keuskupan", () => {
  const missing = parseAsset({
    ...baseRecord,
    assetType: "benda",
    status: "active",
    locationId: "",
  });
  const provided = parseAsset({
    ...baseRecord,
    assetType: "benda",
    status: "active",
    locationId: "loc-1",
  });
  const inactive = parseAsset({
    ...baseRecord,
    assetType: "benda",
    status: "inactive",
    locationId: "",
  });

  assert.equal(missing.success, false);
  assert.equal(provided.success, true);
  assert.equal(inactive.success, true);
});

test("kendaraan aktif wajib garasi atau area parkir", () => {
  const missing = parseAsset({
    ...baseRecord,
    assetType: "kendaraan",
    status: "active",
    locationId: "",
  });

  assert.equal(missing.success, false);
});

test("tanah dan bangunan tidak wajib master lokasi", () => {
  const tanah = parseAsset({
    ...baseRecord,
    assetType: "tanah",
    status: "active",
    locationId: "",
  });
  const bangunan = parseAsset({
    ...baseRecord,
    assetType: "bangunan",
    status: "active",
    locationId: "",
  });

  assert.equal(tanah.success, true);
  assert.equal(bangunan.success, true);
});
