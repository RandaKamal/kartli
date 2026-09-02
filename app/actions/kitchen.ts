"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createKitchen,
  addKitchenMember,
  cancelInvite,
  removeKitchenMember,
  getKitchenById,
  getKitchenMembersWithUsers,
  isUserKitchenAdmin,
  getUserKitchens,
  updateKitchenName as updateKitchenNameDb,
  updateKitchenSettings as updateKitchenSettingsDb,
  regeneratePublicViewToken as regeneratePublicViewTokenDb,
  leaveKitchen as leaveKitchenDb,
} from "@/lib/kitchen";
import type {
  CreateKitchenInput,
  CreateKitchenResult,
  Kitchen,
  KitchenMemberWithUser,
  KitchenSpaceType,
  UpdateKitchenNameInput,
  UpdateKitchenSettingsInput,
} from "@/types";
import { updateKitchenSettingsSchema } from "@/lib/validations/kitchen";

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
  const spaceTypeRaw = String(formData.get("spaceType") || "FLATSHARE").toUpperCase();
  const spaceType: KitchenSpaceType =
    spaceTypeRaw === "FAMILY" || spaceTypeRaw === "NEUTRAL" || spaceTypeRaw === "OFFICE"
      ? (spaceTypeRaw as KitchenSpaceType)
      : "FLATSHARE";
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
      spaceType,
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

  const result = await addKitchenMember(kitchenId, memberDisplayName, session.user.id);
  revalidatePath(`/kitchen/${kitchenId}/admin`);
  return result;
}

/**
 * Server Action for an admin to cancel and revoke a pending invite.
 */
export async function cancelInviteAction(
  kitchenId: string,
  memberId: string
) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("You must be logged in.");
  }

  const result = await cancelInvite(kitchenId, memberId, session.user.id);
  revalidatePath(`/kitchen/${kitchenId}/admin`);
  return result;
}

/**
 * Server Action for an admin to remove/kick an active member from the kitchen.
 */
export async function removeKitchenMemberAction(
  kitchenId: string,
  memberId: string
) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("You must be logged in.");
  }

  const result = await removeKitchenMember(kitchenId, memberId, session.user.id);
  revalidatePath(`/kitchen/${kitchenId}/admin`);
  return result;
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

/**
 * Server Action for an admin to rename a kitchen.
 * Supports passing either an object { kitchenId, newName } or two separate string arguments.
 */
export async function updateKitchenName(
  params: UpdateKitchenNameInput | string,
  maybeNewName?: string
): Promise<Kitchen> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("You must be logged in to rename the kitchen.");
  }

  const kitchenId = typeof params === "object" ? params.kitchenId : params;
  const newName = typeof params === "object" ? params.newName : (maybeNewName ?? "");

  const updatedKitchen = await updateKitchenNameDb(kitchenId, newName, session.user.id);

  revalidatePath(`/kitchen/${kitchenId}`);
  revalidatePath(`/kitchen/${kitchenId}/admin`);
  revalidatePath(`/kitchen/${kitchenId}/member`);
  revalidatePath(`/kitchen/${kitchenId}/admin/purchases`);
  revalidatePath(`/kitchen/view/${updatedKitchen.public_view_token}`);
  revalidatePath("/");

  return updatedKitchen;
}

export const updateKitchenNameAction = updateKitchenName;

/**
 * Server Action for an admin to update kitchen settings including name and space type.
 */
export async function updateKitchenSettingsAction(
  params: UpdateKitchenSettingsInput
): Promise<Kitchen> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("You must be logged in to update kitchen settings.");
  }

  const validated = updateKitchenSettingsSchema.parse({
    kitchenId: params.kitchenId,
    name: params.name,
    space_type: params.spaceType,
  });

  const updatedKitchen = await updateKitchenSettingsDb(
    validated.kitchenId,
    validated.name,
    validated.space_type,
    session.user.id
  );

  revalidatePath(`/kitchen/${params.kitchenId}`);
  revalidatePath(`/kitchen/${params.kitchenId}/admin`);
  revalidatePath(`/kitchen/${params.kitchenId}/member`);
  revalidatePath(`/kitchen/${params.kitchenId}/admin/purchases`);
  revalidatePath(`/kitchen/view/${updatedKitchen.public_view_token}`);
  revalidatePath("/");

  return updatedKitchen;
}

export const updateKitchenSettings = updateKitchenSettingsAction;

/**
 * Server Action for an admin to regenerate the disposable public supermarket guest token.
 * Instantly revokes previously shared guest links.
 */
export async function regeneratePublicViewTokenAction(
  params: { kitchenId: string } | string
): Promise<{ success: boolean; newToken: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("You must be logged in to regenerate the guest link.");
  }

  const kitchenId = typeof params === "object" ? params.kitchenId : params;
  const newToken = await regeneratePublicViewTokenDb(kitchenId, session.user.id);

  revalidatePath(`/kitchen/${kitchenId}`);
  revalidatePath(`/kitchen/${kitchenId}/admin`);
  revalidatePath(`/kitchen/${kitchenId}/member`);
  revalidatePath(`/kitchen/view/${newToken}`);

  return { success: true, newToken };
}

export const regeneratePublicViewToken = regeneratePublicViewTokenAction;

/**
 * Server Action for a regular member to leave a kitchen.
 */
export async function leaveKitchenAction(kitchenId: string): Promise<{ success: boolean }> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("You must be logged in to leave a kitchen.");
  }

  await leaveKitchenDb(kitchenId, session.user.id);
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath(`/kitchen/${kitchenId}`);
  return { success: true };
}

export const leaveKitchen = leaveKitchenAction;


