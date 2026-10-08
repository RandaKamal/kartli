"use server";

import { auth, signOut } from "@/auth";
import { pool } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";
import { hashPasswordAsync, verifyPasswordAsync } from "@/lib/password";
import { PENDING_INVITE_COOKIE_NAME } from "@/lib/invite";

export async function updatePreferredCurrencyAction(currency: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("You must be logged in.");
  }

  const cleanCurrency = currency?.trim().toUpperCase() || "EUR";
  const isValid = SUPPORTED_CURRENCIES.some((c) => c.code === cleanCurrency);
  const finalCurrency = isValid ? cleanCurrency : "EUR";

  await pool.query(
    `UPDATE users SET preferred_currency = $1, updated_at = NOW() WHERE id = $2`,
    [finalCurrency, session.user.id]
  );

  revalidatePath("/profile");
  revalidatePath("/");
  return { success: true, preferredCurrency: finalCurrency };
}

/**
 * Persists that the current user has finished or skipped the kitchen tour,
 * so it never auto-opens again on any device or session.
 */
export async function markTourCompletedAction() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("You must be logged in.");
  }

  await pool.query(
    `UPDATE users SET has_completed_tour = true, updated_at = NOW() WHERE id = $1 AND has_completed_tour = false`,
    [session.user.id]
  );

  return { success: true };
}

/**
 * Persists the current user's preferred UI language.
 */
export async function setUserLanguageAction(language: "de" | "en") {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("You must be logged in.");
  }
  if (language !== "de" && language !== "en") {
    throw new Error("Unsupported language.");
  }

  await pool.query(
    `UPDATE users SET language = $1, updated_at = NOW() WHERE id = $2`,
    [language, session.user.id]
  );

  return { success: true, language };
}

export async function getUserLanguage(userId: string): Promise<"de" | "en" | null> {
  try {
    const { rows } = await pool.query<{ language: string }>(
      `SELECT language FROM users WHERE id = $1`,
      [userId]
    );
    const lang = rows[0]?.language;
    return lang === "de" || lang === "en" ? lang : null;
  } catch {
    return null;
  }
}

/**
 * Server Action to change the authenticated user's password.
 */
