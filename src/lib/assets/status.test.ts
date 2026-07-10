import assert from "node:assert/strict";
import test from "node:test";

import { assetCommonSchema } from "@/lib/validators/asset";
import {
  canStartAssetDisposalFromAssetStatus,
  getStartAssetDisposalHref,
  isActiveOperationalAssetStatus,
  isAssetVisibleInActiveList,
  isInactiveAssetStatus,
  normalizeAssetLoanedTo,
  normalizeLegacyAssetStatus,
  assertLoanedToInvariant,
  assertOnLoanStatusNote,
  resolveLoanedTo,
} from "@/lib/assets/status";

const baseAssetPayload = {
  code: "AST-TEST",
  name: "Aset Test",
  assetType: "benda",
  ownershipLevel: "keuskupan",
  unitId: "11111111-1111-1111-1111-111111111111",
  badanHukumId: "",
  locationId: "",
  acquisitionDate: "",
  acquisitionValue: "0",
  legalStatus: "milik sendiri",
  ownerName: "",
  condition: "",
  notes: "",
  depreciationGroupId: "",
};

test("asset status can be updated to on loan", () => {
  const parsed = assetCommonSchema.parse({
    ...baseAssetPayload,
    status: "on_loan",
    currentStatus: "active",
    statusNote: "Paroki St. Petrus",
  });
  assert.equal(parsed.status, "on_loan");
});

test("asset status can be updated to in maintenance", () => {
  const parsed = assetCommonSchema.parse({ ...baseAssetPayload, status: "in_maintenance" });
  assert.equal(parsed.status, "in_maintenance");
});

test("on loan and in maintenance stay visible in active asset list", () => {
  assert.equal(isAssetVisibleInActiveList("on_loan"), true);
  assert.equal(isAssetVisibleInActiveList("in_maintenance"), true);
  assert.equal(isActiveOperationalAssetStatus("on_loan"), true);
  assert.equal(isActiveOperationalAssetStatus("in_maintenance"), true);
});

test("delete asset entry point points to disposal process, not asset delete", () => {
  const href = getStartAssetDisposalHref("asset-1");
  assert.equal(href, "/assets/asset-1/disposal/new");
  assert.equal(href.includes("delete"), false);
});

test("disposal action is blocked when asset has active disposal or final disposal status", () => {
  assert.equal(canStartAssetDisposalFromAssetStatus("active", true), false);
  assert.equal(canStartAssetDisposalFromAssetStatus("sold", false), false);
  assert.equal(canStartAssetDisposalFromAssetStatus("on_loan", false), false);
  assert.equal(canStartAssetDisposalFromAssetStatus("in_maintenance", false), true);
});

test("archived legacy status normalizes to inactive", () => {
  assert.equal(normalizeLegacyAssetStatus("archived"), "inactive");
  assert.equal(isInactiveAssetStatus("archived"), true);
  assert.equal(isInactiveAssetStatus("inactive"), true);
});

test("on_loan borrower note is required only when status changes", () => {
  assert.doesNotThrow(() =>
    assertOnLoanStatusNote({
      nextStatus: "on_loan",
      currentStatus: "on_loan",
    })
  );
  assert.throws(
    () =>
      assertOnLoanStatusNote({
        nextStatus: "on_loan",
        currentStatus: "active",
      }),
    /Catatan peminjam wajib/
  );
});

test("resolveLoanedTo stores borrower only while on_loan", () => {
  assert.equal(
    resolveLoanedTo({
      nextStatus: "on_loan",
      previousStatus: "active",
      statusNote: "Paroki A",
    }),
    "Paroki A"
  );
  assert.equal(
    resolveLoanedTo({
      nextStatus: "active",
      previousStatus: "on_loan",
      statusNote: "Paroki A",
      currentLoanedTo: "Paroki A",
    }),
    null
  );
  assert.equal(
    resolveLoanedTo({
      nextStatus: "on_loan",
      previousStatus: "on_loan",
      currentLoanedTo: "Paroki A",
    }),
    "Paroki A"
  );
});

test("normalizeAssetLoanedTo clears borrower when status is not on_loan", () => {
  assert.equal(normalizeAssetLoanedTo("active", "Paroki A"), null);
  assert.equal(normalizeAssetLoanedTo("on_loan", " Paroki A "), "Paroki A");
});

test("assertLoanedToInvariant requires borrower for on_loan", () => {
  assert.throws(() => assertLoanedToInvariant("on_loan", null), /Peminjam wajib/);
  assert.doesNotThrow(() => assertLoanedToInvariant("on_loan", "Paroki A"));
  assert.doesNotThrow(() => assertLoanedToInvariant("active", null));
});
