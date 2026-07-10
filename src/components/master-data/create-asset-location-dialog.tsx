"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { AssetLocationForm } from "@/components/forms/asset-location-form";
import { Dialog } from "@/components/ui/dialog";

type CreateAssetLocationDialogProps = {
  action: (formData: FormData) => void | Promise<void>;
  units: Array<{ id: string; name: string; code?: string | null }>;
};

export function CreateAssetLocationDialog({ action, units }: CreateAssetLocationDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30"
      >
        <Plus className="h-4 w-4" />
        Tambah lokasi
      </button>

      <Dialog open={open} onOpenChange={setOpen} title="Tambah lokasi">
        <AssetLocationForm action={action} submitLabel="Simpan lokasi" units={units} onCancel={() => setOpen(false)} />
      </Dialog>
    </>
  );
}
