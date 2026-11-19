"use client";

import {
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import type { UserPasskey } from "@/types";

export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential !== "undefined"
  );
}

/**
 * Prompts the native browser password manager (iCloud Keychain / Chrome / 1Password)
 * to save or update the user's username + password credential.
 */
export async function storePasswordCredential(
  username: string,
  password: string,
  displayName?: string
): Promise<void> {
  if (typeof window === "undefined") return;
  const w = window as unknown as {
    PasswordCredential?: new (data: {
      id: string;
      password: string;
      name?: string;
    }) => Credential;
  };
  if (!w.PasswordCredential || !navigator.credentials?.store) return;

  try {
    const cred = new w.PasswordCredential({
      id: username,
      password,
      name: displayName || username,
    });
    await navigator.credentials.store(cred);
  } catch {
    // Non-fatal: some browsers or incognito modes disallow credentials.store
  }
}

export async function registerPasskeyClient(
  deviceName?: string
): Promise<{ passkey: UserPasskey }> {
  const optionsRes = await fetch("/api/auth/passkey/register/options", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  const options = await optionsRes.json();
  if (!optionsRes.ok) {
    throw new Error(options?.error || "Failed to start passkey setup.");
  }

  const attestationResponse = await startRegistration(options);

  const verifyRes = await fetch("/api/auth/passkey/register/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      response: attestationResponse,
      deviceName: deviceName?.trim() || undefined,
    }),
  });
  const verifyData = await verifyRes.json();
  if (!verifyRes.ok || !verifyData?.verified) {
    throw new Error(verifyData?.error || "Passkey verification failed.");
  }

  return { passkey: verifyData.passkey };
}

export async function authenticateWithPasskeyClient(
  username?: string
): Promise<{ token: string }> {
  const optionsRes = await fetch("/api/auth/passkey/login/options", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(username?.trim() ? { username: username.trim() } : {}),
    }),
  });
  const options = await optionsRes.json();
  if (!optionsRes.ok) {
    throw new Error(options?.error || "Failed to start passkey sign-in.");
  }

  const assertionResponse = await startAuthentication(options);

  const verifyRes = await fetch("/api/auth/passkey/login/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ response: assertionResponse }),
  });
  const verifyData = await verifyRes.json();
  if (!verifyRes.ok || !verifyData?.verified || !verifyData?.token) {
    throw new Error(verifyData?.error || "Passkey sign-in failed.");
  }

  return { token: verifyData.token };
}
