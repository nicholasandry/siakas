"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { UnitForm } from "@/components/forms/unit-form";
import { Dialog } from "@/components/ui/dialog";

type UnitOption = {
  id: string;
  name: string;
  code: string;
  kind: string;
  parentId: string | null;
};

type CreateUnitDialogProps = {
  action: (formData: FormData) => void | Promise<void>;
  parentOptions: UnitOption[];
  badanHukumOptions: { id: string; name: string; type: string }[];
  keuskupanUnit: { id: string; name: string; code: string } | null;
};

export function CreateUnitDialog({ action, parentOptions, badanHukumOptions, keuskupanUnit }: CreateUnitDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30"
      >
        <Plus className="h-4 w-4" />
        Tambah unit
      </button>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Tambah unit baru"
      >
        <UnitForm
          action={action}
          submitLabel="Simpan unit"
          parentOptions={parentOptions}
          badanHukumOptions={badanHukumOptions}
          keuskupanUnit={keuskupanUnit}
          onCancel={() => setOpen(false)}
        />
      </Dialog>
    </>
  );
}
