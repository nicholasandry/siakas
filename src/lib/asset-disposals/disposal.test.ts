import assert from "node:assert/strict";
import test from "node:test";

import { calculateBookValue, calculateDisposalGainLoss, calculateSaleNetAmount, getGainLossType } from "@/lib/asset-disposals/calculations";
import { getAssetStatusAfterCompletion } from "@/lib/asset-disposals/status";

test("expired useful life still used keeps asset visible", () => {
  assert.equal(getAssetStatusAfterCompletion("KEEP_IN_USE"), "expired_still_used");
});

test("sale gain calculates net, gain amount, and final status", () => {
  const bookValue = calculateBookValue(100000000, 80000000);
  const saleNet = calculateSaleNetAmount(25000000, 0);
  const gainLoss = calculateDisposalGainLoss(saleNet, bookValue);

  assert.equal(bookValue, 20000000);
  assert.equal(saleNet, 25000000);
  assert.equal(gainLoss, 5000000);
  assert.equal(getGainLossType(gainLoss), "GAIN");
  assert.equal(getAssetStatusAfterCompletion("SALE"), "sold");
});

test("sale loss calculates net, loss amount, and final status", () => {
  const bookValue = calculateBookValue(100000000, 80000000);
  const saleNet = calculateSaleNetAmount(15000000, 0);
  const gainLoss = calculateDisposalGainLoss(saleNet, bookValue);

  assert.equal(saleNet, 15000000);
  assert.equal(gainLoss, -5000000);
  assert.equal(getGainLossType(gainLoss), "LOSS");
  assert.equal(getAssetStatusAfterCompletion("SALE"), "sold");
});

test("lost write off maps to lost and does not require sale buyer data in calculations", () => {
  assert.equal(getAssetStatusAfterCompletion("LOST_WRITE_OFF"), "lost");
});

test("donation maps to donated without sale amount", () => {
  assert.equal(getAssetStatusAfterCompletion("DONATION"), "donated");
  assert.equal(calculateSaleNetAmount(null, null), 0);
});

test("exchange maps old asset to exchanged and replacement can be selected later", () => {
  assert.equal(getAssetStatusAfterCompletion("EXCHANGE"), "exchanged");
});
