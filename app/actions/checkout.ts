"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { getUserMembership, isUserKitchenAdmin } from "@/lib/kitchen";
import {
  createCheckout,
  getKitchenCheckouts,
  getUserCheckouts,
  refundCheckout,
  deleteReceiptForSide,
} from "@/lib/pantry";
import type { Checkout, CheckoutWithDetails } from "@/types";

async function requireMembership(kitchenId: string): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("You must be logged in.");
  const membership = await getUserMembership(kitchenId, session.user.id);
  if (!membership) throw new Error("You are not a member of this kitchen.");
  return session.user.id;
}

function revalidateKitchen(kitchenId: string) {
  revalidatePath(`/kitchen/${kitchenId}/member`);
  revalidatePath(`/kitchen/${kitchenId}/admin`);
  revalidatePath(`/kitchen/${kitchenId}/admin/purchases`);
}

export async function checkoutAction(
  kitchenId: string,
  receiptFilename?: string | null,
  options?: { storeName?: string | null; note?: string | null; totalAmount?: number; currency?: string }
): Promise<Checkout> {
  const userId = await requireMembership(kitchenId);
  const checkout = await createCheckout(kitchenId, userId, receiptFilename, options);
  revalidateKitchen(kitchenId);
  return checkout;
}

export async function getKitchenCheckoutsAction(kitchenId: string): Promise<CheckoutWithDetails[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("You must be logged in.");
  const isAdmin = await isUserKitchenAdmin(kitchenId, session.user.id);
  if (!isAdmin) throw new Error("Unauthorized.");
  return await getKitchenCheckouts(kitchenId);
}

export async function getMyCheckoutsAction(kitchenId: string): Promise<CheckoutWithDetails[]> {
  const userId = await requireMembership(kitchenId);
  return await getUserCheckouts(kitchenId, userId);
}

export async function refundCheckoutAction(kitchenId: string, checkoutId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("You must be logged in.");
  const result = await refundCheckout(kitchenId, checkoutId, session.user.id);
  revalidateKitchen(kitchenId);
  return result;
}

export async function deleteReceiptForAdminAction(kitchenId: string, receiptId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("You must be logged in.");
  await deleteReceiptForSide(kitchenId, receiptId, session.user.id, "admin");
  revalidateKitchen(kitchenId);
}

export async function deleteReceiptForMemberAction(kitchenId: string, receiptId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("You must be logged in.");
  await deleteReceiptForSide(kitchenId, receiptId, session.user.id, "member");
  revalidateKitchen(kitchenId);
}
