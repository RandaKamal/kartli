import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { auth } from "@/auth";
import { saveUserPasskey } from "@/lib/passkeys";
import {
  getWebAuthnRpConfig,
  verifySignedChallenge,
  WEBAUTHN_CHALLENGE_COOKIE,
} from "@/lib/webauthn";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body?.response) {
      return NextResponse.json(
        { error: "Missing registration response." },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const challengeCookie = cookieStore.get(WEBAUTHN_CHALLENGE_COOKIE)?.value;
    const challengePayload = verifySignedChallenge(
      challengeCookie,
      "register",
      session.user.id
    );

    if (!challengePayload) {
      return NextResponse.json(
        { error: "Passkey registration challenge expired or invalid." },
        { status: 400 }
      );
    }

    const reqHeaders = await headers();
    const { rpID, origin } = getWebAuthnRpConfig(reqHeaders);

    const verification = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge: challengePayload.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json(
        { error: "Passkey verification failed." },
        { status: 400 }
      );
    }

    const { credentialID, credentialPublicKey, counter } =
      verification.registrationInfo;

    const passkey = await saveUserPasskey({
      userId: session.user.id,
      credentialId: Buffer.from(credentialID).toString("base64url"),
      publicKey: Buffer.from(credentialPublicKey).toString("base64url"),
      counter,
      transports: Array.isArray(body.response?.response?.transports)
        ? body.response.response.transports
        : null,
      deviceName:
        typeof body.deviceName === "string"
          ? body.deviceName.slice(0, 80)
          : null,
    });

    cookieStore.delete(WEBAUTHN_CHALLENGE_COOKIE);

    return NextResponse.json({ verified: true, passkey });
  } catch (err) {
    console.error("Passkey registration verify error:", err);
    return NextResponse.json(
      { error: "Failed to verify passkey registration." },
      { status: 500 }
    );
  }
}
