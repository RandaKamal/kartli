import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { getUserByUsername } from "@/lib/auth-service";
import { listUserPasskeys } from "@/lib/passkeys";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  createSignedChallenge,
  getWebAuthnRpConfig,
  WEBAUTHN_CHALLENGE_COOKIE,
} from "@/lib/webauthn";

export async function POST(req: Request) {
  try {
    const reqHeaders = await headers();
    const ip =
      reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      reqHeaders.get("x-real-ip") ||
      "127.0.0.1";

    const rl = checkRateLimit(ip, {
      keyPrefix: "auth:passkey-login-opts",
      limit: 30,
      windowMs: 5 * 60 * 1000,
    });
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many passkey attempts. Please wait a moment." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const username =
      typeof body?.username === "string" ? body.username.trim() : "";

    const { rpID } = getWebAuthnRpConfig(reqHeaders);

    let allowCredentials:
      | Array<{
          id: Uint8Array;
          type: "public-key";
          transports?: any;
        }>
      | undefined;

    if (username) {
      const user = await getUserByUsername(username);
      if (user) {
        const userPasskeys = await listUserPasskeys(user.id);
        if (userPasskeys.length > 0) {
          allowCredentials = userPasskeys.map((pk) => ({
            id: Buffer.from(pk.credential_id, "base64url"),
            type: "public-key",
            transports: (pk.transports as any) || undefined,
          }));
        }
      }
    }

    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: "preferred",
      allowCredentials,
    });

    const signedChallenge = createSignedChallenge({
      challenge: options.challenge,
      purpose: "login",
    });

    const cookieStore = await cookies();
    cookieStore.set(WEBAUTHN_CHALLENGE_COOKIE, signedChallenge, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 300,
      path: "/",
    });

    return NextResponse.json(options);
  } catch (err) {
    console.error("Passkey login options error:", err);
    return NextResponse.json(
      { error: "Failed to start passkey sign-in." },
      { status: 500 }
    );
  }
}
