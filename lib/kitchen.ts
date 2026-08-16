import { randomBytes } from "node:crypto";
import { pool } from "@/lib/db";
import type {
  Kitchen,
  KitchenMember,
  KitchenMemberWithUser,
  CreateKitchenInput,
  CreateKitchenResult,
  PublicKitchenContext,
} from "@/types";

/**
 * Generates a cryptographically secure random hexadecimal token.
 *
 * @param bytes - Number of random bytes (default: 24, producing a 48-character string).
 * @returns Hexadecimal token string.
 */
export function generateSecureToken(bytes: number = 24): string {
  return randomBytes(bytes).toString("hex");
}

/**
 * Creates a new kitchen and generates placeholder member invites.
 * Executes atomically in a database transaction.
 *
 * @param input - Kitchen name, member display names, and optional admin display name.
 * @param creatorUserId - UUID of the authenticated creator user.
 * @returns Created kitchen details, admin member record, and invited members with invite tokens.
 */
export async function createKitchen(
  input: CreateKitchenInput,
  creatorUserId: string
): Promise<CreateKitchenResult> {
  const kitchenName = input.name?.trim();
  if (!kitchenName) {
    throw new Error("Kitchen name is required and cannot be empty.");
  }

  if (!creatorUserId) {
    throw new Error("Creator user ID is required to create a kitchen.");
  }

  // Deduplicate and filter member names
  const rawMemberNames = input.memberNames ?? [];
  const memberNames = Array.from(
    new Set(rawMemberNames.map((name) => name.trim()).filter((name) => name.length > 0))
  );

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Insert kitchen with public view token
    const publicViewToken = generateSecureToken(24);
    const insertKitchenSql = `
      INSERT INTO kitchens (name, public_view_token, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW())
      RETURNING id, name, public_view_token, created_at, updated_at
    `;
    const { rows: kitchenRows } = await client.query<Kitchen>(insertKitchenSql, [
      kitchenName,
      publicViewToken,
    ]);
    const kitchen = kitchenRows[0];

    // 2. Resolve creator display name
    let adminDisplayName = input.adminDisplayName?.trim();
    if (!adminDisplayName) {
      const userRes = await client.query<{ username: string }>(
        `SELECT username FROM users WHERE id = $1`,
        [creatorUserId]
      );
      adminDisplayName = userRes.rows[0]?.username || "Admin";
    }

    // 3. Insert creator as ADMIN
    const insertAdminSql = `
      INSERT INTO kitchen_members (
        kitchen_id,
        user_id,
        kitchen_display_name,
        role,
        invite_token,
        joined_at,
        created_at
      )
      VALUES ($1, $2, $3, 'ADMIN', NULL, NOW(), NOW())
      RETURNING id, kitchen_id, user_id, kitchen_display_name, role, invite_token, joined_at, created_at
    `;
    const { rows: adminRows } = await client.query<KitchenMember>(insertAdminSql, [
      kitchen.id,
      creatorUserId,
      adminDisplayName,
    ]);
    const adminMember = adminRows[0];

    // 4. Create placeholder records for invited members
    const invitedMembers: CreateKitchenResult["invitedMembers"] = [];

    for (const memberName of memberNames) {
      const inviteToken = generateSecureToken(24);
      const insertMemberSql = `
        INSERT INTO kitchen_members (
          kitchen_id,
          user_id,
          kitchen_display_name,
          role,
          invite_token,
          joined_at,
          created_at
        )
        VALUES ($1, NULL, $2, 'MEMBER', $3, NULL, NOW())
        RETURNING id, kitchen_id, user_id, kitchen_display_name, role, invite_token, joined_at, created_at
      `;
      const { rows: memberRows } = await client.query<KitchenMember>(insertMemberSql, [
        kitchen.id,
        memberName,
        inviteToken,
      ]);
      const member = memberRows[0];

      invitedMembers.push({
        id: member.id,
        kitchen_display_name: member.kitchen_display_name,
        invite_token: inviteToken,
        invite_url: `/invite/${inviteToken}`,
      });
    }

    await client.query("COMMIT");

    return {
      kitchen,
      adminMember,
      invitedMembers,
      public_view_url: `/kitchen/view/${kitchen.public_view_token}`,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Adds a new placeholder member to an existing kitchen (Admin action).
 *
 * @param kitchenId - UUID of the kitchen.
 * @param memberDisplayName - Name for the invited member slot.
 * @param adminUserId - UUID of the requesting admin user.
 * @returns The created member record and full invite URL.
 */
export async function addKitchenMember(
  kitchenId: string,
  memberDisplayName: string,
  adminUserId: string
): Promise<{ member: KitchenMember; invite_url: string }> {
  const cleanName = memberDisplayName?.trim();
  if (!cleanName) {
    throw new Error("Member name cannot be empty.");
  }

  const isAdmin = await isUserKitchenAdmin(kitchenId, adminUserId);
  if (!isAdmin) {
    throw new Error("Unauthorized: Only kitchen admins can invite new members.");
  }

  const inviteToken = generateSecureToken(24);
  const sql = `
    INSERT INTO kitchen_members (
      kitchen_id,
      user_id,
      kitchen_display_name,
      role,
      invite_token,
      joined_at,
      created_at
    )
    VALUES ($1, NULL, $2, 'MEMBER', $3, NULL, NOW())
    RETURNING id, kitchen_id, user_id, kitchen_display_name, role, invite_token, joined_at, created_at
  `;
  const { rows } = await pool.query<KitchenMember>(sql, [kitchenId, cleanName, inviteToken]);
  const member = rows[0];

  return {
    member,
    invite_url: `/invite/${inviteToken}`,
  };
}

/**
 * Fetches a kitchen by its ID.
 *
 * @param kitchenId - UUID of the kitchen.
 * @returns Kitchen record or null.
 */
export async function getKitchenById(kitchenId: string): Promise<Kitchen | null> {
  const sql = `
    SELECT id, name, public_view_token, created_at, updated_at
    FROM kitchens
    WHERE id = $1
  `;
  const { rows } = await pool.query<Kitchen>(sql, [kitchenId]);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Fetches all members of a kitchen with joined user account information.
 *
 * @param kitchenId - UUID of the kitchen.
 * @returns Array of member records with user details.
 */
export async function getKitchenMembersWithUsers(
  kitchenId: string
): Promise<KitchenMemberWithUser[]> {
  const sql = `
    SELECT
      km.id,
      km.kitchen_id,
      km.user_id,
      km.kitchen_display_name,
      km.role,
      km.invite_token,
      km.joined_at,
      km.created_at,
      u.username
    FROM kitchen_members km
    LEFT JOIN users u ON km.user_id = u.id
    WHERE km.kitchen_id = $1
    ORDER BY
      CASE WHEN km.role = 'ADMIN' THEN 0 ELSE 1 END,
      CASE WHEN km.joined_at IS NOT NULL THEN 0 ELSE 1 END,
      km.created_at ASC
  `;
  const { rows } = await pool.query<KitchenMemberWithUser>(sql, [kitchenId]);
  return rows;
}

/**
 * Checks if a specific user has ADMIN permissions for a kitchen.
 *
 * @param kitchenId - UUID of the kitchen.
 * @param userId - UUID of the user.
 * @returns True if user is an active admin in this kitchen.
 */
export async function isUserKitchenAdmin(
  kitchenId: string,
  userId: string
): Promise<boolean> {
  if (!kitchenId || !userId) return false;

  const sql = `
    SELECT id
    FROM kitchen_members
    WHERE kitchen_id = $1 AND user_id = $2 AND role = 'ADMIN' AND joined_at IS NOT NULL
  `;
  const { rows } = await pool.query(sql, [kitchenId, userId]);
  return rows.length > 0;
}

/**
 * Retrieves a user's active membership for a kitchen.
 *
 * @param kitchenId - UUID of the kitchen.
 * @param userId - UUID of the user.
 * @returns Kitchen member record or null.
 */
export async function getUserMembership(
  kitchenId: string,
  userId: string
): Promise<KitchenMember | null> {
  if (!kitchenId || !userId) return null;

  const sql = `
    SELECT id, kitchen_id, user_id, kitchen_display_name, role, invite_token, joined_at, created_at
    FROM kitchen_members
    WHERE kitchen_id = $1 AND user_id = $2 AND joined_at IS NOT NULL
  `;
  const { rows } = await pool.query<KitchenMember>(sql, [kitchenId, userId]);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Retrieves public, read-only kitchen details by public view token.
 *
 * @param publicViewToken - Unique public token.
 * @returns Public kitchen context or null if invalid.
 */
export async function getKitchenByPublicToken(
  publicViewToken: string
): Promise<PublicKitchenContext | null> {
  const trimmedToken = publicViewToken?.trim();
  if (!trimmedToken) return null;

  const kitchenSql = `
    SELECT id, name, public_view_token, created_at
    FROM kitchens
    WHERE public_view_token = $1
  `;
  const { rows: kitchenRows } = await pool.query<{
    id: string;
    name: string;
    public_view_token: string;
    created_at: Date;
  }>(kitchenSql, [trimmedToken]);

  if (kitchenRows.length === 0) {
    return null;
  }

  const kitchen = kitchenRows[0];

  const membersSql = `
    SELECT
      id,
      kitchen_display_name,
      role,
      (user_id IS NOT NULL AND joined_at IS NOT NULL) AS is_active
    FROM kitchen_members
    WHERE kitchen_id = $1
    ORDER BY role ASC, created_at ASC
  `;
  const { rows: memberRows } = await pool.query<{
    id: string;
    kitchen_display_name: string;
    role: "ADMIN" | "MEMBER";
    is_active: boolean;
  }>(membersSql, [kitchen.id]);

  return {
    id: kitchen.id,
    name: kitchen.name,
    public_view_token: kitchen.public_view_token,
    created_at: kitchen.created_at,
    members: memberRows,
  };
}

/**
 * Fetches all kitchens where the user is an active member.
 *
 * @param userId - UUID of the user.
 * @returns Array of kitchens and memberships.
 */
export async function getUserKitchens(userId: string): Promise<
  Array<{
    kitchen: Kitchen;
    membership: KitchenMember;
  }>
> {
  const sql = `
    SELECT
      k.id AS k_id,
      k.name AS k_name,
      k.public_view_token AS k_public_view_token,
      k.created_at AS k_created_at,
      k.updated_at AS k_updated_at,
      m.id AS m_id,
      m.kitchen_id AS m_kitchen_id,
      m.user_id AS m_user_id,
      m.kitchen_display_name AS m_kitchen_display_name,
      m.role AS m_role,
      m.invite_token AS m_invite_token,
      m.joined_at AS m_joined_at,
      m.created_at AS m_created_at
    FROM kitchens k
    JOIN kitchen_members m ON k.id = m.kitchen_id
    WHERE m.user_id = $1 AND m.joined_at IS NOT NULL
    ORDER BY m.created_at ASC
  `;
  const { rows } = await pool.query(sql, [userId]);

  return rows.map((row) => ({
    kitchen: {
      id: row.k_id,
      name: row.k_name,
      public_view_token: row.k_public_view_token,
      created_at: row.k_created_at,
      updated_at: row.k_updated_at,
    },
    membership: {
      id: row.m_id,
      kitchen_id: row.m_kitchen_id,
      user_id: row.m_user_id,
      kitchen_display_name: row.m_kitchen_display_name,
      role: row.m_role,
      invite_token: row.m_invite_token,
      joined_at: row.m_joined_at,
      created_at: row.m_created_at,
    },
  }));
}
