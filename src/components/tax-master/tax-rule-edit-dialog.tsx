"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import { TaxRuleForm } from "@/components/forms/tax-rule-form";
import { Dialog } from "@/components/ui/dialog";

type TaxRuleEditDialogProps = {
  action: (formData: FormData) => void | Promise<void>;
  groupId: string;
  rule: {
    id: string;
    taxYear: number;
    method: string;
    usefulLifeYears: number;
    ratePercent: string;
    residualValuePercent: string | null;
    sourceRegulation: string;
    effectiveFrom: string;
    effectiveTo: string | null;
    isActive: boolean;
    notes: string | null;
  };
};

export function TaxRuleEditDialog({ action, groupId, rule }: TaxRuleEditDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-md border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
        title="Edit Aturan Pajak"
      >
        <Pencil className="h-4 w-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen} title={`Edit aturan ${rule.taxYear}`} description="Perubahan aturan hanya memengaruhi perhitungan baru.">
        <TaxRuleForm
          action={action}
          submitLabel="Simpan aturan"
          groupId={groupId}
          values={{
            id: rule.id,
            taxYear: rule.taxYear,
            method: rule.method,
            usefulLifeYears: rule.usefulLifeYears,
            ratePercent: rule.ratePercent,
            residualValuePercent: rule.residualValuePercent,
            sourceRegulation: rule.sourceRegulation,
            effectiveFrom: rule.effectiveFrom,
            effectiveTo: rule.effectiveTo,
            isActive: rule.isActive,
            notes: rule.notes,
          }}
          onCancel={() => setOpen(false)}
        />
      </Dialog>
    </>
  );
}
