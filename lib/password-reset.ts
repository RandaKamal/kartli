import crypto from "node:crypto";
import { pool } from "@/lib/db";
import { hashPasswordAsync } from "@/lib/password";
import type { PasswordResetAuditEntry } from "@/types";

export const RESET_TOKEN_TTL_MINUTES = 15;

export function hashResetToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export interface CreateResetLinkResult {
  rawToken: string;
  expiresAt: Date;
  requiresSecondKitchenCheck: boolean;
}

export async function createAdminPasswordResetToken(input: {
  kitchenId: string;
  adminUserId: string;
  targetUserId: string;
}): Promise<CreateResetLinkResult> {
  const { kitchenId, adminUserId, targetUserId } = input;

  if (adminUserId === targetUserId) {
    throw new Error("You cannot create a password reset link for yourself.");
  }

  // 1. Verify caller is an active ADMIN in this kitchen
  const { rows: adminRows } = await pool.query<{ role: string }>(
    `SELECT role
     FROM public.kitchen_members
     WHERE kitchen_id = $1 AND user_id = $2 AND joined_at IS NOT NULL
     LIMIT 1`,
    [kitchenId, adminUserId]
  );
  if (adminRows.length === 0 || adminRows[0].role !== "ADMIN") {
    throw new Error("Only kitchen admins can create password reset links.");
  }

  // 2. Verify target user is an active member in this kitchen
  const { rows: targetRows } = await pool.query<{ id: string }>(
    `SELECT km.id
     FROM public.kitchen_members km
     JOIN public.users u ON u.id = km.user_id
     WHERE km.kitchen_id = $1
       AND km.user_id = $2
       AND km.joined_at IS NOT NULL
       AND NOT u.username LIKE 'deleted_user_%'
     LIMIT 1`,
    [kitchenId, targetUserId]
  );
  if (targetRows.length === 0) {
    throw new Error("Target user is not an active member of this kitchen.");
  }

  // 3. Check if target user belongs to multiple kitchens
  const { rows: countRows } = await pool.query<{ kitchen_count: number }>(
    `SELECT COUNT(DISTINCT kitchen_id)::int AS kitchen_count
     FROM public.kitchen_members
     WHERE user_id = $1 AND joined_at IS NOT NULL`,
    [targetUserId]
  );
  const kitchenCount = countRows[0]?.kitchen_count ?? 1;
  const requiresSecondKitchenCheck = kitchenCount > 1;

  const rawToken = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Invalidate any prior unused reset tokens for this user
    await client.query(
      `UPDATE public.password_reset_tokens
       SET used_at = NOW()
       WHERE user_id = $1 AND used_at IS NULL`,
      [targetUserId]
    );

    await client.query(
      `INSERT INTO public.password_reset_tokens (
         user_id,
         kitchen_id,
         created_by_admin_id,
         token_hash,
         requires_second_kitchen_check,
         expires_at
       )
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        targetUserId,
        kitchenId,
        adminUserId,
        tokenHash,
        requiresSecondKitchenCheck,
        expiresAt,
      ]
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return {
    rawToken,
    expiresAt,
    requiresSecondKitchenCheck,
  };
}

export interface ResetTokenValidationResult {
  valid: boolean;
  username?: string;
  requiresSecondKitchenCheck?: boolean;
  expiresAt?: string;
}

export async function validatePasswordResetToken(
  rawToken: string
): Promise<ResetTokenValidationResult> {
  if (!rawToken || typeof rawToken !== "string") {
    return { valid: false };
  }

  const tokenHash = hashResetToken(rawToken.trim());
  const { rows } = await pool.query<{
    username: string;
    requires_second_kitchen_check: boolean;
    expires_at: Date;
  }>(
    `SELECT u.username, t.requires_second_kitchen_check, t.expires_at
     FROM public.password_reset_tokens t
     JOIN public.users u ON u.id = t.user_id
     WHERE t.token_hash = $1
       AND t.used_at IS NULL
       AND t.expires_at > NOW()
       AND NOT u.username LIKE 'deleted_user_%'
     LIMIT 1`,
    [tokenHash]
  );

  if (rows.length === 0) {
    return { valid: false };
  }

  return {
    valid: true,
    username: rows[0].username,
    requiresSecondKitchenCheck: Boolean(rows[0].requires_second_kitchen_check),
    expiresAt: new Date(rows[0].expires_at).toISOString(),
  };
}

export type RedeemResetResult =
  | { success: true; username: string }
  | {
      success: false;
      errorCode:
        | "INVALID_OR_EXPIRED"
        | "PASSWORD_TOO_SHORT"
        | "SECOND_KITCHEN_REQUIRED"
        | "SECOND_KITCHEN_MISMATCH";
    };

export async function redeemPasswordResetToken(input: {
  rawToken: string;
  newPassword: string;
  secondKitchenName?: string;
}): Promise<RedeemResetResult> {
  const { rawToken, newPassword, secondKitchenName } = input;

  if (!newPassword || newPassword.length < 6) {
    return { success: false, errorCode: "PASSWORD_TOO_SHORT" };
  }

  const tokenHash = hashResetToken(rawToken.trim());
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows } = await client.query<{
      id: string;
      user_id: string;
      kitchen_id: string;
      requires_second_kitchen_check: boolean;
      expires_at: Date;
      used_at: Date | null;
      username: string;
    }>(
      `SELECT t.id, t.user_id, t.kitchen_id, t.requires_second_kitchen_check, t.expires_at, t.used_at, u.username
       FROM public.password_reset_tokens t
       JOIN public.users u ON u.id = t.user_id
       WHERE t.token_hash = $1
       FOR UPDATE`,
      [tokenHash]
    );

    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return { success: false, errorCode: "INVALID_OR_EXPIRED" };
    }

    const tokenRow = rows[0];
    if (
      tokenRow.used_at !== null ||
      new Date(tokenRow.expires_at).getTime() <= Date.now() ||
      tokenRow.username.startsWith("deleted_user_")
    ) {
      await client.query("ROLLBACK");
      return { success: false, errorCode: "INVALID_OR_EXPIRED" };
    }

    if (tokenRow.requires_second_kitchen_check) {
      const cleanKitchenName = secondKitchenName?.trim();
      if (!cleanKitchenName) {
        await client.query("ROLLBACK");
        return { success: false, errorCode: "SECOND_KITCHEN_REQUIRED" };
      }

      const { rows: matchRows } = await client.query<{ id: string }>(
        `SELECT k.id
         FROM public.kitchen_members km
         JOIN public.kitchens k ON k.id = km.kitchen_id
         WHERE km.user_id = $1
           AND km.joined_at IS NOT NULL
           AND km.kitchen_id <> $2
           AND LOWER(TRIM(k.name)) = LOWER(TRIM($3))
         LIMIT 1`,
        [tokenRow.user_id, tokenRow.kitchen_id, cleanKitchenName]
      );

      if (matchRows.length === 0) {
        await client.query("ROLLBACK");
        return { success: false, errorCode: "SECOND_KITCHEN_MISMATCH" };
      }
    }

    const newHash = await hashPasswordAsync(newPassword);

    await client.query(
      `UPDATE public.users
       SET password_hash = $1,
           session_version = COALESCE(session_version, 1) + 1,
           updated_at = NOW()
       WHERE id = $2`,
      [newHash, tokenRow.user_id]
    );

    await client.query(
      `UPDATE public.password_reset_tokens
       SET used_at = NOW()
       WHERE id = $1 AND used_at IS NULL`,
      [tokenRow.id]
    );

    await client.query("COMMIT");
    return { success: true, username: tokenRow.username };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function getUserPasswordResetAudit(
  userId: string
): Promise<PasswordResetAuditEntry[]> {
  try {
    const { rows } = await pool.query<PasswordResetAuditEntry>(
      `SELECT
         t.id,
         t.kitchen_id,
         k.name AS kitchen_name,
         admin_user.username AS created_by_username,
         t.requires_second_kitchen_check,
         t.expires_at,
         t.used_at,
         t.created_at
       FROM public.password_reset_tokens t
       JOIN public.kitchens k ON k.id = t.kitchen_id
       LEFT JOIN public.users admin_user ON admin_user.id = t.created_by_admin_id
       WHERE t.user_id = $1
       ORDER BY t.created_at DESC
       LIMIT 10`,
      [userId]
    );
    return rows;
  } catch {
    return [];
  }
}
