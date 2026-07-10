import { cn } from "@/lib/utils";

type StatusBadgeTone = "success" | "neutral" | "warning" | "danger" | "info";

const toneClassNames: Record<StatusBadgeTone, string> = {
  success: "bg-emerald-50 text-emerald-800 ring-emerald-200/70",
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  warning: "bg-amber-50 text-amber-900 ring-amber-200/80",
  danger: "bg-rose-50 text-rose-800 ring-rose-200/80",
  info: "bg-sky-50 text-sky-800 ring-sky-200/80",
};

type StatusBadgeProps = {
  children: React.ReactNode;
  tone?: StatusBadgeTone;
  className?: string;
};

export function StatusBadge({ children, tone = "neutral", className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium leading-none ring-1 ring-inset",
        toneClassNames[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
