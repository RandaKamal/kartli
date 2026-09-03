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
