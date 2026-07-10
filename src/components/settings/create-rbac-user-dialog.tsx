"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { RbacUserForm } from "@/components/forms/rbac-user-form";
import { Dialog } from "@/components/ui/dialog";

type CreateRbacUserDialogProps = {
  action: (formData: FormData) => void | Promise<void>;
  roleOptions: Array<{ id: string; code: string; name: string }>;
  unitOptions: Array<{ id: string; code: string; name: string }>;
  badanHukumOptions: Array<{ id: string; name: string }>;
};

export function CreateRbacUserDialog({ action, roleOptions, unitOptions, badanHukumOptions }: CreateRbacUserDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800"
      >
        <Plus className="h-4 w-4" />
        Tambah pengguna
      </button>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Tambah pengguna baru"
        description="Buat akun dengan role dan scope unit/badan hukum."
      >
        <RbacUserForm
          mode="create"
          action={action}
          submitLabel="Simpan pengguna"
          onCancel={() => setOpen(false)}
          roleOptions={roleOptions}
          unitOptions={unitOptions}
          badanHukumOptions={badanHukumOptions}
        />
      </Dialog>
    </>
  );
}
