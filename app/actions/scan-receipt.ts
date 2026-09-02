"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { getUserMembership } from "@/lib/kitchen";
import { pool } from "@/lib/db";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { put, del } from "@vercel/blob";
import crypto from "node:crypto";

export async function scanReceiptAction(formData: FormData) {
  const file = formData.get("file") as File;
  const kitchenId = formData.get("kitchenId") as string;
  const stagedCartItemsStr = formData.get("stagedCartItems") as string;

  if (!file || !kitchenId) {
    throw new Error("Missing required fields");
  }

  const session = await auth();
  if (!session?.user?.id) throw new Error("You must be logged in.");

  const membership = await getUserMembership(kitchenId, session.user.id);
  if (!membership) {
    throw new Error("You are not a member of this kitchen.");
  }

  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  let uploadedUrl: string | null = null;
  try {
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `receipts/${crypto.randomUUID()}-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || 'image/jpeg';

    const blob = await put(filename, buffer, {
      access: 'public',
      contentType: mimeType,
    });
    uploadedUrl = blob.url;

    const base64 = buffer.toString('base64');


    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash-lite",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });
    
    const stagedItems = JSON.parse(stagedCartItemsStr || '[]');
    
    const prompt = `You are a receipt OCR extraction assistant. Extract all line items from this supermarket receipt.

Inspect receipt text for currency symbols or abbreviations (e.g., "CHF", "EUR", "USD", "GBP", "€", "$", "£", "Fr."). Return a standard 3-letter uppercase ISO code in the "currency" field. Default to "EUR" if ambiguous or not explicitly specified.

Return a JSON object with this exact structure:
{
  "store_name": "<store name as printed, e.g. Lidl, Rewe, or Supermarket if unclear>",
  "currency": "<ISO code: 'EUR', 'CHF', 'USD', 'GBP', etc. Default 'EUR'>",
  "total_receipt_amount": <number, the overall gross receipt total>,
  "lines": [
    {
      "raw_name": "<text as printed on receipt>",
      "price": <number, price for this line>,
      "quantity": <number, default 1>,
      "matched_cart_item_id": <string or null>
    }
  ]
}

For matched_cart_item_id: try to match each receipt line to one of these staged cart items by comparing names (fuzzy match OK, e.g. "H-MILCH 3.5%" matches "Milch"):
${JSON.stringify(stagedItems.map((i: any) => ({ id: i.id, name: i.name })))}

Set matched_cart_item_id to the item's id if it matches, or null if it doesn't match any cart item.

IMPORTANT: Return ONLY the JSON object, no markdown, no code fences, no extra text.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType,
          data: base64,
        },
      },
    ]);
    
    const responseText = result.response.text();

    // Strip potential markdown code fences
    let cleanJson = responseText.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    
    let parsed;
    try {
      parsed = JSON.parse(cleanJson);
    } catch {
      throw new Error("Could not parse the receipt data returned by AI. Please try again with a clearer picture.");
    }

    const rawCurrency = (parsed.currency || 'EUR').toString().trim().toUpperCase();
    const currency = rawCurrency.length === 3 ? rawCurrency : 'EUR';

    return {
      receiptPath: uploadedUrl,
      storeName: parsed.store_name || 'Supermarket',
      currency,
      totalReceiptAmount: Number(parsed.total_receipt_amount) || 0,
      lines: (parsed.lines || []).map((line: any) => ({
        raw_name: line.raw_name || '',
        price: Number(line.price) || 0,
        quantity: Number(line.quantity) || 1,
        matched_cart_item_id: line.matched_cart_item_id || null,
      })),
    };

  } catch (error: any) {
    if (uploadedUrl) {
      try {
        await del(uploadedUrl);
      } catch {
        // ignore cleanup error
      }
    }

    console.error("Receipt scanning error:", error);

    let userMessage = "Failed to scan receipt. Please try again with a clear photo.";
    if (error?.message) {
      if (error.message.includes("GEMINI_API_KEY")) {
        userMessage = error.message;
      } else if (error.message.includes("404") || error.message.includes("not found") || error.message.includes("no longer available")) {
        userMessage = "The AI model endpoint is currently unavailable. Please verify model configuration.";
      } else if (error.message.includes("API key") || error.message.includes("unauthorized") || error.message.includes("403") || error.message.includes("401") || error.message.includes("API_KEY_INVALID")) {
        userMessage = "AI service authentication error. Please verify your GEMINI_API_KEY.";
      } else if (error.message.includes("quota") || error.message.includes("rate") || error.message.includes("429") || error.message.includes("RESOURCE_EXHAUSTED")) {
        userMessage = "AI rate limit reached. Please wait a moment and try again.";
      } else if (error.message.includes("Could not parse the receipt data")) {
        userMessage = error.message;
      } else if (error.message.includes("You must be logged in") || error.message.includes("not a member") || error.message.includes("Missing required fields")) {
        userMessage = error.message;
      }
    }

    throw new Error(userMessage);
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
