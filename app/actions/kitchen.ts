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
  deleteKitchen as deleteKitchenDb,
} from "@/lib/kitchen";
import { pool } from "@/lib/db";
import type {
  CreateKitchenInput,
  CreateKitchenResult,
  Kitchen,
  KitchenMember,
  KitchenMemberWithUser,
  KitchenRole,
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
  const session = await auth();
  if (!session?.user?.id) throw new Error("You must be logged in.");
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
 * Server Action for an admin to promote or demote a kitchen member.
 */
export async function promoteMemberAction(
  kitchenId: string,
  targetMemberOrUserId: string,
  newRole: string
): Promise<{ success: boolean; newRole: KitchenRole; member?: KitchenMember; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, newRole: "MEMBER", error: "You must be logged in to manage roles." };
    }

    if (!kitchenId || !targetMemberOrUserId) {
      return { success: false, newRole: "MEMBER", error: "Missing required parameters." };
    }

    // 1. Authorization check: Caller must be an active ADMIN
    const isAdmin = await isUserKitchenAdmin(kitchenId, session.user.id);
    if (!isAdmin) {
      return { success: false, newRole: "MEMBER", error: "Unauthorized: Only kitchen admins can manage roles." };
    }

    // 2. Input sanitization: Strictly map input roles to uppercase enum values ('ADMIN' | 'MEMBER')
    const normalized = (newRole || "").trim().toUpperCase();
    if (normalized !== "ADMIN" && normalized !== "MEMBER") {
      return {
        success: false,
        newRole: "MEMBER",
        error: "Invalid role value. Allowed roles are 'ADMIN' or 'MEMBER'.",
      };
    }
    const roleUpper: KitchenRole = normalized as KitchenRole;

    // 3. Demotion safeguard: Ensure kitchen does not become admin-less
    if (roleUpper === "MEMBER") {
      const { rows: memberRows } = await pool.query<{ role: KitchenRole }>(
        `SELECT role FROM kitchen_members WHERE kitchen_id = $1 AND (user_id = $2 OR id = $2)`,
        [kitchenId, targetMemberOrUserId]
      );
      if (memberRows.length > 0 && memberRows[0].role === "ADMIN") {
        const { rows } = await pool.query<{ count: string }>(
          `SELECT count(*) FROM kitchen_members WHERE kitchen_id = $1 AND role = 'ADMIN'`,
          [kitchenId]
        );
        const adminCount = parseInt(rows[0]?.count || "0", 10);
        if (adminCount <= 1) {
          return {
            success: false,
            newRole: "ADMIN",
            error: "Promote another member to Admin before demoting the last Admin.",
          };
        }
      }
    }

    // 4. Execution query: UPDATE role = $1 and updated_at = NOW()
    const updateSql = `
      UPDATE kitchen_members
      SET role = $1, updated_at = NOW()
      WHERE kitchen_id = $2 AND (user_id = $3 OR id = $3)
      RETURNING id, kitchen_id, user_id, kitchen_display_name, role, invite_token, joined_at, created_at, updated_at
    `;
    const { rows: updatedRows } = await pool.query<KitchenMember>(updateSql, [
      roleUpper,
      kitchenId,
      targetMemberOrUserId,
    ]);

    if (updatedRows.length === 0) {
      return { success: false, newRole: roleUpper, error: "Member not found in this kitchen." };
    }

    const updatedMember = updatedRows[0];

    revalidatePath(`/kitchen/${kitchenId}`);
    revalidatePath(`/kitchen/${kitchenId}/admin`);
    revalidatePath(`/kitchen/${kitchenId}/settings`);

    return {
      success: true,
      newRole: updatedMember.role,
      member: updatedMember,
    };
  } catch (err: any) {
    console.error("Error updating member role:", err);
    return {
      success: false,
      newRole: "MEMBER",
      error: err?.message || "Failed to update member role.",
    };
  }
}

export const updateMemberRoleAction = promoteMemberAction;

/**
 * Server Action for an admin to update kitchen settings including name, space type, and staple permission.
 */
export async function updateKitchenSettingsAction(
  params: UpdateKitchenSettingsInput
): Promise<Kitchen> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("You must be logged in to update kitchen settings.");
  }

  const spaceType = params.spaceType || params.space_type || "FLATSHARE";
  const staplePermission = params.staplePermission || params.staple_permission || "open";

  const validated = updateKitchenSettingsSchema.parse({
    kitchenId: params.kitchenId,
    name: params.name,
    space_type: spaceType,
    staple_permission: staplePermission,
  });

  const updatedKitchen = await updateKitchenSettingsDb(
    validated.kitchenId,
    validated.name,
    validated.space_type,
    session.user.id,
    validated.staple_permission
  );

  revalidatePath(`/kitchen/${params.kitchenId}`);
  revalidatePath(`/kitchen/${params.kitchenId}/admin`);
  revalidatePath(`/kitchen/${params.kitchenId}/member`);
  revalidatePath(`/kitchen/${params.kitchenId}/settings`);
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
 * Server Action for a member to leave a kitchen.
 */
export async function leaveKitchenAction(
  kitchenId: string,
  userId?: string
): Promise<{ success: boolean }> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("You must be logged in to leave a kitchen.");
  }

  const targetUserId = userId || session.user.id;
  if (targetUserId !== session.user.id) {
    const isAdmin = await isUserKitchenAdmin(kitchenId, session.user.id);
    if (!isAdmin) {
      throw new Error("Unauthorized: Only admins can remove other members.");
    }
  }

  await leaveKitchenDb(kitchenId, targetUserId);
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath(`/kitchen/${kitchenId}`);
  return { success: true };
}

export const leaveKitchen = leaveKitchenAction;

/**
 * Server Action for an admin to permanently delete a kitchen.
 */
export async function deleteKitchenAction(kitchenId: string): Promise<{ success: boolean }> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("You must be logged in to delete a kitchen.");
  }

  await deleteKitchenDb(kitchenId, session.user.id);
  revalidatePath("/");
  revalidatePath("/dashboard");
  return { success: true };
}

export const deleteKitchen = deleteKitchenAction;


