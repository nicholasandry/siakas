"use client";

import { HelpCircle } from "lucide-react";

type FieldHintProps = {
  text: string;
  id?: string;
};

export function FieldHint({ text, id }: FieldHintProps) {
  return (
    <span className="group relative ml-1 inline-flex align-middle">
      <button
        type="button"
        tabIndex={0}
        aria-describedby={id}
        className="rounded-full text-slate-400 transition hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30"
        aria-label="Bantuan field"
      >
        <HelpCircle className="h-4 w-4" aria-hidden />
      </button>
      <span
        id={id}
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-56 -translate-x-1/2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs leading-5 text-slate-700 shadow-lg group-hover:block group-focus-within:block"
      >
        {text}
      </span>
    </span>
  );
}
