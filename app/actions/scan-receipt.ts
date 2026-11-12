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
  GEMINI_MODEL_ID,
  GEMINI_REQUEST_TIMEOUT_MS,
  REQUESTY_MODEL_ID,
  ALL_PROVIDERS_FAILED_MESSAGE,
} from "@/lib/receipt-extractor";
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
  const requestyApiKey = process.env.REQUESTY_API_KEY;

  if (!geminiApiKey && !requestyApiKey) {
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

    // Parallel Task 2: Primary Gemini 3.5 Flash Lite + Optional Requesty fallback
    const ocrPromise = extractReceiptData(buffer, mimeType, {
      stagedItems,
      geminiApiKey,
      requestyApiKey,
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

    console.error("[scanReceiptAction] Raw OCR error:", {
      name: errorName || undefined,
      status,
      statusText: error?.statusText,
      code: error?.code,
      finishReason: error?.finishReason,
      message: rawMessage,
      errorDetails: error?.errorDetails,
      rawSnippet: error?.rawSnippet,
    });

    let userMessage = "Failed to scan receipt. Please try again with a clear photo.";

    if (rawMessage === ALL_PROVIDERS_FAILED_MESSAGE) {
      userMessage = ALL_PROVIDERS_FAILED_MESSAGE;
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
      /overload/i.test(rawMessage)
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

export async function submitReceiptCheckoutAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("You must be logged in.");

  const kitchenId = formData.get("kitchenId") as string;
  const storeName = (formData.get("storeName") as string)?.trim() || null;
  const note = (formData.get("note") as string)?.trim() || null;
  const rawCurrency = (formData.get("currency") as string)?.trim().toUpperCase() || "EUR";
  const currency = rawCurrency.length === 3 ? rawCurrency : "EUR";
  const totalClaimedAmountStr = formData.get("totalClaimedAmount") as string;
  const totalReceiptAmountStr = formData.get("totalReceiptAmount") as string;
  const rawReceiptPathsStr = formData.get("receiptPaths") as string;
  const matchedItemsStr = formData.get("matchedItems") as string;

  const totalClaimedAmount = Number(totalClaimedAmountStr) || 0;
  const totalReceiptAmount = totalReceiptAmountStr ? Number(totalReceiptAmountStr) : null;

  const membership = await getUserMembership(kitchenId, session.user.id);
  if (!membership) {
    throw new Error("You are not a member of this kitchen.");
  }

  const userId = session.user.id;

  const rawReceiptPaths: string[] = JSON.parse(rawReceiptPathsStr || "[]");
  const receiptPaths = rawReceiptPaths.filter(
    (p) => typeof p === "string" && p.startsWith("https://") && p.includes(".blob.vercel-storage.com/")
  );

  const items: Array<{
    shopping_list_item_id: string;
    price?: number | null;
    pantry_item_id?: string | null;
  }> = JSON.parse(matchedItemsStr || "[]");

  const itemIds = items.map((i) => i.shopping_list_item_id).filter(Boolean);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (itemIds.length > 0) {
      const { rows: validItems } = await client.query<{ id: string; pantry_item_id: string | null }>(
        `SELECT id, pantry_item_id 
         FROM shopping_list_items
         WHERE id = ANY($1::uuid[]) 
           AND kitchen_id = $2 
           AND purchased_by = $3
           AND is_guest_staged = FALSE
           AND checkout_id IS NULL`,
        [itemIds, kitchenId, session.user.id]
      );

      if (validItems.length !== itemIds.length) {
        throw new Error("One or more items do not belong to your active cart or have already been checked out.");
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
             checkout_id = $1, 
             item_price = $2, 
             currency = $3,
             is_guest_staged = FALSE
         WHERE id = $4 
           AND kitchen_id = $5
           AND purchased_by = $6
           AND checkout_id IS NULL`,
        [checkoutId, item.price ?? null, currency, item.shopping_list_item_id, kitchenId, session.user.id]
      );

      if (updateResult.rowCount === 0) {
        throw new Error(`Item ${item.shopping_list_item_id} could not be updated or was already processed.`);
      }

      if (item.pantry_item_id) {
        await client.query(
          `UPDATE pantry_items SET is_out_of_stock = FALSE, updated_at = NOW()
           WHERE id = $1 AND kitchen_id = $2`,
          [item.pantry_item_id, kitchenId]
        );
      }
    }

    await client.query('COMMIT');

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

    return { success: true, checkoutId, totalClaimedAmount, currency };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}


/**
 * Direct checkout without receipt upload.
 * Persists optional store name, total claimed amount, and note for the admin.
 */
export async function receiptlessCheckoutAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("You must be logged in.");

  const kitchenId = formData.get("kitchenId") as string;
  const storeName = (formData.get("storeName") as string)?.trim() || null;
  const note = (formData.get("note") as string)?.trim() || null;
  const rawCurrency = (formData.get("currency") as string)?.trim().toUpperCase() || "EUR";
  const currency = rawCurrency.length === 3 ? rawCurrency : "EUR";
  const totalAmountStr = formData.get("totalAmount") as string;
  const itemIdsStr = formData.get("itemIds") as string;

  const totalAmount = parseFloat(totalAmountStr) || 0;
  const itemIds: string[] = JSON.parse(itemIdsStr || "[]");

  const membership = await getUserMembership(kitchenId, session.user.id);
  if (!membership) {
    throw new Error("You are not a member of this kitchen.");
  }

  const userId = session.user.id;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Fetch user's cart items strictly enforcing kitchen_id and user ownership
    let cartRows: { id: string; pantry_item_id: string | null }[] = [];
    if (itemIds.length > 0) {
      const res = await client.query<{ id: string; pantry_item_id: string | null }>(
        `SELECT id, pantry_item_id FROM shopping_list_items
         WHERE kitchen_id = $1 AND purchased_by = $2 AND is_purchased = TRUE AND checkout_id IS NULL AND id = ANY($3::uuid[])`,
        [kitchenId, userId, itemIds]
      );

      if (res.rows.length !== itemIds.length) {
        throw new Error("One or more items do not belong to your cart in this kitchen or have already been checked out.");
      }

      cartRows = res.rows;
    } else {
      const res = await client.query<{ id: string; pantry_item_id: string | null }>(
        `SELECT id, pantry_item_id FROM shopping_list_items
         WHERE kitchen_id = $1 AND purchased_by = $2 AND is_purchased = TRUE AND checkout_id IS NULL`,
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
       SET is_purchased = TRUE, checkout_id = $1, currency = $2, is_guest_staged = FALSE
       WHERE id = ANY($3::uuid[]) AND kitchen_id = $4`,
      [checkoutId, currency, checkoutItemIds, kitchenId]
    );

    // Restock any linked pantry items
    const pantryIds = cartRows
      .map((i) => i.pantry_item_id)
      .filter((id): id is string => id !== null);

    if (pantryIds.length > 0) {
      await client.query(
        `UPDATE pantry_items SET is_out_of_stock = FALSE, updated_at = NOW()
         WHERE id = ANY($1::uuid[]) AND kitchen_id = $2`,
        [pantryIds, kitchenId]
      );
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

    return { success: true, checkoutId, totalClaimedAmount: totalAmount };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
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
    if (!rawUrl || typeof rawUrl !== "string" || !rawUrl.includes(".blob.vercel-storage.com/")) {
      return { success: false, error: "Invalid receipt URL" };
    }

    await del(rawUrl);
    return { success: true };
  } catch (error) {
    console.error("Blob delete error:", error);
    return { success: false };
  }
}
