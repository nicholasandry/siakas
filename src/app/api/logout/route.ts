import { NextResponse } from "next/server";

import { auditAuthEvent } from "@/lib/audit";
import { getCurrentUser, getClearSessionCookieOptions } from "@/lib/session";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (user) {
    await auditAuthEvent({
      actorUserId: user.id,
      action: "logout",
      email: user.email,
      metadata: { role: user.role },
    });
  }

  const response = NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  response.cookies.set(getClearSessionCookieOptions());

  return response;
}
