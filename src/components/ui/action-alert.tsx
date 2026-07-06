type ActionAlertProps = {
  message?: string | null;
  variant?: "error" | "success";
};

const variantClassName = {
  error: "border-rose-200 bg-rose-50/90 text-rose-800",
  success: "border-emerald-200 bg-emerald-50/90 text-emerald-800",
} as const;

export function ActionAlert({ message, variant = "error" }: ActionAlertProps) {
  if (!message) {
    return null;
  }

  return (
    <div role="alert" className={`rounded-2xl border px-4 py-3 text-sm ${variantClassName[variant]}`}>
      {message}
    </div>
  );
}
