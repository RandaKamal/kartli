"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { getUserMembership } from "@/lib/kitchen";
import {
  getPantryItems,
  addPantryItem,
  setPantryItemStock,
  deletePantryItem,
  getShoppingListItems,
  addCustomShoppingItem,
  togglePurchased,
  removeShoppingListItem,
  clearBoughtShoppingListItems,
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

export async function removeShoppingListItemAction(kitchenId: string, itemId: string) {
  await requireMembership(kitchenId);
  const result = await removeShoppingListItem(kitchenId, itemId);
  revalidateKitchen(kitchenId);
  return result;
}

export async function clearBoughtShoppingListItemsAction(kitchenId: string) {
  await requireMembership(kitchenId);
  const count = await clearBoughtShoppingListItems(kitchenId);
  revalidateKitchen(kitchenId);
  return count;
}
