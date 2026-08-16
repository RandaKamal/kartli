"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  createKitchen,
  addKitchenMember,
  getKitchenById,
  getKitchenMembersWithUsers,
  isUserKitchenAdmin,
  getUserKitchens,
} from "@/lib/kitchen";
import type {
  CreateKitchenInput,
  CreateKitchenResult,
  Kitchen,
  KitchenMemberWithUser,
} from "@/types";

/**
 * Server Action to create a kitchen and redirect to the admin dashboard.
 */
export async function createKitchenAction(
  input: CreateKitchenInput
): Promise<CreateKitchenResult> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("You must be logged in to create a kitchen.");
  }

  const result = await createKitchen(input, session.user.id);
  return result;
}

/**
 * Server Action to handle FormData from the kitchen creation form.
 */
export async function createKitchenFormAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/kitchen/new");
  }

  const name = String(formData.get("name") || "").trim();
  const adminDisplayName = String(formData.get("adminDisplayName") || session.user.username || "").trim();
  const rawMembers = String(formData.get("members") || "");
  const memberNames = rawMembers
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (!name) {
    throw new Error("Kitchen name is required.");
  }

  const result = await createKitchen(
    {
      name,
      memberNames,
      adminDisplayName,
    },
    session.user.id
  );

  redirect(`/kitchen/${result.kitchen.id}/admin`);
}

/**
 * Server Action for an admin to add a new member slot to their kitchen.
 */
export async function addMemberAction(
  kitchenId: string,
  memberDisplayName: string
) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("You must be logged in.");
  }

  return await addKitchenMember(kitchenId, memberDisplayName, session.user.id);
}

/**
 * Server Action to fetch all member records for a kitchen.
 */
export async function getKitchenMembersAction(
  kitchenId: string
): Promise<KitchenMemberWithUser[]> {
  return await getKitchenMembersWithUsers(kitchenId);
}

/**
 * Server Action to fetch the current user's kitchen list.
 */
export async function getMyKitchensAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }

  return await getUserKitchens(session.user.id);
}
