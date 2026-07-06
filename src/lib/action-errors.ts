import "server-only";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";

import { auditAccessDenied } from "@/lib/audit";
import { AuthorizationError } from "@/lib/authz";
import { getCurrentUser } from "@/lib/session";

export function redirectForbidden(reason?: string): never {
  const path = reason ? `/forbidden?reason=${encodeURIComponent(reason)}` : "/forbidden";
  redirect(path);
}

export function redirectActionError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function handleActionFailure(error: unknown, redirectPath: string): Promise<never> {
  if (isRedirectError(error)) {
    throw error;
  }

  if (error instanceof AuthorizationError) {
    const user = await getCurrentUser();
    await auditAccessDenied(user?.id ?? null, {
      entity: "server_action",
      reason: error.message || "forbidden",
      path: redirectPath,
    });
    redirectForbidden(error.message || "forbidden");
  }

  const message = error instanceof Error ? error.message : "Terjadi kesalahan saat memproses permintaan";
  redirectActionError(redirectPath, message);
}
