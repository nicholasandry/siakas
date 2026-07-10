"use client";

import { useRouter } from "next/navigation";

import { getStartAssetDisposalHref } from "@/lib/assets/status";
import { Swal } from "@/lib/swal";

import type { ReactNode } from "react";

type StartAssetDisposalButtonProps = {
  assetId: string;
  assetName: string;
  assetStatus: string;
  className?: string;
  label?: string;
  title?: string;
  children?: ReactNode;
};

const baseMessage =
  'Data aset tidak akan dihapus permanen. Aset akan masuk proses disposal/penghapusan dan membutuhkan pencatatan alasan, dokumen, serta persetujuan sesuai aturan.';

function statusWarning(status: string) {
  if (status === "on_loan") {
    return "Aset ini sedang berstatus Dipinjamkan. Kembalikan aset terlebih dahulu sebelum mengajukan disposal.";
  }

  if (status === "in_maintenance") {
    return "Aset ini sedang dalam Maintenance. Pastikan hasil maintenance sudah diperiksa sebelum melanjutkan disposal.";
  }

  return null;
}

export function StartAssetDisposalButton({
  assetId,
  assetName,
  assetStatus,
  className,
  label = "Hapus Aset",
  title,
  children,
}: StartAssetDisposalButtonProps) {
  const router = useRouter();

  async function handleClick() {
    if (assetStatus === "on_loan") {
      await Swal.fire({
        title: "Disposal tidak dapat dilanjutkan",
        text: "Aset yang sedang dipinjamkan harus dikembalikan terlebih dahulu. Ubah status ke Aktif atau Nonaktif sebelum mengajukan disposal.",
        icon: "info",
        confirmButtonText: "Mengerti",
        confirmButtonColor: "#0f172a",
      });
      return;
    }

    const warning = statusWarning(assetStatus);
    const result = await Swal.fire({
      title: "Ajukan Penghapusan Aset?",
      text: [`Aset: ${assetName}`, baseMessage, warning].filter(Boolean).join("\n\n"),
      icon: "warning",
      showCancelButton: true,
      cancelButtonText: "Batal",
      confirmButtonText: "Lanjutkan Disposal",
      confirmButtonColor: "#0f172a",
    });

    if (result.isConfirmed) {
      router.push(getStartAssetDisposalHref(assetId));
    }
  }

  return (
    <button type="button" onClick={handleClick} className={className} title={title}>
      {children ?? label}
    </button>
  );
}
