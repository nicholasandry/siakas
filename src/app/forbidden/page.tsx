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
      <div className="w-full rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
          <ShieldX className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-semibold text-slate-950">Akses ditolak</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800"
          >
            Ke dashboard
          </Link>
          <form action="/api/logout" method="post" className="inline-flex">
            <button
              type="submit"
              className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto"
            >
              Ganti akun
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
