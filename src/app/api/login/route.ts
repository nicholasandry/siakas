import { NextResponse } from "next/server";

import { authenticateUser } from "@/lib/auth";
import { auditAuthEvent } from "@/lib/audit";
import { buildSessionCookie } from "@/lib/session";
import { createSessionToken } from "@/lib/session-token";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = formData.get("email");
  const password = formData.get("password");
  const nextPath = formData.get("next");

  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    await auditAuthEvent({
      action: "login_failed",
      email: typeof email === "string" ? email : undefined,
      metadata: { reason: "invalid_input" },
    });
    return NextResponse.redirect(new URL("/login?error=invalid", request.url), { status: 303 });
  }

  const normalizedEmail = email.trim();
  const sessionUser = await authenticateUser(normalizedEmail, password);

  if (!sessionUser) {
    await auditAuthEvent({
      action: "login_failed",
      email: normalizedEmail,
      metadata: { reason: "invalid_credentials" },
    });
    return NextResponse.redirect(new URL("/login?error=invalid", request.url), { status: 303 });
  }

  const redirectTarget =
    typeof nextPath === "string" && nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/dashboard";

  const token = await createSessionToken(sessionUser.id);
  const response = NextResponse.redirect(new URL(redirectTarget, request.url), { status: 303 });
  response.cookies.set(buildSessionCookie(token));

  await auditAuthEvent({
    actorUserId: sessionUser.id,
    action: "login",
    email: sessionUser.email,
    metadata: { role: sessionUser.role, redirectTo: redirectTarget },
  });

  return response;
}
