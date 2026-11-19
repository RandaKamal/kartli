"use server";

import { auth } from "@/auth";
import { deleteUserPasskey, listUserPasskeys } from "@/lib/passkeys";
import { revalidatePath } from "next/cache";
import type { UserPasskey } from "@/types";

export async function listPasskeysAction(): Promise<{
  success: boolean;
  passkeys: UserPasskey[];
  error?: string;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, passkeys: [], error: "You must be logged in." };
  }

  const passkeys = await listUserPasskeys(session.user.id);
  return { success: true, passkeys };
}

export async function deletePasskeyAction(passkeyId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be logged in." };
  }

  if (!passkeyId) {
    return { success: false, error: "Passkey ID is required." };
  }

  const deleted = await deleteUserPasskey(passkeyId, session.user.id);
  if (!deleted) {
    return { success: false, error: "Passkey not found." };
  }

  revalidatePath("/profile");
  return { success: true };
}
