import type { GainLossType } from "@/lib/asset-disposals/constants";

export function toIntegerRupiah(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = typeof value === "number" ? value : Number(String(value).replace(/[^\d-]/g, ""));
  if (!Number.isFinite(parsed)) return 0;
  return Math.trunc(parsed);
}

export function calculateBookValue(acquisitionValue: string | number | null | undefined, accumulatedDepreciationValue: string | number | null | undefined) {
  return toIntegerRupiah(acquisitionValue) - toIntegerRupiah(accumulatedDepreciationValue);
}

export function calculateSaleNetAmount(saleGrossAmount: string | number | null | undefined, saleCostAmount: string | number | null | undefined = 0) {
  return toIntegerRupiah(saleGrossAmount) - toIntegerRupiah(saleCostAmount);
}

export function calculateDisposalGainLoss(saleNetAmount: string | number | null | undefined, bookValueAtDisposal: string | number | null | undefined) {
  return toIntegerRupiah(saleNetAmount) - toIntegerRupiah(bookValueAtDisposal);
}

export function getGainLossType(amount: string | number | null | undefined): GainLossType {
  const value = toIntegerRupiah(amount);
  if (value > 0) return "GAIN";
  if (value < 0) return "LOSS";
  return "BREAK_EVEN";
}
