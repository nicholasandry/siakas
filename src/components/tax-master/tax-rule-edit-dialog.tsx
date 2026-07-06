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
        className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        <Pencil className="h-3.5 w-3.5" />
        Edit
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
