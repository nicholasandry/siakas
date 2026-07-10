"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

export function RequiredMark() {
  return <span className="text-rose-600" aria-hidden="true">*</span>;
}

export function RequiredFieldsNote() {
  return <p className="text-xs text-slate-500">Field bertanda <span className="font-semibold text-rose-600">*</span> wajib diisi.</p>;
}

export function FieldHelper({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="text-xs leading-5 text-slate-500">{children}</p>;
}

export function FormErrorSummary({ show, message = "Beberapa field wajib belum diisi. Periksa kembali field yang ditandai." }: { show: boolean; message?: string }) {
  if (!show) return null;
  return (
    <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
      {message}
    </div>
  );
}

export function SubmitButton({
  children,
  pendingText = "Menyimpan...",
  className,
}: {
  children: ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className={className} aria-disabled={pending}>
      {pending ? pendingText : children}
    </button>
  );
}

export function useUnsavedChangesWarning(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);
}

export function useDirtyFlag() {
  const [isDirty, setIsDirty] = useState(false);
  useUnsavedChangesWarning(isDirty);

  return {
    isDirty,
    markDirty: () => setIsDirty(true),
    resetDirty: () => setIsDirty(false),
  };
}
