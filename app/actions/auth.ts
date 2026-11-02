"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { signIn, signOut } from "@/auth";
import { registerUser } from "@/lib/auth-service";
import { cookies } from "next/headers";
import { checkUsernameAvailability, sanitizeUsername, type UsernameAvailability } from "@/lib/username";
import { PENDING_INVITE_COOKIE_NAME, PENDING_INVITE_COOKIE_OPTIONS } from "@/lib/invite";
import { checkRateLimit } from "@/lib/rate-limit";

export interface AuthActionResult {
  error?: string;
}

/**
 * Extracts client IP or proxy fallback for rate limiting.
 */
async function getClientIdentifier(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return headerList.get("x-real-ip") || "127.0.0.1";
}

/**
 * Server Action to register a new user account with unique username & password.
 */
export async function registerUserAction(
  _prevState: AuthActionResult | undefined | null,
  formData: FormData
): Promise<AuthActionResult> {
  const clientIp = await getClientIdentifier();

  // Sliding window rate limiting: max 10 registration attempts per 10 minutes per IP
  const rateLimit = checkRateLimit(clientIp, {
    keyPrefix: "auth:register",
    limit: 10,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.success) {
    const waitSec = Math.ceil(rateLimit.resetMs / 1000);
    return {
      error: `Too many registration attempts. Please try again in ${waitSec} seconds.`,
    };
  }

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
  const clientIp = await getClientIdentifier();

  // Sliding window rate limiting: max 15 login attempts per 5 minutes per IP
  const rateLimit = checkRateLimit(clientIp, {
    keyPrefix: "auth:login",
    limit: 15,
    windowMs: 5 * 60 * 1000,
  });

  if (!rateLimit.success) {
    const waitSec = Math.ceil(rateLimit.resetMs / 1000);
    return {
      error: `Too many login attempts. Please wait ${waitSec} seconds before trying again.`,
    };
  }

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

/**
 * Live username availability check for the registration form.
 * Returns a DB-verified suggestion when the candidate is taken.
 * Intentionally public (needed pre-login); only exposes taken/free for the exact candidate.
 */
export async function checkUsernameAvailabilityAction(
  candidate: string
): Promise<UsernameAvailability> {
  const clientIp = await getClientIdentifier();

  // Sliding window rate limiting: max 60 username checks per minute
  const rateLimit = checkRateLimit(clientIp, {
    keyPrefix: "auth:check-user",
    limit: 60,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.success) {
    return {
      username: sanitizeUsername(candidate),
      available: false,
      reason: "Rate limit exceeded. Please slow down.",
    };
  }

  return checkUsernameAvailability(String(candidate ?? ""));
}
