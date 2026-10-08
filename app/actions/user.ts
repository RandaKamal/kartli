"use server";

import { auth } from "@/auth";
import { pool } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";

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
