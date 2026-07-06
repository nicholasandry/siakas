export const sessionCookieName = "siakas_session";
const defaultMaxAgeSeconds = 60 * 60 * 8;

type SessionPayload = {
  sub: string;
  exp: number;
};

let hmacKeyPromise: Promise<CryptoKey> | null = null;

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error("SESSION_SECRET is not set");
  }

  return secret;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);

  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function encodeBase64Url(value: string): string {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

function decodeBase64Url(value: string): string {
  return new TextDecoder().decode(base64UrlToBytes(value));
}

async function getHmacKey(): Promise<CryptoKey> {
  if (!hmacKeyPromise) {
    hmacKeyPromise = crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(getSessionSecret()),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );
  }

  return hmacKeyPromise;
}

async function signPayload(payload: string): Promise<string> {
  const key = await getHmacKey();
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));

  return bytesToBase64Url(new Uint8Array(signature));
}

export async function createSessionToken(userId: string, maxAgeSeconds = defaultMaxAgeSeconds): Promise<string> {
  const payload = encodeBase64Url(
    JSON.stringify({
      sub: userId,
      exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
    } satisfies SessionPayload)
  );

  return `${payload}.${await signPayload(payload)}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<string | null> {
  if (!token) {
    return null;
  }

  const [payload, signature] = token.split(".");

  if (!payload || !signature) {
    return null;
  }

  const key = await getHmacKey();

  try {
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlToBytes(signature) as BufferSource,
      new TextEncoder().encode(payload)
    );

    if (!isValid) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const data = JSON.parse(decodeBase64Url(payload)) as SessionPayload;

    if (!data.sub || data.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return data.sub;
  } catch {
    return null;
  }
}

export async function isSessionTokenValid(token: string | undefined | null): Promise<boolean> {
  return (await verifySessionToken(token)) !== null;
}
