import type { DefaultSession } from "next-auth";

/**
 * Role of a member within a kitchen.
 */
export type KitchenRole = "ADMIN" | "MEMBER";

/**
 * Household / Space preset controlling terminology across the app.
 */
export type KitchenSpaceType = "FLATSHARE" | "FAMILY" | "NEUTRAL" | "OFFICE";

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
  space_type: KitchenSpaceType;
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
  spaceType?: KitchenSpaceType;
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
  space_type?: KitchenSpaceType;
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
 * Represents an inventory item within a kitchen.
 */
export interface PantryItem {
  id: string;
  kitchen_id: string;
  name: string;
  is_out_of_stock: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Represents an item on a kitchen's shopping list.
 * Always generated from a pantry item going out of stock.
 */
export interface ShoppingListItem {
  id: string;
  kitchen_id: string;
  pantry_item_id: string | null;
  name: string;
  item_price: number | null;
  is_purchased: boolean;
  purchased_by: string | null;
  purchased_by_name?: string | null;
  is_guest_staged: boolean;
  checkout_id: string | null;
  created_at: Date;
}

export interface UpdateKitchenNameInput {
  kitchenId: string;
  newName: string;
}

export interface UpdateKitchenSettingsInput {
  kitchenId: string;
  name: string;
  spaceType: KitchenSpaceType;
}

export interface Checkout {
  id: string;
  kitchen_id: string;
  user_id: string;
  store_name: string | null;
  total_claimed_amount: number;
  total_receipt_amount: number | null;
  receipt_filename: string;
  is_refunded: boolean;
  created_at: Date;
  refunded_at: Date | null;
  receipt_deleted_at: Date | null;
}

export interface CheckoutWithDetails extends Checkout {
  username: string | null;
  items: ShoppingListItem[];
}

export interface ReceiptLine {
  raw_name: string;
  price: number;
  quantity: number;
  matched_cart_item_id: string | null;
}

export interface ScanReceiptResult {
  receiptPath: string;
  storeName: string;
  totalReceiptAmount: number;
  lines: ReceiptLine[];
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
