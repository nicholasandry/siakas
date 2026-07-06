import type { ReactNode } from "react";

type ResponsiveTableProps = {
  children: ReactNode;
  hint?: string;
  className?: string;
};

export function ResponsiveTable({
  children,
  hint = "Geser ke samping untuk melihat kolom lain pada layar kecil.",
  className = "",
}: ResponsiveTableProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <p className="text-xs text-slate-500 md:hidden">{hint}</p>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 [-webkit-overflow-scrolling:touch]">{children}</div>
    </div>
  );
}
