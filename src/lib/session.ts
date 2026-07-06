import "server-only";

import { cookies } from "next/headers";

import { buildSessionUser } from "@/lib/auth";
import type { SessionUser } from "@/lib/authz";
import { createSessionToken, sessionCookieName, verifySessionToken } from "@/lib/session-token";

export { sessionCookieName };

const sessionMaxAgeSeconds = 60 * 60 * 8;

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  const userId = await verifySessionToken(token);

  if (!userId) {
    return null;
  }

  return buildSessionUser(userId);
}

export function buildSessionCookie(token: string) {
  return {
    name: sessionCookieName,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionMaxAgeSeconds,
  };
}

export async function setUserSession(userId: string) {
  const cookieStore = await cookies();
  const token = await createSessionToken(userId, sessionMaxAgeSeconds);
  cookieStore.set(buildSessionCookie(token));
}

export async function clearUserSession() {
  const cookieStore = await cookies();
  cookieStore.set({
    name: sessionCookieName,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function getClearSessionCookieOptions() {
  return {
    name: sessionCookieName,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
}
