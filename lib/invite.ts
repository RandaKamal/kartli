import { pool } from "@/lib/db";
import type { ClaimInviteResult, InviteDetails } from "@/types";

export const PENDING_INVITE_COOKIE_NAME = "pending_invite_token";

/**
 * Standard cookie configuration for pending invite tokens.
 */
export const PENDING_INVITE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24, // 24 hours
};

/**
 * Resolves invite token details without state mutation.
 *
 * @param inviteToken - Unique invite token.
 * @returns Invite details or null if not found.
 */
export async function getInviteByToken(
  inviteToken: string
): Promise<InviteDetails | null> {
  const token = inviteToken?.trim();
  if (!token) return null;

  const sql = `
    SELECT
      km.id,
      km.kitchen_id,
      k.name AS kitchen_name,
      km.kitchen_display_name,
      km.role,
      (km.user_id IS NOT NULL) AS is_claimed,
      km.joined_at
    FROM kitchen_members km
    JOIN kitchens k ON km.kitchen_id = k.id
    WHERE km.invite_token = $1
  `;
  const { rows } = await pool.query<InviteDetails>(sql, [token]);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Claims an invite token for an authenticated user.
 *
 * Edge cases handled:
 * - Unauthenticated user
 * - Invalid or nonexistent invite token
 * - Already claimed invite token
 * - User already an active member of this kitchen
 *
 * @param inviteToken - One-time claim token.
 * @param userId - UUID of the authenticated user.
 * @returns Result object.
 */
export async function claimInvite(
  inviteToken: string,
  userId: string
): Promise<ClaimInviteResult> {
  if (!userId) {
    return {
      success: false,
      error: "UNAUTHENTICATED",
      message: "You must be signed in to accept this invite.",
    };
  }

  const token = inviteToken?.trim();
  if (!token) {
    return {
      success: false,
      error: "INVITE_NOT_FOUND",
      message: "No invite token was provided.",
    };
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Find member record with this invite token
    const findMemberSql = `
      SELECT id, kitchen_id, user_id, kitchen_display_name, role, invite_token
      FROM kitchen_members
      WHERE invite_token = $1
      FOR UPDATE
    `;
    const { rows: memberRows } = await client.query(findMemberSql, [token]);

    if (memberRows.length === 0) {
      await client.query("ROLLBACK");
      return {
        success: false,
        error: "INVITE_NOT_FOUND",
        message: "Invite token not found or already consumed.",
      };
    }

    const placeholderMember = memberRows[0];

    // 2. Check if already claimed
    if (placeholderMember.user_id !== null) {
      await client.query("ROLLBACK");
      return {
        success: false,
        error: "INVITE_ALREADY_CLAIMED",
        message: "This invite link has already been claimed.",
      };
    }

    // 3. Check if user is already a member of this kitchen
    const existingMembershipSql = `
      SELECT id, role, kitchen_display_name
      FROM kitchen_members
      WHERE kitchen_id = $1 AND user_id = $2 AND joined_at IS NOT NULL
    `;
    const { rows: existingMembershipRows } = await client.query(
      existingMembershipSql,
      [placeholderMember.kitchen_id, userId]
    );

    if (existingMembershipRows.length > 0) {
      await client.query("ROLLBACK");
      return {
        success: false,
        error: "ALREADY_MEMBER",
        message: "You are already a member of this kitchen.",
        kitchenId: placeholderMember.kitchen_id,
      };
    }

    // 4. Atomically claim invite
    const updateMemberSql = `
      UPDATE kitchen_members
      SET user_id = $1, joined_at = NOW(), invite_token = NULL
      WHERE id = $2 AND invite_token = $3 AND user_id IS NULL
      RETURNING id, kitchen_id, kitchen_display_name, role
    `;
    const { rows: updatedRows } = await client.query(updateMemberSql, [
      userId,
      placeholderMember.id,
      token,
    ]);

    if (updatedRows.length === 0) {
      await client.query("ROLLBACK");
      return {
        success: false,
        error: "INVITE_ALREADY_CLAIMED",
        message: "Invite was claimed in a concurrent request.",
      };
    }

    await client.query("COMMIT");

    const claimed = updatedRows[0];
    return {
      success: true,
      kitchenId: claimed.kitchen_id,
      memberId: claimed.id,
      kitchenDisplayName: claimed.kitchen_display_name,
      role: claimed.role,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    return {
      success: false,
      error: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "Internal server error occurred while claiming invite.",
    };
  } finally {
    client.release();
  }
}
