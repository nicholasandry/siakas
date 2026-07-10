import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center", className)}>
      <p className="text-sm font-medium text-slate-900">{title}</p>
      {description ? <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-600">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
