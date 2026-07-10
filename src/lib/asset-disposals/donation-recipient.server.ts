import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { units } from "@/db/schema";
import { isDonationRecipientKind } from "@/lib/asset-disposals/donation-recipient";
import type { DonationRecipientKind } from "@/lib/asset-disposals/constants";

type DonationAsset = {
  unitId: string | null;
  ownershipLevel: string;
};

type DonationRecipientInput = {
  disposalMethod: string;
  donationRecipientKind?: string | null;
  recipientUnitId?: string | null;
  recipientName?: string | null;
};

export async function resolveDonationRecipientInput(asset: DonationAsset, input: DonationRecipientInput) {
  if (input.disposalMethod !== "DONATION") {
    return {
      donationRecipientKind: null as DonationRecipientKind | null,
      recipientUnitId: null as string | null,
      recipientName: input.recipientName?.trim() || null,
    };
  }

  const kind = input.donationRecipientKind?.trim();
  if (!isDonationRecipientKind(kind)) {
    throw new Error("Jenis penerima hibah wajib dipilih");
  }

  if (kind === "INTERNAL_UNIT") {
    if (asset.ownershipLevel !== "keuskupan") {
      throw new Error("Hibah ke unit internal hanya berlaku untuk aset milik unit keuskupan");
    }

    const recipientUnitId = input.recipientUnitId?.trim();
    if (!recipientUnitId) {
      throw new Error("Unit penerima hibah wajib dipilih");
    }

    if (asset.unitId && recipientUnitId === asset.unitId) {
      throw new Error("Unit penerima hibah harus berbeda dari unit pengelola aset saat ini");
    }

    const [recipientUnit] = await db.select().from(units).where(eq(units.id, recipientUnitId)).limit(1);
    if (!recipientUnit) {
      throw new Error("Unit penerima hibah tidak ditemukan");
    }

    return {
      donationRecipientKind: kind,
      recipientUnitId,
      recipientName: recipientUnit.name,
    };
  }

  const recipientName = input.recipientName?.trim();
  if (!recipientName) {
    throw new Error("Nama penerima hibah wajib diisi");
  }

  return {
    donationRecipientKind: kind,
    recipientUnitId: null,
    recipientName,
  };
}
