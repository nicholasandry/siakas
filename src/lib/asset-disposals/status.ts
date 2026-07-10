import { assetFinalStatusByMethod, type DisposalMethod, type DisposalStatus } from "@/lib/asset-disposals/constants";

export function nextSubmittedStatus(status: DisposalStatus): DisposalStatus {
  if (status !== "DRAFT") throw new Error("Hanya draft yang dapat diajukan");
  return "SUBMITTED";
}

export function nextReviewStatus(status: DisposalStatus): DisposalStatus {
  if (status !== "SUBMITTED") throw new Error("Hanya disposal yang sudah diajukan yang dapat direview");
  return "UNDER_REVIEW";
}

export function nextApprovalStatus(status: DisposalStatus): DisposalStatus {
  if (status !== "UNDER_REVIEW" && status !== "WAITING_APPROVAL") {
    throw new Error("Disposal harus direview sebelum disetujui");
  }
  return "APPROVED";
}

export function assertCanComplete(status: DisposalStatus) {
  if (status !== "APPROVED") throw new Error("Disposal harus disetujui sebelum diselesaikan");
}

export function getAssetStatusAfterCompletion(method: DisposalMethod) {
  return assetFinalStatusByMethod[method];
}
