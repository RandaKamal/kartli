import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { auth } from "@/auth";
import { listUserPasskeys } from "@/lib/passkeys";
import {
  createSignedChallenge,
  getWebAuthnRpConfig,
  WEBAUTHN_CHALLENGE_COOKIE,
} from "@/lib/webauthn";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.username) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reqHeaders = await headers();
    const { rpID, rpName } = getWebAuthnRpConfig(reqHeaders);
    const existingPasskeys = await listUserPasskeys(session.user.id);

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: session.user.id,
      userName: session.user.username,
      userDisplayName: session.user.username,
      attestationType: "none",
      excludeCredentials: existingPasskeys.map((pk) => ({
        id: Buffer.from(pk.credential_id, "base64url"),
        type: "public-key",
        transports: (pk.transports as any) || undefined,
      })),
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
    });

    const signedChallenge = createSignedChallenge({
      challenge: options.challenge,
      purpose: "register",
      userId: session.user.id,
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
    console.error("Passkey registration options error:", err);
    return NextResponse.json(
      { error: "Failed to generate passkey registration options." },
      { status: 500 }
    );
  }
}
