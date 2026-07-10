import assert from "node:assert/strict";
import test from "node:test";

import {
  assetLoanHistoryEventTypes,
  buildStatusHistoryNote,
  hasHistoryValueChanged,
  hasStatusHistoryValueChanged,
  normalizeHistoryValue,
  resolveLoanHistoryEventType,
  resolveRevertStatus,
} from "./histories.helpers";
import { isManuallyEditableAssetStatus, isStatusManagedByDisposal } from "./status";

test("normalizeHistoryValue trims and nullifies empty strings", () => {
  assert.equal(normalizeHistoryValue("  baik  "), "baik");
  assert.equal(normalizeHistoryValue(""), null);
  assert.equal(normalizeHistoryValue(null), null);
});

test("hasHistoryValueChanged ignores empty vs null", () => {
  assert.equal(hasHistoryValueChanged(null, ""), false);
  assert.equal(hasHistoryValueChanged("baik", "rusak"), true);
});

test("resolveRevertStatus falls back to active", () => {
  assert.equal(resolveRevertStatus(null), "active");
  assert.equal(resolveRevertStatus("on_loan"), "on_loan");
});

test("buildStatusHistoryNote formats on_loan borrower note", () => {
  assert.equal(buildStatusHistoryNote("on_loan", "Paroki A"), "Dipinjamkan kepada: Paroki A");
  assert.equal(buildStatusHistoryNote("inactive", "Disimpan di gudang"), "Disimpan di gudang");
  assert.equal(buildStatusHistoryNote("active", "   "), null);
});

test("resolveLoanHistoryEventType maps loan lifecycle events", () => {
  assert.equal(resolveLoanHistoryEventType(null, "Paroki A"), assetLoanHistoryEventTypes.LOAN_START);
  assert.equal(resolveLoanHistoryEventType("Paroki A", null), assetLoanHistoryEventTypes.LOAN_END);
  assert.equal(resolveLoanHistoryEventType("Paroki A", "Paroki B"), assetLoanHistoryEventTypes.LOAN_UPDATE);
});

test("hasStatusHistoryValueChanged treats archived as inactive", () => {
  assert.equal(hasStatusHistoryValueChanged("archived", "inactive"), false);
  assert.equal(hasStatusHistoryValueChanged("archived", "active"), true);
  assert.equal(hasStatusHistoryValueChanged("inactive", "archived"), false);
});

test("manual status whitelist excludes disposal-managed statuses", () => {
  assert.equal(isManuallyEditableAssetStatus("active"), true);
  assert.equal(isManuallyEditableAssetStatus("on_loan"), true);
  assert.equal(isManuallyEditableAssetStatus("inactive"), true);
  assert.equal(isManuallyEditableAssetStatus("archived"), false);
  assert.equal(isManuallyEditableAssetStatus("under_disposal"), false);
  assert.equal(isManuallyEditableAssetStatus("sold"), false);
  assert.equal(isStatusManagedByDisposal("under_disposal"), true);
  assert.equal(isStatusManagedByDisposal("sold"), true);
});
