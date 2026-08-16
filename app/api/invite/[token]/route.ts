import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  claimInvite,
  getInviteByToken,
  PENDING_INVITE_COOKIE_NAME,
} from "@/lib/invite";

/**
 * GET /api/invite/[token]
 * Resolves invite token details without modifying database state.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const invite = await getInviteByToken(token);

  if (!invite) {
    return NextResponse.json(
      { error: "INVITE_NOT_FOUND", message: "Invite token not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    id: invite.id,
    kitchenId: invite.kitchen_id,
    kitchenName: invite.kitchen_name,
    kitchenDisplayName: invite.kitchen_display_name,
    role: invite.role,
    isClaimed: invite.is_claimed,
  });
}

/**
 * POST /api/invite/[token]
 * Claims the specified invite token for the authenticated user.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      {
        success: false,
        error: "UNAUTHENTICATED",
        message: "You must be signed in to claim this invite.",
      },
      { status: 401 }
    );
  }

  const result = await claimInvite(token, session.user.id);

  if (!result.success) {
    const status =
      result.error === "INVITE_NOT_FOUND"
        ? 404
        : result.error === "ALREADY_MEMBER" || result.error === "INVITE_ALREADY_CLAIMED"
        ? 400
        : 500;

    return NextResponse.json(result, { status });
  }

  const response = NextResponse.json(result, { status: 200 });
  response.cookies.delete(PENDING_INVITE_COOKIE_NAME);
  return response;
}
