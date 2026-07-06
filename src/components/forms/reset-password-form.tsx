"use client";

const fieldClassName =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20";

type ResetPasswordFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  userId: string;
};

export function ResetPasswordForm({ action, userId }: ResetPasswordFormProps) {
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={userId} />

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>
            Password baru <span className="text-rose-600">*</span>
          </span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={fieldClassName}
            placeholder="Minimal 8 karakter"
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>
            Konfirmasi password <span className="text-rose-600">*</span>
          </span>
          <input
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={fieldClassName}
            placeholder="Ulangi password"
          />
        </label>
      </div>

      <button
        type="submit"
        className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 px-5 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Reset password
      </button>
    </form>
  );
}
