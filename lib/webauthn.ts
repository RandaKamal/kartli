import crypto from "node:crypto";

export const WEBAUTHN_RP_NAME = "Kartli";
export const WEBAUTHN_CHALLENGE_COOKIE = "kartli_webauthn_challenge";
export const WEBAUTHN_CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes
export const PASSKEY_LOGIN_NONCE_TTL_MS = 60 * 1000; // 60 seconds

// Track used passkey login nonces in memory to enforce single-use within TTL
const usedLoginNonces = new Map<string, number>();

function purgeExpiredNonces() {
  const now = Date.now();
  for (const [jti, exp] of usedLoginNonces.entries()) {
    if (exp <= now) {
      usedLoginNonces.delete(jti);
    }
  }
}

function getSigningSecret(): string {
  return (
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "kartli-dev-webauthn-secret"
  );
}

export interface WebAuthnRpConfig {
  rpID: string;
  rpName: string;
  origin: string;
}

/**
 * Dynamically derives WebAuthn rpID and origin from request headers or NEXTAUTH_URL/AUTH_URL.
 * Supports localhost, custom ports, and Vercel preview/production domains.
 */
export function getWebAuthnRpConfig(reqHeaders?: Headers): WebAuthnRpConfig {
  const forwardedHost = reqHeaders?.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || reqHeaders?.get("host")?.split(",")[0]?.trim();

  if (host) {
    const hostname = host.split(":")[0].toLowerCase();
    const isLocalhost =
      hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
    const protoHeader = reqHeaders?.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const protocol = protoHeader || (isLocalhost ? "http" : "https");
    return {
      rpID: hostname,
      rpName: WEBAUTHN_RP_NAME,
      origin: `${protocol}://${host}`,
    };
  }

  const envUrl =
    process.env.NEXTAUTH_URL ||
    process.env.AUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  try {
    const parsed = new URL(envUrl);
    return {
      rpID: parsed.hostname,
      rpName: WEBAUTHN_RP_NAME,
      origin: parsed.origin,
    };
  } catch {
    return {
      rpID: "localhost",
      rpName: WEBAUTHN_RP_NAME,
      origin: "http://localhost:3000",
    };
  }
}

function signPayload(payload: Record<string, unknown>): string {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = crypto
    .createHmac("sha256", getSigningSecret())
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${sig}`;
}

function verifyPayload<T extends { exp?: number }>(token: string): T | null {
  if (!token || typeof token !== "string") return null;
  const dotIdx = token.indexOf(".");
  if (dotIdx <= 0) return null;

  const encoded = token.slice(0, dotIdx);
  const sig = token.slice(dotIdx + 1);
  if (!encoded || !sig) return null;

  const expectedSig = crypto
    .createHmac("sha256", getSigningSecret())
    .update(encoded)
    .digest("base64url");

  const sigBuf = Buffer.from(sig, "utf8");
  const expectedBuf = Buffer.from(expectedSig, "utf8");
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const decoded = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as T;
    if (!decoded || typeof decoded.exp !== "number" || decoded.exp <= Date.now()) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export interface SignedChallengePayload {
  challenge: string;
  purpose: "register" | "login";
  userId?: string;
  exp: number;
}

export function createSignedChallenge(input: {
  challenge: string;
  purpose: "register" | "login";
  userId?: string;
  ttlMs?: number;
}): string {
  return signPayload({
    challenge: input.challenge,
    purpose: input.purpose,
    ...(input.userId ? { userId: input.userId } : {}),
    exp: Date.now() + (input.ttlMs ?? WEBAUTHN_CHALLENGE_TTL_MS),
  });
}

export function verifySignedChallenge(
  token: string | undefined | null,
  expectedPurpose: "register" | "login",
  expectedUserId?: string
): SignedChallengePayload | null {
  if (!token) return null;
  const parsed = verifyPayload<SignedChallengePayload>(token);
  if (!parsed) return null;
  if (parsed.purpose !== expectedPurpose) return null;
  if (expectedUserId && parsed.userId !== expectedUserId) return null;
  if (!parsed.challenge) return null;
  return parsed;
}

interface PasskeyLoginNoncePayload {
  jti: string;
  userId: string;
  purpose: "passkey-login";
  exp: number;
}

export function createPasskeyLoginNonce(userId: string): string {
  return signPayload({
    jti: crypto.randomBytes(16).toString("base64url"),
    userId,
    purpose: "passkey-login",
    exp: Date.now() + PASSKEY_LOGIN_NONCE_TTL_MS,
  });
}

export function verifyPasskeyLoginNonce(token: string): { userId: string } | null {
  const parsed = verifyPayload<PasskeyLoginNoncePayload>(token);
  if (!parsed || parsed.purpose !== "passkey-login" || !parsed.userId || !parsed.jti) {
    return null;
  }

  purgeExpiredNonces();
  if (usedLoginNonces.has(parsed.jti)) {
    return null;
  }
  usedLoginNonces.set(parsed.jti, parsed.exp);

  return { userId: parsed.userId };
}
