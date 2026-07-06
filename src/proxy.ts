import { NextRequest, NextResponse } from "next/server";

import { isSessionTokenValid, sessionCookieName } from "@/lib/session-token";

const protectedPrefixes = ["/dashboard", "/master-data", "/assets", "/settings"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (!isProtected) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get(sessionCookieName)?.value;

  if (!(await isSessionTokenValid(sessionToken))) {
    const loginUrl = new URL("/login", request.url);

    if (pathname !== "/login") {
      loginUrl.searchParams.set("next", pathname);
    }

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/master-data/:path*", "/assets/:path*", "/settings/:path*"],
};
