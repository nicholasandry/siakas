"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { TaxGroupForm } from "@/components/forms/tax-group-form";
import { Dialog } from "@/components/ui/dialog";

type CreateTaxGroupDialogProps = {
  action: (formData: FormData) => void | Promise<void>;
};

export function CreateTaxGroupDialog({ action }: CreateTaxGroupDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800"
      >
        <Plus className="h-4 w-4" />
        Tambah kelompok
      </button>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Tambah kelompok fiskal"
        description="Definisikan kelompok depresiasi per kategori aset."
      >
        <TaxGroupForm action={action} submitLabel="Simpan kelompok" onCancel={() => setOpen(false)} />
      </Dialog>
    </>
  );
}
