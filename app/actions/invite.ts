"use server";

import { cookies } from "next/headers";
import { auth } from "@/auth";
import {
  claimInvite,
  getInviteByToken,
  PENDING_INVITE_COOKIE_NAME,
} from "@/lib/invite";
import type { ClaimInviteResult, InviteDetails } from "@/types";

/**
 * Server Action to look up invite details by token.
 */
export async function resolveInviteAction(
  inviteToken: string
): Promise<InviteDetails | null> {
  return await getInviteByToken(inviteToken);
}

/**
 * Server Action to claim an invite token for the current session user.
 */
export async function claimInviteAction(
  inviteToken: string
): Promise<ClaimInviteResult> {
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