export async function changePasswordAction(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be logged in." };
  }

  if (!currentPassword || !newPassword) {
    return { success: false, error: "All fields are required." };
  }

  if (newPassword.length < 6) {
    return {
      success: false,
      error: "Password must be at least 6 characters.",
    };
  }

  // Fetch current user credentials and language preference
  const { rows } = await pool.query<{ password_hash: string; language?: string }>(
    `SELECT password_hash, language FROM users WHERE id = $1`,
    [session.user.id]
  );

  if (rows.length === 0) {
    return { success: false, error: "User not found." };
  }

  const user = rows[0];
  const isGerman = user.language !== "en";

  // Verify current password against stored bcrypt hash
  const isValid = await verifyPasswordAsync(currentPassword, user.password_hash);
  if (!isValid) {
    const errorMsg = isGerman
      ? "Aktuelles Passwort ist falsch"
      : "Current password is incorrect";
    return { success: false, error: errorMsg };
  }

  // Hash new password and update record
  const newHash = await hashPasswordAsync(newPassword);
  await pool.query(
    `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
    [newHash, session.user.id]
  );

  revalidatePath("/profile");
  return { success: true };
}

/**
 * Server Action for privacy-compliant GDPR account deletion.
 * Anonymizes past kitchen purchases, checks for sole admin ownership,
 * clears user credentials, and invalidates auth session cookies.
 */
export async function deleteAccountAction(
  confirmationPassword: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be logged in." };
  }

  if (!confirmationPassword) {
    return { success: false, error: "Password is required." };
  }

  const userId = session.user.id;

  // 1. Fetch user credentials & language
  const { rows: userRows } = await pool.query<{ password_hash: string; language?: string }>(
    `SELECT password_hash, language FROM users WHERE id = $1`,
    [userId]
  );

  if (userRows.length === 0) {
    return { success: false, error: "User not found." };
  }

  const user = userRows[0];
  const isGerman = user.language !== "en";

  // 2. Verify confirmation password matches stored password hash
  const isValid = await verifyPasswordAsync(confirmationPassword, user.password_hash);
  if (!isValid) {
    const errorMsg = isGerman
      ? "Aktuelles Passwort ist falsch"
      : "Current password is incorrect";
    return { success: false, error: errorMsg };
  }

  // 3. Protection Rule: Check if user is the sole 'ADMIN' in any kitchen with > 1 member
  const { rows: adminKitchens } = await pool.query<{
    kitchen_id: string;
    total_members: string;
    admin_count: string;
  }>(
    `SELECT 
       km.kitchen_id,
       (SELECT COUNT(*) FROM kitchen_members km_all WHERE km_all.kitchen_id = km.kitchen_id) AS total_members,
       (SELECT COUNT(*) FROM kitchen_members km_admins WHERE km_admins.kitchen_id = km.kitchen_id AND km_admins.role = 'ADMIN') AS admin_count
     FROM kitchen_members km
     WHERE km.user_id = $1 AND km.role = 'ADMIN'`,
    [userId]
  );

  for (const k of adminKitchens) {
    const totalMembers = parseInt(k.total_members, 10);
    const adminCount = parseInt(k.admin_count, 10);
    if (totalMembers > 1 && adminCount <= 1) {
      const errorMsg = isGerman
        ? "Bitte ernenne zuerst ein anderes Mitglied zum Admin in deinen Küchen."
        : "Please promote another roommate to Admin before deleting your account.";
      return { success: false, error: errorMsg };
    }
  }

  // 4. Deletion / Anonymization Logic executed in database transaction
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Fetch user's kitchen membership records
    const { rows: memberRows } = await client.query<{ id: string; kitchen_display_name: string }>(
      `SELECT id, kitchen_display_name FROM kitchen_members WHERE user_id = $1`,
      [userId]
    );

    const suffix = isGerman ? " (ehemals)" : " (deleted)";
    for (const m of memberRows) {
      const currentName = m.kitchen_display_name || "Mitglied";
      const updatedName = (currentName.includes("(ehemals)") || currentName.includes("(deleted)"))
        ? currentName
        : `${currentName}${suffix}`.slice(0, 255);

      await client.query(
        `UPDATE kitchen_members 
         SET user_id = NULL, 
             kitchen_display_name = $1, 
             role = 'MEMBER', 
             updated_at = NOW() 
         WHERE id = $2`,
        [updatedName, m.id]
      );
    }

    // Preserve flatmate ledger: keep past checkouts intact by nulling user_id
    await client.query(`UPDATE checkouts SET user_id = NULL WHERE user_id = $1`, [userId]);

    // Nullify creator/proposer relations to avoid foreign key violations
    await client.query(`UPDATE kitchens SET creator_id = NULL WHERE creator_id = $1`, [userId]);
    await client.query(`UPDATE pantry_items SET proposed_by = NULL WHERE proposed_by = $1`, [userId]);

    // Delete user push subscriptions
    await client.query(`DELETE FROM push_subscriptions WHERE user_id = $1`, [userId]);

    // Delete the user record (cascades sessions/auth records)
    await client.query(`DELETE FROM users WHERE id = $1`, [userId]);

    await client.query("COMMIT");
  } catch (dbErr) {
    await client.query("ROLLBACK");
    console.error("Account deletion transaction failed:", dbErr);
    throw dbErr;
  } finally {
    client.release();
  }

  // 5. Clear auth session cookies and redirect
  const cookieStore = await cookies();
  cookieStore.delete(PENDING_INVITE_COOKIE_NAME);
  const allCookies = cookieStore.getAll();
  for (const c of allCookies) {
    if (c.name.includes("auth") || c.name.includes("session")) {
      cookieStore.delete(c.name);
    }
  }

  try {
    await signOut({ redirectTo: "/login" });
  } catch (err: any) {
    const isRedirect =
      err?.message === "NEXT_REDIRECT" ||
      err?.digest?.startsWith("NEXT_REDIRECT");
    if (isRedirect) throw err;
  }

  return { success: true };
}
