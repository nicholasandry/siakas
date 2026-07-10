"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { writeAuditLog } from "@/lib/audit";
import { handleActionFailure } from "@/lib/action-errors";
import { saveAssetUpload } from "@/lib/file-upload";
import {
  completeAssetDisposal,
  createAssetDisposal,
  getAssetDisposalById,
  getAssetDisposalSnapshot,
  setAssetDisposalStatus,
  updateAssetDisposal,
} from "@/lib/asset-disposals";
import { mapAssetConditionToDisposalPhysicalCondition } from "@/lib/assets/disposal-condition";
import { getLatestAssetConditionFromHistory } from "@/lib/assets/histories";
import { revalidateAssetPaths } from "@/lib/assets/revalidate-paths";
import { assertActiveDisposalLookupValues, assertAllowedDisposalMethodForReason } from "@/lib/asset-disposals/lookups";
import type { DisposalStatus } from "@/lib/asset-disposals/constants";
import { assertAssetInScope } from "@/lib/scope";
import { requireAuthenticatedScope } from "@/lib/server-guards";
import { formDataToRecord, parseZod } from "@/lib/validators";
import { assetDisposalSchema } from "@/lib/validators/asset-disposal";

function statusEvent(status: DisposalStatus) {
  return {
    SUBMITTED: "DISPOSAL_SUBMITTED",
    UNDER_REVIEW: "DISPOSAL_REVIEWED",
    WAITING_APPROVAL: "DISPOSAL_REVIEWED",
    APPROVED: "DISPOSAL_APPROVED",
    REJECTED: "DISPOSAL_REJECTED",
    COMPLETED: "DISPOSAL_COMPLETED",
    CANCELLED: "DISPOSAL_CANCELLED",
    DRAFT: "DISPOSAL_UPDATED",
  }[status];
}

async function buildPayload(formData: FormData, userId: string) {
  const parsed = parseZod(assetDisposalSchema, formDataToRecord(formData));
  const snapshot = await getAssetDisposalSnapshot(parsed.assetId);
  const latestCondition = await getLatestAssetConditionFromHistory(parsed.assetId);
  const physicalCondition = mapAssetConditionToDisposalPhysicalCondition(
    latestCondition ?? snapshot.asset.condition
  );
  await assertActiveDisposalLookupValues({
    disposal_reason_type: parsed.disposalReasonType,
    disposal_method: parsed.disposalMethod,
    physical_condition: physicalCondition,
    buyer_type: parsed.buyerType,
    government_policy_type: parsed.governmentPolicyType,
    forced_event_type: parsed.forcedEventType,
  });
  await assertAllowedDisposalMethodForReason(parsed.disposalReasonType, parsed.disposalMethod);
  const documentFields = [
    "saleProofFileId",
    "saleReceiptFileId",
    "handoverDocumentFileId",
    "exchangeAgreementFileId",
    "legalDocumentFileId",
    "lossReportFileId",
    "policeReportFileId",
    "governmentDocumentFileId",
    "inspectionReportFileId",
    "physicalInspectionFileId",
    "deletionMinutesFileId",
    "parishPriestMemoFileId",
    "bishopApprovalFileId",
  ] as const;

  for (const field of documentFields) {
    const upload = formData.get(`${field}Upload`);
    if (upload instanceof File && upload.size > 0) {
      parsed[field] = await saveAssetUpload(upload, parsed.assetId);
    }
  }

  const selectedDocumentFields = formData.getAll("newDisposalDocumentField");
  const selectedDocumentFiles = formData.getAll("newDisposalDocumentFile");

  for (let index = 0; index < selectedDocumentFields.length; index += 1) {
    const field = selectedDocumentFields[index];
    const file = selectedDocumentFiles[index];

    if (!documentFields.includes(field as (typeof documentFields)[number])) {
      continue;
    }

    if (file instanceof File && file.size > 0) {
      parsed[field as (typeof documentFields)[number]] = await saveAssetUpload(file, parsed.assetId);
    }
  }

  const disposalInput = { ...parsed, physicalCondition };

  return {
    parsed: disposalInput,
    snapshot,
    payload: {
      ...disposalInput,
      requestedByUserId: userId,
      acquisitionValue: snapshot.acquisitionValue,
      accumulatedDepreciationValue: snapshot.accumulatedDepreciationValue,
      bookValueAtDisposal: snapshot.bookValueAtDisposal,
    },
  };
}

