"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { getUserMembership } from "@/lib/kitchen";
import { notifyKitchen, pushMessages } from "@/lib/push";
import { capitalize } from "@/lib/utils";
import { pool } from "@/lib/db";
import { put, del } from "@vercel/blob";
import crypto from "node:crypto";
import {
  extractReceiptData,
  GEMINI_CASCADE_MODELS,
  GEMINI_MODEL_ID,
  GEMINI_REQUEST_TIMEOUT_MS,
} from "@/lib/receipt-extractor";
import { resolveShoppingItemId, UUID_REGEX } from "@/lib/pantry";
import type { ReceiptLine, ScanReceiptResult as GlobalScanReceiptResult } from "@/types";

export type ScannedReceiptLine = ReceiptLine;

export interface ScanResult {
  receiptUrl: string | null;
  storeName: string;
  currency: string;
  totalReceiptAmount: number;
  lines: ScannedReceiptLine[];
}

export type ScanReceiptResult =
  | { ok: true; data: ScanResult }
  | { ok: false; error: string };

interface StagedCartItem {
  id?: unknown;
  name?: unknown;
}

export async function scanReceiptAction(formData: FormData): Promise<ScanReceiptResult> {
  const file = formData.get("file") as File;
  const kitchenId = formData.get("kitchenId") as string;
  const stagedCartItemsStr = formData.get("stagedCartItems") as string;

  if (!file || !kitchenId) {
    return { ok: false, error: "Missing required fields" };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "You must be logged in." };
  }

  const membership = await getUserMembership(kitchenId, session.user.id);
  if (!membership) {
    return { ok: false, error: "You are not a member of this kitchen." };
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (!geminiApiKey) {
    return {
      ok: false,
      error: "Receipt OCR is not configured. Please set GEMINI_API_KEY.",
    };
  }

  let uploadedUrl: string | null = null;
  try {
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `receipts/${crypto.randomUUID()}-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || 'image/jpeg';

    const stagedItems: StagedCartItem[] = JSON.parse(stagedCartItemsStr || "[]");

    // Parallel Task 1: Vercel Blob upload (runs concurrently with OCR to cut wall-clock time)
    const blobPromise: Promise<string | null> =
      process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_OIDC_TOKEN
        ? put(filename, buffer, {
            access: 'public',
            contentType: mimeType,
          })
            .then((blob) => blob.url)
            .catch((blobErr) => {
              console.warn("[scanReceiptAction] Blob upload skipped/failed:", blobErr);
              return null;
            })
        : Promise.resolve(null);

    // Parallel Task 2: Pure Google AI Studio multi-model fallback cascade
    const ocrPromise = extractReceiptData(buffer, mimeType, {
      stagedItems,
      geminiApiKey,
    });

    // Concurrently await Blob upload and OCR
    const [blobUrl, ocrResult] = await Promise.all([blobPromise, ocrPromise]);
    uploadedUrl = blobUrl;

    console.log(`[scanReceiptAction] OCR succeeded with ${ocrResult.usedProvider}`);

    return {
      ok: true,
      data: {
        receiptUrl: uploadedUrl,
        storeName: ocrResult.storeName,
        currency: ocrResult.currency,
        totalReceiptAmount: ocrResult.totalReceiptAmount,
        lines: ocrResult.lines,
      },
    };

  } catch (error: any) {
    if (uploadedUrl) {
      try {
        await del(uploadedUrl);
      } catch {
        // ignore cleanup error
      }
    }

    const status: number | undefined =
      typeof error?.status === "number" ? error.status : undefined;
    const rawMessage: string =
      typeof error?.message === "string" ? error.message : String(error);
    const errorName: string = typeof error?.name === "string" ? error.name : "";

    const errorCategory: string | undefined =
      typeof error?.errorCategory === "string" ? error.errorCategory : undefined;

    console.error("[scanReceiptAction] Raw OCR error:", {
      name: errorName || undefined,
      status,
      statusText: error?.statusText,
      code: error?.code,
      finishReason: error?.finishReason,
      errorCategory,
      message: rawMessage,
      errorDetails: error?.errorDetails,
      rawSnippet: error?.rawSnippet,
    });

    let userMessage = "Failed to scan receipt. Please try again with a clear photo.";

    if (
      errorCategory === "overload" ||
      errorCategory === "rate_limit" ||
      errorCategory === "timeout" ||
      errorCategory === "parse_error" ||
      errorCategory === "unavailable"
    ) {
      userMessage = rawMessage;
    } else if (rawMessage.includes("Could not parse the receipt data")) {
      userMessage = rawMessage;
    } else if (rawMessage.includes("GEMINI_API_KEY")) {
      userMessage = rawMessage;
    } else if (
      rawMessage.includes("You must be logged in") ||
      rawMessage.includes("not a member") ||
      rawMessage.includes("Missing required fields")
    ) {
      userMessage = rawMessage;
    } else if (
      errorName === "TimeoutError" ||
      errorName === "GoogleGenerativeAIAbortError" ||
      errorName === "AbortError" ||
      /aborted|timed? ?out/i.test(rawMessage)
    ) {
      userMessage = `The AI request timed out after ${GEMINI_REQUEST_TIMEOUT_MS / 1000}s. Please retry.`;
    } else if (
      status === 429 ||
      rawMessage.includes("RESOURCE_EXHAUSTED") ||
      /quota/i.test(rawMessage)
    ) {
      userMessage = "AI rate limit reached. Please wait a moment and try again.";
    } else if (
      status === 503 ||
      status === 502 ||
      status === 504 ||
      rawMessage.includes("UNAVAILABLE") ||
      /overload|high demand/i.test(rawMessage)
    ) {
      userMessage = "The AI model is temporarily overloaded. Please retry in a moment.";
    } else if (
      status === 401 ||
      status === 403 ||
      rawMessage.includes("API_KEY_INVALID") ||
      /API key|unauthorized/i.test(rawMessage)
    ) {
      userMessage = "AI service authentication error. Please verify your GEMINI_API_KEY.";
    } else if (
      status === 400 ||
      status === 404 ||
      /invalid model|not found|no longer available/i.test(rawMessage)
    ) {
      userMessage = "The AI model endpoint is unavailable. Please check configuration.";
    } else if (/JSON|Unexpected token|non-object receipt payload|MAX_TOKENS/i.test(rawMessage)) {
      userMessage =
        "Could not parse the receipt data returned by AI. Please try again with a clearer picture.";
    }

    return { ok: false, error: userMessage };
  }
}

export type CheckoutActionResult =
  | {
      ok: true;
      success: true;
      checkoutId: string;
      totalClaimedAmount: number;
      currency: string;
    }
  | {
      ok: false;
      success: false;
      error: string;
    };

async function resolveItemIds(
  kitchenId: string,
  entries: Array<{ id: string; name?: string | null }>
): Promise<string[]> {
  const resolved: string[] = [];
  for (const entry of entries) {
    if (!entry?.id) continue;
    if (UUID_REGEX.test(entry.id)) {
      resolved.push(entry.id);
    } else {
      const realId = await resolveShoppingItemId(kitchenId, entry.id, entry.name);
      resolved.push(realId);
    }
  }
  return Array.from(new Set(resolved));
}

export async function submitReceiptCheckoutAction(
  formData: FormData
): Promise<CheckoutActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, success: false, error: "You must be logged in." };
    }

    const kitchenId = formData.get("kitchenId") as string;
    if (!kitchenId || !UUID_REGEX.test(kitchenId)) {
      return { ok: false, success: false, error: "Invalid kitchen." };
    }

    const storeName = (formData.get("storeName") as string)?.trim() || null;
    const note = (formData.get("note") as string)?.trim() || null;
    const rawCurrency = (formData.get("currency") as string)?.trim().toUpperCase() || "EUR";
    const currency = rawCurrency.length === 3 ? rawCurrency : "EUR";
    const totalClaimedAmountStr = formData.get("totalClaimedAmount") as string;
    const totalReceiptAmountStr = formData.get("totalReceiptAmount") as string;
    const rawReceiptPathsStr = formData.get("receiptPaths") as string;
    const matchedItemsStr = formData.get("matchedItems") as string;
    const returnedItemsStr = formData.get("returnedItemIds") as string | null;

    const totalClaimedAmount = Number(totalClaimedAmountStr) || 0;
    const totalReceiptAmount = totalReceiptAmountStr ? Number(totalReceiptAmountStr) : null;

    const membership = await getUserMembership(kitchenId, session.user.id);
    if (!membership) {
      return { ok: false, success: false, error: "You are not a member of this kitchen." };
    }

    const userId = session.user.id;

    const rawReceiptPaths: string[] = JSON.parse(rawReceiptPathsStr || "[]");
    const receiptPaths = rawReceiptPaths.filter(isBlobReceiptUrl);

    const rawItems: Array<{
      shopping_list_item_id: string;
      name?: string | null;
      price?: number | null;
      pantry_item_id?: string | null;
    }> = JSON.parse(matchedItemsStr || "[]");

    const items: Array<{
      shopping_list_item_id: string;
      price?: number | null;
      pantry_item_id?: string | null;
    }> = [];

    for (const item of rawItems) {
      if (!item?.shopping_list_item_id) continue;
      const resolvedId = UUID_REGEX.test(item.shopping_list_item_id)
        ? item.shopping_list_item_id
        : await resolveShoppingItemId(kitchenId, item.shopping_list_item_id, item.name);
      items.push({
        shopping_list_item_id: resolvedId,
        price: item.price,
        pantry_item_id: item.pantry_item_id,
      });
    }

    const itemIds = Array.from(new Set(items.map((i) => i.shopping_list_item_id).filter(Boolean)));

    const rawReturned: Array<string | { id: string; name?: string | null }> = JSON.parse(
      returnedItemsStr || "[]"
    );
    const returnedIds = await resolveItemIds(
      kitchenId,
      rawReturned.map((entry) =>
        typeof entry === "string" ? { id: entry } : { id: entry.id, name: entry.name }
      )
    );

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      if (itemIds.length > 0) {
        const { rows: validItems } = await client.query<{ id: string; pantry_item_id: string | null }>(
          `SELECT id, pantry_item_id 
           FROM shopping_list_items
           WHERE id = ANY($1::uuid[]) 
             AND kitchen_id = $2 
             AND purchased_by = $3
             AND (is_in_cart = TRUE OR is_purchased = TRUE)
             AND is_guest_staged = FALSE
             AND checkout_id IS NULL`,
          [itemIds, kitchenId, userId]
        );

        if (validItems.length !== itemIds.length) {
          throw new Error(
            "One or more items do not belong to your active cart or have already been checked out."
          );
        }
      }

      const { rows: checkoutRows } = await client.query<{ id: string }>(
        `INSERT INTO checkouts (kitchen_id, user_id, store_name, note, total_claimed_amount, total_receipt_amount, receipt_filename, is_refunded, currency, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NULL, FALSE, $7, NOW())
         RETURNING id`,
        [kitchenId, userId, storeName, note, totalClaimedAmount, totalReceiptAmount, currency]
      );
      const checkoutId = checkoutRows[0].id;

      for (const filename of receiptPaths) {
        await client.query(
          `INSERT INTO checkout_receipts (checkout_id, receipt_filename) VALUES ($1, $2)`,
          [checkoutId, filename]
        );
      }

      for (const item of items) {
        const updateResult = await client.query(
          `UPDATE shopping_list_items
           SET is_purchased = TRUE,
               is_in_cart = FALSE,
               checkout_id = $1, 
               item_price = $2, 
               currency = $3,
               is_guest_staged = FALSE
           WHERE id = $4 
             AND kitchen_id = $5
             AND purchased_by = $6
             AND checkout_id IS NULL`,
          [checkoutId, item.price ?? null, currency, item.shopping_list_item_id, kitchenId, userId]
        );

        if (updateResult.rowCount === 0) {
          throw new Error(
            `Item ${item.shopping_list_item_id} could not be updated or was already processed.`
          );
        }

        if (item.pantry_item_id && UUID_REGEX.test(item.pantry_item_id)) {
          await client.query(
            `UPDATE pantry_items SET is_out_of_stock = FALSE, updated_at = NOW()
             WHERE id = $1 AND kitchen_id = $2`,
            [item.pantry_item_id, kitchenId]
          );
        }
      }

      if (returnedIds.length > 0) {
        const { rows: returnedRows } = await client.query<{ pantry_item_id: string | null }>(
          `UPDATE shopping_list_items
           SET is_in_cart = FALSE, is_purchased = FALSE, purchased_by = NULL, is_guest_staged = FALSE
           WHERE id = ANY($1::uuid[])
             AND kitchen_id = $2
             AND purchased_by = $3
             AND checkout_id IS NULL
           RETURNING pantry_item_id`,
          [returnedIds, kitchenId, userId]
        );

        const returnedPantryIds = returnedRows
          .map((r) => r.pantry_item_id)
          .filter((id): id is string => id !== null && UUID_REGEX.test(id));

        if (returnedPantryIds.length > 0) {
          await client.query(
            `UPDATE pantry_items SET is_out_of_stock = TRUE, updated_at = NOW()
             WHERE id = ANY($1::uuid[]) AND kitchen_id = $2`,
            [returnedPantryIds, kitchenId]
          );
        }
      }

      await client.query("COMMIT");

      revalidatePath(`/kitchen/${kitchenId}`);
      revalidatePath(`/kitchen/${kitchenId}/member`);
      revalidatePath(`/kitchen/${kitchenId}/admin`);

      notifyKitchen(
        kitchenId,
        "checkout",
        {
          render: pushMessages.refundPending(
            capitalize(membership.kitchen_display_name),
            totalClaimedAmount,
            currency,
            storeName
          ),
          url: `/kitchen/${kitchenId}/admin`,
        },
        { adminsOnly: true, excludeUserId: userId }
      ).catch((err) => console.error("Push notification failed:", err));

      return { ok: true, success: true, checkoutId, totalClaimedAmount, currency };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("[submitReceiptCheckoutAction] Failed:", error);
    return {
      ok: false,
      success: false,
      error: error?.message || "Failed to submit refund request.",
    };
  }
}

/**
 * Direct checkout without receipt upload.
 * Persists optional store name, total claimed amount, and note for the admin.
 */
export async function receiptlessCheckoutAction(
  formData: FormData
): Promise<CheckoutActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, success: false, error: "You must be logged in." };
    }

    const kitchenId = formData.get("kitchenId") as string;
    if (!kitchenId || !UUID_REGEX.test(kitchenId)) {
      return { ok: false, success: false, error: "Invalid kitchen." };
    }

    const storeName = (formData.get("storeName") as string)?.trim() || null;
    const note = (formData.get("note") as string)?.trim() || null;
    const rawCurrency = (formData.get("currency") as string)?.trim().toUpperCase() || "EUR";
    const currency = rawCurrency.length === 3 ? rawCurrency : "EUR";
    const totalAmountStr = formData.get("totalAmount") as string;
    const itemIdsStr = formData.get("itemIds") as string;
    const returnedItemsStr = formData.get("returnedItemIds") as string | null;

    const totalAmount = parseFloat(totalAmountStr) || 0;
    const rawItemEntries: Array<string | { id: string; name?: string | null }> = JSON.parse(
      itemIdsStr || "[]"
    );
    const itemIds = await resolveItemIds(
      kitchenId,
      rawItemEntries.map((entry) =>
        typeof entry === "string" ? { id: entry } : { id: entry.id, name: entry.name }
      )
    );

    const rawReturned: Array<string | { id: string; name?: string | null }> = JSON.parse(
      returnedItemsStr || "[]"
    );
    const returnedIds = await resolveItemIds(
      kitchenId,
      rawReturned.map((entry) =>
        typeof entry === "string" ? { id: entry } : { id: entry.id, name: entry.name }
      )
    );

    const membership = await getUserMembership(kitchenId, session.user.id);
    if (!membership) {
      return { ok: false, success: false, error: "You are not a member of this kitchen." };
    }

    const userId = session.user.id;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Fetch user's cart items strictly enforcing kitchen_id and user ownership.
      // Basket-staged items have is_in_cart = TRUE (and is_purchased = FALSE until checkout).
      let cartRows: { id: string; pantry_item_id: string | null }[] = [];
      if (itemIds.length > 0) {
        const res = await client.query<{ id: string; pantry_item_id: string | null }>(
          `SELECT id, pantry_item_id FROM shopping_list_items
           WHERE kitchen_id = $1
             AND purchased_by = $2
             AND (is_in_cart = TRUE OR is_purchased = TRUE)
             AND is_guest_staged = FALSE
             AND checkout_id IS NULL
             AND id = ANY($3::uuid[])`,
          [kitchenId, userId, itemIds]
        );

        if (res.rows.length !== itemIds.length) {
          throw new Error(
            "One or more items do not belong to your cart in this kitchen or have already been checked out."
          );
        }

        cartRows = res.rows;
      } else {
        const res = await client.query<{ id: string; pantry_item_id: string | null }>(
          `SELECT id, pantry_item_id FROM shopping_list_items
           WHERE kitchen_id = $1
             AND purchased_by = $2
             AND (is_in_cart = TRUE OR is_purchased = TRUE)
             AND is_guest_staged = FALSE
             AND checkout_id IS NULL`,
          [kitchenId, userId]
        );
        cartRows = res.rows;
      }

      if (cartRows.length === 0) {
        throw new Error("Your cart is empty.");
      }

      // Insert checkout row with NULL receipt_filename
      const { rows: checkoutRows } = await client.query<{ id: string }>(
        `INSERT INTO checkouts (kitchen_id, user_id, store_name, note, total_claimed_amount, total_receipt_amount, receipt_filename, is_refunded, currency, created_at)
         VALUES ($1, $2, $3, $4, $5, NULL, NULL, FALSE, $6, NOW())
         RETURNING id`,
        [kitchenId, userId, storeName, note, totalAmount, currency]
      );
      const checkoutId = checkoutRows[0].id;

      const checkoutItemIds = cartRows.map((i) => i.id);
      await client.query(
        `UPDATE shopping_list_items
         SET is_purchased = TRUE, is_in_cart = FALSE, checkout_id = $1, currency = $2, is_guest_staged = FALSE
         WHERE id = ANY($3::uuid[]) AND kitchen_id = $4 AND purchased_by = $5 AND checkout_id IS NULL`,
        [checkoutId, currency, checkoutItemIds, kitchenId, userId]
      );

      // Restock any linked pantry items
      const pantryIds = cartRows
        .map((i) => i.pantry_item_id)
        .filter((id): id is string => id !== null && UUID_REGEX.test(id));

      if (pantryIds.length > 0) {
        await client.query(
          `UPDATE pantry_items SET is_out_of_stock = FALSE, updated_at = NOW()
           WHERE id = ANY($1::uuid[]) AND kitchen_id = $2`,
          [pantryIds, kitchenId]
        );
      }

      // Atomically return any items marked "return to list" back to the shopping queue
      if (returnedIds.length > 0) {
        const { rows: returnedRows } = await client.query<{ pantry_item_id: string | null }>(
          `UPDATE shopping_list_items
           SET is_in_cart = FALSE, is_purchased = FALSE, purchased_by = NULL, is_guest_staged = FALSE
           WHERE id = ANY($1::uuid[])
             AND kitchen_id = $2
             AND purchased_by = $3
             AND checkout_id IS NULL
           RETURNING pantry_item_id`,
          [returnedIds, kitchenId, userId]
        );

        const returnedPantryIds = returnedRows
          .map((r) => r.pantry_item_id)
          .filter((id): id is string => id !== null && UUID_REGEX.test(id));

        if (returnedPantryIds.length > 0) {
          await client.query(
            `UPDATE pantry_items SET is_out_of_stock = TRUE, updated_at = NOW()
             WHERE id = ANY($1::uuid[]) AND kitchen_id = $2`,
            [returnedPantryIds, kitchenId]
          );
        }
      }

      await client.query("COMMIT");

      revalidatePath(`/kitchen/${kitchenId}`);
      revalidatePath(`/kitchen/${kitchenId}/member`);
      revalidatePath(`/kitchen/${kitchenId}/admin`);

      notifyKitchen(
        kitchenId,
        "checkout",
        {
          render: pushMessages.refundPending(
            capitalize(membership.kitchen_display_name),
            totalAmount,
            currency,
            storeName
          ),
          url: `/kitchen/${kitchenId}/admin`,
        },
        { adminsOnly: true, excludeUserId: userId }
      ).catch((err) => console.error("Push notification failed:", err));

      return { ok: true, success: true, checkoutId, totalClaimedAmount: totalAmount, currency };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("[receiptlessCheckoutAction] Failed:", error);
    return {
      ok: false,
      success: false,
      error: error?.message || "Failed to complete checkout.",
    };
  }
}

/**
 * True only for https URLs whose real hostname is a Vercel Blob host.
 * A substring check is not enough: "https://evil.example/.blob.vercel-storage.com/x" would pass it.
 */
function isBlobReceiptUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

/**
 * Deletes a receipt from Vercel Blob storage.
 * Only allows deleting URLs that actually belong to your Blob store.
 */
export async function deleteReceiptFileAction(rawUrl: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    if (!isBlobReceiptUrl(rawUrl)) {
      return { success: false, error: "Invalid receipt URL" };
    }

    await del(rawUrl);
    return { success: true };
  } catch (error) {
    console.error("Blob delete error:", error);
    return { success: false };
  }
}
