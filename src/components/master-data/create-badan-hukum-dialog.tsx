"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { BadanHukumForm } from "@/components/forms/badan-hukum-form";
import { Dialog } from "@/components/ui/dialog";

type CreateBadanHukumDialogProps = {
  action: (formData: FormData) => void | Promise<void>;
};

export function CreateBadanHukumDialog({ action }: CreateBadanHukumDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-950 px-6 text-sm font-medium text-white transition-colors hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30"
      >
        <Plus className="h-4 w-4" />
        Tambah badan hukum
      </button>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Tambah badan hukum baru"
        description="Lengkapi data legalitas, SK Kemenkumham, dan status badan hukum."
      >
        <BadanHukumForm action={action} submitLabel="Simpan badan hukum" onCancel={() => setOpen(false)} />
      </Dialog>
    </>
  );
}
