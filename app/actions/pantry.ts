"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getUserMembership } from "@/lib/kitchen";
import { getGuestCartCookieName } from "@/lib/guestCart";
import {
  getPantryItems,
  addPantryItem,
  setPantryItemStock,
  deletePantryItem,
  getShoppingListItems,
  addCustomShoppingItem,
  togglePurchased,
  removeShoppingListItem,
  clearUserCart,
  clearBoughtShoppingListItems,
  transferGuestCartToUser,
  stageGuestShoppingItem as stageGuestShoppingItemDb,
  unstageGuestItem as unstageGuestItemDb,
} from "@/lib/pantry";
import type { PantryItem, ShoppingListItem } from "@/types";

async function requireMembership(kitchenId: string): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("You must be logged in.");
  }
  const membership = await getUserMembership(kitchenId, session.user.id);
  if (!membership) {
    throw new Error("You are not a member of this kitchen.");
  }
  return session.user.id;
}

function revalidateKitchen(kitchenId: string) {
  revalidatePath(`/kitchen/${kitchenId}/member`);
  revalidatePath(`/kitchen/${kitchenId}/admin`);
}

export async function getPantryItemsAction(kitchenId: string): Promise<PantryItem[]> {
  await requireMembership(kitchenId);
  return await getPantryItems(kitchenId);
}

export async function addPantryItemAction(kitchenId: string, name: string) {
  await requireMembership(kitchenId);
  const item = await addPantryItem(kitchenId, name);
  revalidateKitchen(kitchenId);
  return item;
}

export async function setPantryItemStockAction(
  kitchenId: string,
  itemId: string,
  isOutOfStock: boolean
) {
  await requireMembership(kitchenId);
  const item = await setPantryItemStock(kitchenId, itemId, isOutOfStock);
  revalidateKitchen(kitchenId);
  return item;
}

export async function deletePantryItemAction(kitchenId: string, itemId: string) {
  await requireMembership(kitchenId);
  const result = await deletePantryItem(kitchenId, itemId);
  revalidateKitchen(kitchenId);
  return result;
}

export async function getShoppingListItemsAction(kitchenId: string): Promise<ShoppingListItem[]> {
  await requireMembership(kitchenId);
  return await getShoppingListItems(kitchenId);
}

export async function addCustomShoppingItemAction(kitchenId: string, name: string) {
  await requireMembership(kitchenId);
  const item = await addCustomShoppingItem(kitchenId, name);
  revalidateKitchen(kitchenId);
  return item;
}

export async function togglePurchasedAction(
  kitchenId: string,
  itemId: string,
  isPurchased: boolean
) {
  const userId = await requireMembership(kitchenId);
  const item = await togglePurchased(kitchenId, itemId, isPurchased, userId);
  revalidateKitchen(kitchenId);
  return item;
}

export async function moveToCartAction(kitchenId: string, itemId: string) {
  return await togglePurchasedAction(kitchenId, itemId, true);
}

export async function returnToShoppingListAction(kitchenId: string, itemId: string) {
  return await togglePurchasedAction(kitchenId, itemId, false);
}

export async function removeShoppingListItemAction(kitchenId: string, itemId: string) {
  const userId = await requireMembership(kitchenId);
  const result = await removeShoppingListItem(kitchenId, itemId, userId);
  revalidateKitchen(kitchenId);
  return result;
}

/**
 * Puts all of the current user's staged cart items back on the needed shopping list.
 * Does NOT delete any items.
 */
export async function clearUserCartAction(kitchenId: string) {
  const userId = await requireMembership(kitchenId);
  const count = await clearUserCart(kitchenId, userId);
  revalidateKitchen(kitchenId);
  return count;
}

export const clearCartAction = clearUserCartAction;
export const clearBoughtShoppingListItemsAction = clearUserCartAction;

/**
 * Claims and transfers guest-staged shopping list items into the authenticated user's cart.
 */
export async function claimGuestCartAction(
  kitchenId: string,
  clientItemIds?: string[]
): Promise<{ transferredCount: number }> {
  const userId = await requireMembership(kitchenId);
  const cookieStore = await cookies();
  const cookieName = getGuestCartCookieName(kitchenId);

  let itemIds: string[] = clientItemIds || [];
  if (itemIds.length === 0) {
    const cookieVal = cookieStore.get(cookieName)?.value;
    if (cookieVal) {
      try {
        const decoded = decodeURIComponent(cookieVal);
        const parsed = JSON.parse(decoded);
        if (Array.isArray(parsed)) {
          itemIds = parsed;
        }
      } catch {
        // Ignore parsing errors
      }
    }
  }

  if (itemIds.length === 0) {
    return { transferredCount: 0 };
  }

  const transferredCount = await transferGuestCartToUser(kitchenId, itemIds, userId);

  // Clear the cookie on the server
  cookieStore.delete(cookieName);

  if (transferredCount > 0) {
    revalidateKitchen(kitchenId);
  }

  return { transferredCount };
}

/**
 * Server Action to stage or unstage an item anonymously from the guest view.
 */
export async function stageGuestShoppingItemAction(
  params: { kitchenId: string; itemId: string; isStaged: boolean } | string,
  maybeItemId?: string,
  maybeIsStaged?: boolean
) {
  const kitchenId = typeof params === "object" ? params.kitchenId : params;
  const itemId = typeof params === "object" ? params.itemId : (maybeItemId ?? "");
  const isStaged = typeof params === "object" ? params.isStaged : (maybeIsStaged ?? true);

  const item = await stageGuestShoppingItemDb(kitchenId, itemId, isStaged);
  revalidateKitchen(kitchenId);
  return item;
}

export const stageGuestShoppingItem = stageGuestShoppingItemAction;

/**
 * Server Action for an admin to unstage an abandoned guest item.
 * Sets is_guest_staged = FALSE, returning it to Needed Items.
 */
export async function unstageGuestItemAction(
  params: { kitchenId: string; itemId: string } | string,
  maybeItemId?: string
) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("You must be logged in.");
  }

  const kitchenId = typeof params === "object" ? params.kitchenId : params;
  const itemId = typeof params === "object" ? params.itemId : (maybeItemId ?? "");

  const item = await unstageGuestItemDb(kitchenId, itemId, session.user.id);
  revalidateKitchen(kitchenId);
  return item;
}

export const unstageGuestItem = unstageGuestItemAction;



