import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { getPasskeyByCredentialId, updatePasskeyUsage } from "@/lib/passkeys";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  createPasskeyLoginNonce,
  getWebAuthnRpConfig,
  verifySignedChallenge,
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
      keyPrefix: "auth:passkey-login-verify",
      limit: 30,
      windowMs: 5 * 60 * 1000,
    });
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many passkey attempts. Please wait a moment." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body?.response?.id) {
      return NextResponse.json(
        { error: "Missing passkey assertion response." },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const challengeCookie = cookieStore.get(WEBAUTHN_CHALLENGE_COOKIE)?.value;
    const challengePayload = verifySignedChallenge(challengeCookie, "login");

    if (!challengePayload) {
      return NextResponse.json(
        { error: "Passkey sign-in challenge expired or invalid." },
        { status: 400 }
      );
    }

    const credentialId = String(body.response.id);
    const passkey = await getPasskeyByCredentialId(credentialId);
    if (!passkey) {
      return NextResponse.json(
        { error: "Passkey not recognized for this account." },
        { status: 401 }
      );
    }

    const { rpID, origin } = getWebAuthnRpConfig(reqHeaders);

    const verification = await verifyAuthenticationResponse({
      response: body.response,
      expectedChallenge: challengePayload.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: Buffer.from(passkey.credential_id, "base64url"),
        credentialPublicKey: Buffer.from(passkey.public_key, "base64url"),
        counter: passkey.counter,
        transports: (passkey.transports as any) || undefined,
      },
      requireUserVerification: false,
    });

    if (!verification.verified) {
      return NextResponse.json(
        { error: "Passkey verification failed." },
        { status: 401 }
      );
    }

    await updatePasskeyUsage(passkey.id, verification.authenticationInfo.newCounter);
    cookieStore.delete(WEBAUTHN_CHALLENGE_COOKIE);

    const token = createPasskeyLoginNonce(passkey.user_id);
    return NextResponse.json({ verified: true, token });
  } catch (err) {
    console.error("Passkey login verify error:", err);
    return NextResponse.json(
      { error: "Failed to verify passkey sign-in." },
      { status: 500 }
    );
  }
}