export async function createAssetDisposalAction(formData: FormData) {
  const assetId = String(formData.get("assetId") ?? "");
  try {
    const { user, scope } = await requireAuthenticatedScope("asset.disposal.create");
    const { snapshot, payload } = await buildPayload(formData, user.id);
    assertAssetInScope(scope, snapshot.asset);

    const disposal = await createAssetDisposal(payload);
    await writeAuditLog({
      actorUserId: user.id,
      action: "DISPOSAL_CREATED",
      entity: "asset_disposal",
      entityId: disposal.id,
      afterData: disposal,
    });

    revalidatePath("/assets/disposals");
    revalidateAssetPaths(assetId, snapshot.asset.assetType);
    redirect(`/assets/disposals/${disposal.id}`);
  } catch (error) {
    await handleActionFailure(error, assetId ? `/assets/${assetId}/disposal/new` : "/assets");
  }
}

export async function updateAssetDisposalAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  try {
    const { user, scope } = await requireAuthenticatedScope("asset.disposal.edit");
    const existing = await getAssetDisposalById(id);
    if (!existing) throw new Error("Disposal tidak ditemukan");
    assertAssetInScope(scope, existing.asset);
    const { payload } = await buildPayload(formData, user.id);

    const disposal = await updateAssetDisposal(id, payload);
    await writeAuditLog({
      actorUserId: user.id,
      action: "DISPOSAL_UPDATED",
      entity: "asset_disposal",
      entityId: disposal.id,
      beforeData: existing.disposal,
      afterData: disposal,
    });

    revalidatePath("/assets/disposals");
    revalidatePath(`/assets/disposals/${id}`);
    revalidateAssetPaths(existing.asset.id, existing.asset.assetType);
    redirect(`/assets/disposals/${id}`);
  } catch (error) {
    await handleActionFailure(error, id ? `/assets/disposals/${id}/edit` : "/assets/disposals");
  }
}

async function transition(formData: FormData, permission: Parameters<typeof requireAuthenticatedScope>[0], status: DisposalStatus) {
  const id = String(formData.get("id") ?? "");
  try {
    const { user, scope } = await requireAuthenticatedScope(permission);
    const existing = await getAssetDisposalById(id);
    if (!existing) throw new Error("Disposal tidak ditemukan");
    assertAssetInScope(scope, existing.asset);

    const row =
      status === "COMPLETED"
        ? await completeAssetDisposal(id, user.id)
        : await setAssetDisposalStatus(id, status, user.id, String(formData.get("rejectionReason") ?? ""));

    await writeAuditLog({
      actorUserId: user.id,
      action: statusEvent(status),
      entity: "asset_disposal",
      entityId: id,
      beforeData: existing.disposal,
      afterData: row,
    });

    revalidatePath("/assets/disposals");
    revalidatePath(`/assets/disposals/${id}`);
    revalidateAssetPaths(existing.asset.id, existing.asset.assetType);
    redirect(`/assets/disposals/${id}`);
  } catch (error) {
    await handleActionFailure(error, id ? `/assets/disposals/${id}` : "/assets/disposals");
  }
}

export async function submitAssetDisposalAction(formData: FormData) {
  await transition(formData, "asset.disposal.submit", "SUBMITTED");
}

export async function reviewAssetDisposalAction(formData: FormData) {
  await transition(formData, "asset.disposal.review", "UNDER_REVIEW");
}

export async function approveAssetDisposalAction(formData: FormData) {
  await transition(formData, "asset.disposal.approve", "APPROVED");
}

export async function rejectAssetDisposalAction(formData: FormData) {
  await transition(formData, "asset.disposal.reject", "REJECTED");
}

export async function completeAssetDisposalAction(formData: FormData) {
  await transition(formData, "asset.disposal.complete", "COMPLETED");
}

export async function cancelAssetDisposalAction(formData: FormData) {
  await transition(formData, "asset.disposal.cancel", "CANCELLED");
}
