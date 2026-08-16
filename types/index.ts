import type { DefaultSession } from "next-auth";

/**
 * Role of a member within a kitchen.
 */
export type KitchenRole = "ADMIN" | "MEMBER";

/**
 * Represents a user record in the `users` table.
 */
export interface DbUser {
  id: string;
  username: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Represents a kitchen record in the `kitchens` table.
 */
export interface Kitchen {
  id: string;
  name: string;
  public_view_token: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Represents a member record in the `kitchen_members` table.
 */
export interface KitchenMember {
  id: string;
  kitchen_id: string;
  user_id: string | null;
  kitchen_display_name: string;
  role: KitchenRole;
  invite_token: string | null;
  joined_at: Date | null;
  created_at: Date;
}

/**
 * Member record joined with user account information.
 */
export interface KitchenMemberWithUser extends KitchenMember {
  username: string | null;
}

/**
 * Input for creating a new kitchen and generating placeholder member invites.
 */
export interface CreateKitchenInput {
  name: string;
  memberNames?: string[];
  adminDisplayName?: string;
}

/**
 * Result returned upon successful kitchen creation.
 */
export interface CreateKitchenResult {
  kitchen: Kitchen;
  adminMember: KitchenMember;
  invitedMembers: Array<{
    id: string;
    kitchen_display_name: string;
    invite_token: string;
    invite_url: string;
  }>;
  public_view_url: string;
}

/**
 * Summary of an invite token lookup.
 */
export interface InviteDetails {
  id: string;
  kitchen_id: string;
  kitchen_name: string;
  kitchen_display_name: string;
  role: KitchenRole;
  is_claimed: boolean;
  joined_at: Date | null;
}

/**
 * Error codes for invite claiming operations.
 */
export type ClaimInviteErrorCode =
  | "UNAUTHENTICATED"
  | "INVITE_NOT_FOUND"
  | "INVITE_ALREADY_CLAIMED"
  | "ALREADY_MEMBER"
  | "INTERNAL_ERROR";

/**
 * Result of claiming an invite.
 */
export type ClaimInviteResult =
  | {
      success: true;
      kitchenId: string;
      memberId: string;
      kitchenDisplayName: string;
      role: KitchenRole;
    }
  | {
      success: false;
      error: ClaimInviteErrorCode;
      message: string;
      kitchenId?: string;
    };

/**
 * Public context returned for guest / read-only kitchen view.
 */
export interface PublicKitchenContext {
  id: string;
  name: string;
  public_view_token: string;
  created_at: Date;
  members: Array<{
    id: string;
    kitchen_display_name: string;
    role: KitchenRole;
    is_active: boolean;
  }>;
}

/**
 * Module augmentation for NextAuth v5 session, user, and JWT types.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    username?: string;
  }
}
