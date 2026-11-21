"use server";

import { headers } from "next/headers";
import { auth } from "@/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  createAdminPasswordResetToken,
  hashResetToken,
  redeemPasswordResetToken,
} from "@/lib/password-reset";
import { getWebAuthnRpConfig } from "@/lib/webauthn";

async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip") || "127.0.0.1";
}

export async function createPasswordResetLinkAction(
  kitchenId: string,
  targetUserId: string
): Promise<{
  success: boolean;
  resetUrl?: string;
  expiresAt?: string;
  requiresSecondKitchenCheck?: boolean;
  error?: string;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be logged in." };
  }

  const rl = checkRateLimit(`${session.user.id}:${kitchenId}`, {
    keyPrefix: "auth:create-reset-link",
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });
  if (!rl.success) {
    return {
      success: false,
      error: "Too many reset links generated. Please wait a few minutes.",
    };
  }

  try {
    const result = await createAdminPasswordResetToken({
      kitchenId,
      adminUserId: session.user.id,
      targetUserId,
    });

    const reqHeaders = await headers();
    const { origin } = getWebAuthnRpConfig(reqHeaders);
    const resetUrl = `${origin}/reset-password/${encodeURIComponent(result.rawToken)}`;

    return {
      success: true,
      resetUrl,
      expiresAt: result.expiresAt.toISOString(),
      requiresSecondKitchenCheck: result.requiresSecondKitchenCheck,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to create password reset link.",
    };
  }
}

export async function redeemPasswordResetAction(input: {
  token: string;
  newPassword: string;
  secondKitchenName?: string;
}): Promise<{
  success: boolean;
  username?: string;
  errorCode?: string;
  error?: string;
}> {
  const ip = await getClientIp();
  const tokenPrefix = input.token ? hashResetToken(input.token).slice(0, 12) : "none";

  const rl = checkRateLimit(`${ip}:${tokenPrefix}`, {
    keyPrefix: "auth:redeem-reset",
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });
  if (!rl.success) {
    return {
      success: false,
      errorCode: "RATE_LIMITED",
      error: "Too many attempts. Please wait a few minutes before trying again.",
    };
  }

  const res = await redeemPasswordResetToken({
    rawToken: input.token,
    newPassword: input.newPassword,
    secondKitchenName: input.secondKitchenName,
  });

  if (!res.success) {
    const errorMap: Record<string, string> = {
      INVALID_OR_EXPIRED: "This password reset link is invalid or has expired.",
      PASSWORD_TOO_SHORT: "Password must be at least 6 characters long.",
      SECOND_KITCHEN_REQUIRED: "Please enter the name of another kitchen you belong to.",
      SECOND_KITCHEN_MISMATCH: "Kitchen name did not match your other memberships.",
    };
    return {
      success: false,
      errorCode: res.errorCode,
      error: errorMap[res.errorCode] || "Could not reset password.",
    };
  }

  return {
    success: true,
    username: res.username,
  };
}
