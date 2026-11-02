"use server";

import { cookies, headers } from "next/headers";
import { auth } from "@/auth";
import {
  claimInvite,
  getInviteByToken,
  PENDING_INVITE_COOKIE_NAME,
} from "@/lib/invite";
import type { ClaimInviteResult, InviteDetails } from "@/types";
import { checkRateLimit } from "@/lib/rate-limit";

async function getClientIdentifier(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return headerList.get("x-real-ip") || "127.0.0.1";
}

/**
 * Server Action to look up invite details by token.
 */
export async function resolveInviteAction(
  inviteToken: string
): Promise<InviteDetails | null> {
  const clientIp = await getClientIdentifier();
  const rateLimit = checkRateLimit(clientIp, {
    keyPrefix: "invite:resolve",
    limit: 60,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.success) {
    return null;
  }

  return await getInviteByToken(inviteToken);
}

/**
 * Server Action to claim an invite token for the current session user.
 */
export async function claimInviteAction(
  inviteToken: string
): Promise<ClaimInviteResult> {
  const clientIp = await getClientIdentifier();
  const rateLimit = checkRateLimit(clientIp, {
    keyPrefix: "invite:claim",
    limit: 15,
    windowMs: 5 * 60 * 1000,
  });

  if (!rateLimit.success) {
    return {
      success: false,
      error: "RATE_LIMITED",
      message: "Too many attempts to accept invite. Please try again later.",
    };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return {
      success: false,
      error: "UNAUTHENTICATED",
      message: "You must be signed in to accept an invite.",
    };
  }

  const result = await claimInvite(inviteToken, session.user.id);

  if (result.success || result.error === "ALREADY_MEMBER") {
    const cookieStore = await cookies();
    cookieStore.delete(PENDING_INVITE_COOKIE_NAME);
  }

  return result;
}
