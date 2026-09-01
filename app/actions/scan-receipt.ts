"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { getUserMembership } from "@/lib/kitchen";
import { pool } from "@/lib/db";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "node:fs/promises";
import path from "node:path";
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

  let filepath: string | null = null;
  try {
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `${crypto.randomUUID()}-${Date.now()}.${ext}`;
    const dir = path.join(process.cwd(), 'public', 'uploads', 'receipts');
    await fs.mkdir(dir, { recursive: true });
    filepath = path.join(dir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filepath, buffer);

    const base64 = buffer.toString('base64');
    const mimeType = file.type || 'image/jpeg';

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });
    
    const stagedItems = JSON.parse(stagedCartItemsStr || '[]');
    
    const prompt = `You are a receipt OCR extraction assistant. Extract all line items from this supermarket receipt (typically German/European receipts like Rewe, Lidl, Aldi, Edeka, DM).

Return a JSON object with this exact structure:
{
  "store_name": "<store name as printed, e.g. Lidl, Rewe, or Supermarket if unclear>",
  "total_receipt_amount": <number, the overall gross receipt total in EUR>,
  "lines": [
    {
      "raw_name": "<text as printed on receipt>",
      "price": <number, EUR price for this line>,
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

    return {
      receiptPath: `/uploads/receipts/${filename}`,
      storeName: parsed.store_name || 'Supermarket',
      totalReceiptAmount: Number(parsed.total_receipt_amount) || 0,
      lines: (parsed.lines || []).map((line: any) => ({
        raw_name: line.raw_name || '',
        price: Number(line.price) || 0,
        quantity: Number(line.quantity) || 1,
        matched_cart_item_id: line.matched_cart_item_id || null,
      })),
    };

  } catch (error: any) {
    if (filepath) {
      try {
        await fs.unlink(filepath);
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
  const storeName = formData.get("storeName") as string;
  const totalClaimedAmountStr = formData.get("totalClaimedAmount") as string;
  const totalReceiptAmountStr = formData.get("totalReceiptAmount") as string;
  const receiptPath = formData.get("receiptPath") as string;
  const matchedItemsStr = formData.get("matchedItems") as string;

  const totalClaimedAmount = Number(totalClaimedAmountStr);
  const totalReceiptAmount = Number(totalReceiptAmountStr);

  const membership = await getUserMembership(kitchenId, session.user.id);
  if (!membership) {
    throw new Error("You are not a member of this kitchen.");
  }

  const userId = session.user.id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Insert checkout row with all the receipt data
    const { rows: checkoutRows } = await client.query(
      `INSERT INTO checkouts (kitchen_id, user_id, store_name, total_claimed_amount, total_receipt_amount, receipt_filename, is_refunded, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, FALSE, NOW())
       RETURNING id`,
      [kitchenId, userId, storeName, totalClaimedAmount, totalReceiptAmount, receiptPath]
    );
    const checkoutId = checkoutRows[0].id;
    
    // Update each matched shopping list item
    const items = JSON.parse(matchedItemsStr || '[]');
    for (const item of items) {
      await client.query(
        `UPDATE shopping_list_items
         SET is_purchased = TRUE, checkout_id = $1, item_price = $2, is_guest_staged = FALSE
         WHERE id = $3 AND kitchen_id = $4`,
        [checkoutId, item.price, item.shopping_list_item_id, kitchenId]
      );
      
      // If tied to a pantry item, restock it
      if (item.pantry_item_id) {
        await client.query(
          `UPDATE pantry_items SET is_out_of_stock = FALSE, updated_at = NOW()
           WHERE id = $1 AND kitchen_id = $2`,
          [item.pantry_item_id, kitchenId]
        );
      }
    }
    
    await client.query('COMMIT');
    
    revalidatePath(`/kitchen/${kitchenId}/member`);
    revalidatePath(`/kitchen/${kitchenId}/admin`);
    
    return { success: true, checkoutId, totalClaimedAmount };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteReceiptFileAction(receiptPath: string) {
  const session = await auth();
  if (!session?.user?.id) return;
  
  try {
    const fullPath = path.join(process.cwd(), 'public', receiptPath);
    await fs.unlink(fullPath);
  } catch {
    // File may not exist, ignore
  }
}
