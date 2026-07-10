import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDonationUnitSelectGroups,
  describeDonationRecipient,
  isInternalDonationDisposal,
  isDonationRecipientKind,
} from "@/lib/asset-disposals/donation-recipient";

test("isDonationRecipientKind validates donation recipient kinds", () => {
  assert.equal(isDonationRecipientKind("INTERNAL_UNIT"), true);
  assert.equal(isDonationRecipientKind("EXTERNAL_PARTY"), true);
  assert.equal(isDonationRecipientKind("OTHER_PARISH"), false);
});

test("buildDonationUnitSelectGroups groups units and excludes current unit", () => {
  const groups = buildDonationUnitSelectGroups(
    [
      { id: "u1", name: "Paroki B", kind: "paroki", code: "PB" },
      { id: "u2", name: "Paroki A", kind: "paroki", code: "PA" },
      { id: "u3", name: "Klinik A", kind: "unit karya", code: "KA" },
    ],
    { excludeUnitId: "u1" }
  );

  assert.equal(groups.length, 2);
  assert.equal(groups[0]?.label, "Paroki");
  assert.equal(groups[0]?.options.length, 1);
  assert.equal(groups[0]?.options[0]?.value, "u2");
  assert.equal(groups[1]?.label, "Unit karya");
});

test("isInternalDonationDisposal detects internal donation disposals", () => {
  assert.equal(
    isInternalDonationDisposal({
      disposalMethod: "DONATION",
      donationRecipientKind: "INTERNAL_UNIT",
      recipientUnitId: "unit-1",
    }),
    true
  );
  assert.equal(
    isInternalDonationDisposal({
      disposalMethod: "DONATION",
      donationRecipientKind: "EXTERNAL_PARTY",
      recipientUnitId: null,
    }),
    false
  );
});

test("describeDonationRecipient formats internal and external labels", () => {
  assert.equal(
    describeDonationRecipient({
      donationRecipientKind: "INTERNAL_UNIT",
      recipientName: "Paroki A",
      recipientUnitName: "Paroki Santo Yusup",
    }),
    "Unit internal: Paroki Santo Yusup"
  );
  assert.equal(
    describeDonationRecipient({
      donationRecipientKind: "EXTERNAL_PARTY",
      recipientName: "Yayasan ABC",
    }),
    "Pihak lain: Yayasan ABC"
  );
});
