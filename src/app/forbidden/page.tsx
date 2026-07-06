import Link from "next/link";
import { ShieldX } from "lucide-react";

import { auditAccessDenied } from "@/lib/audit";
import { getCurrentUser } from "@/lib/session";

const reasonMessages: Record<string, string> = {
  permission: "Akun Anda tidak memiliki izin untuk mengakses halaman ini.",
  scope: "Akun Anda tidak memiliki unit atau badan hukum yang diperlukan untuk scope data ini.",
  forbidden: "Akses ditolak oleh kebijakan sistem.",
};

export default async function ForbiddenPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  const user = await getCurrentUser();
  const message = reasonMessages[reason ?? ""] ?? reasonMessages.forbidden;

  await auditAccessDenied(user?.id ?? null, {
    entity: "page",
    reason: reason ?? "forbidden",
    path: "/forbidden",
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-6 py-12">
      <div className="w-full rounded-3xl border border-white/80 bg-white/90 p-8 text-center shadow-glow backdrop-blur">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
          <ShieldX className="h-7 w-7" />
        </div>
        <h1 className="font-display text-3xl font-semibold text-slate-950">Akses ditolak</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-medium text-white hover:bg-emerald-900"
          >
            Ke dashboard
          </Link>
          <form action="/api/logout" method="post" className="inline-flex">
            <button
              type="submit"
              className="inline-flex h-11 w-full items-center justify-center rounded-full border border-slate-200 px-6 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto"
            >
              Ganti akun
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
