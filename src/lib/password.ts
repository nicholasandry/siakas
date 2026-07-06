import { createHash, timingSafeEqual } from "crypto";

export function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export function verifyPassword(password: string, passwordHash: string): boolean {
  const candidate = hashPassword(password);

  try {
    return timingSafeEqual(Buffer.from(candidate, "utf8"), Buffer.from(passwordHash, "utf8"));
  } catch {
    return false;
  }
}
