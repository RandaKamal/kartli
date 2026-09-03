"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { registerUser } from "@/lib/auth-service";
import { cookies } from "next/headers";
import { PENDING_INVITE_COOKIE_NAME, PENDING_INVITE_COOKIE_OPTIONS } from "@/lib/invite";

export interface AuthActionResult {
  error?: string;
}

/**
 * Server Action to register a new user account with unique username & password.
 */
export async function registerUserAction(
  _prevState: AuthActionResult | undefined | null,
  formData: FormData
): Promise<AuthActionResult> {
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");
  let callbackUrl = String(formData.get("callbackUrl") || "").trim();
  const inviteToken = String(formData.get("inviteToken") || "").trim();

  if (!username || !password) {
    return { error: "Username and password are required." };
  }

  if (username.length < 2) {
    return { error: "Username must be at least 2 characters long." };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters long." };
  }

  const cookieStore = await cookies();

  // If an explicit invite token is submitted with the registration form
  if (inviteToken) {
    cookieStore.set(PENDING_INVITE_COOKIE_NAME, inviteToken, PENDING_INVITE_COOKIE_OPTIONS);
    if (!callbackUrl) {
      callbackUrl = `/invite/${encodeURIComponent(inviteToken)}`;
    }
  }

  // Register user in PostgreSQL
  try {
    await registerUser({ username, password });
  } catch (err: any) {
    return { error: err.message || "Failed to register user." };
  }

  // Automatically sign in the newly registered user
  try {
    await signIn("credentials", {
      username,
      password,
      redirectTo: callbackUrl || "/dashboard",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Account created, but sign-in failed. Please log in manually." };
    }
    throw error; // Let Next.js handle NEXT_REDIRECT
  }
}

/**
 * Server Action to sign in an existing user with username & password.
 */
export async function loginUserAction(
  _prevState: AuthActionResult | undefined | null,
  formData: FormData
): Promise<AuthActionResult> {
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");
  let callbackUrl = String(formData.get("callbackUrl") || "").trim();
  const inviteToken = String(formData.get("inviteToken") || "").trim();

  if (!username || !password) {
    return { error: "Username and password are required." };
  }

  const cookieStore = await cookies();

  // If an explicit invite token is submitted with the login form
  if (inviteToken) {
    cookieStore.set(PENDING_INVITE_COOKIE_NAME, inviteToken, PENDING_INVITE_COOKIE_OPTIONS);
    if (!callbackUrl) {
      callbackUrl = `/invite/${encodeURIComponent(inviteToken)}`;
    }
  }

  try {
    await signIn("credentials", {
      username,
      password,
      redirectTo: callbackUrl || "/dashboard",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid username or password." };
        default:
          return { error: "Authentication failed. Please try again." };
      }
    }
    throw error; // Let Next.js handle NEXT_REDIRECT
  }
}

/**
 * Server Action to sign out the current user and clear any pending invite cookies.
 */
export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(PENDING_INVITE_COOKIE_NAME);
  await signOut({ redirectTo: "/" });
}
