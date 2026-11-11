"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { getUserMembership } from "@/lib/kitchen";
import { notifyKitchen, pushMessages } from "@/lib/push";
import { capitalize } from "@/lib/utils";
import { pool } from "@/lib/db";
import { GoogleGenerativeAI, SchemaType, type ResponseSchema } from "@google/generative-ai";
import { put, del } from "@vercel/blob";
import crypto from "node:crypto";

export interface ScannedReceiptLine {
  raw_name: string;
  price: number;
  quantity: number;
  matched_cart_item_id: string | null;
}

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

/** Primary OCR engine: Google AI Studio gemini-3.5-flash-lite */
const GEMINI_MODEL_ID = "gemini-3.5-flash-lite";
const GEMINI_REQUEST_TIMEOUT_MS = 8_000;

/** Optional secondary fallback: DeepSeek deepseek-flash */
const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const DEEPSEEK_MODEL_ID = "deepseek-flash";
const DEEPSEEK_REQUEST_TIMEOUT_MS = 10_000;

const ALL_PROVIDERS_FAILED_MESSAGE =
  "Receipt scanner is temporarily busy across all providers. Please try again in a moment.";

/** Strict JSON schema for native Gemini constrained decoding */
const receiptResponseSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    store: {
      type: SchemaType.STRING,
      description: "Store name as printed on the receipt, e.g. Lidl, Rewe, or Supermarket if unclear",
    },
    date: {
      type: SchemaType.STRING,
      description: "Purchase date as YYYY-MM-DD or null/empty if unreadable",
      nullable: true,
    },
    currency: {
      type: SchemaType.STRING,
      description: "3-letter uppercase ISO code: EUR, CHF, USD, GBP, etc. Default EUR",
    },
    total: {
      type: SchemaType.NUMBER,
      description: "Overall gross receipt total as a number",
    },
    items: {
      type: SchemaType.ARRAY,
      description: "List of purchased receipt line items",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          raw_name: {
            type: SchemaType.STRING,
            description: "Concise item name text as printed on the receipt (omit filler and excess whitespace)",
          },
          normalized_name: {
            type: SchemaType.STRING,
            description: "Concise clean product name (e.g. Milk, Bananas)",
          },
          quantity: {
            type: SchemaType.NUMBER,
            description: "Quantity of the item (default 1)",
          },
          price: {
            type: SchemaType.NUMBER,
            description: "Total line price for this item",
          },
        },
        required: ["raw_name", "price", "quantity"],
      },
    },
  },
  required: ["store", "currency", "total", "items"],
};

/** Shape we ask every provider to return. */
interface ExtractedReceipt {
  store?: unknown;
  date?: unknown;
  currency?: unknown;
  total?: unknown;
  items?: Array<{
    raw_name?: unknown;
    normalized_name?: unknown;
    quantity?: unknown;
    price?: unknown;
  }>;
}

type ExtractedReceiptItem = NonNullable<ExtractedReceipt["items"]>[number];

interface StagedCartItem {
  id?: unknown;
  name?: unknown;
}

function normalizeName(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

/**
 * Match a receipt line to a staged cart item ourselves, so the provider
 * schema stays a plain receipt extraction with no app-specific ids.
 */
function matchCartItem(
  item: ExtractedReceiptItem,
  stagedItems: StagedCartItem[]
): string | null {
  const candidates = [item?.normalized_name, item?.raw_name]
    .map(normalizeName)
    .filter((candidate) => candidate.length > 0);
  if (candidates.length === 0) return null;

  let best: { id: string; length: number } | null = null;

  for (const staged of stagedItems) {
    const stagedId = typeof staged?.id === "string" ? staged.id : null;
    const target = normalizeName(staged?.name);
    if (!stagedId || target.length < 3) continue;

    for (const candidate of candidates) {
      if (candidate.includes(target) || target.includes(candidate)) {
        if (!best || target.length > best.length) {
          best = { id: stagedId, length: target.length };
        }
        break;
      }
    }
  }

  return best?.id ?? null;
}

function buildExtractionPrompt(stagedItems: StagedCartItem[]): string {
  return `You are a receipt OCR extraction assistant. Extract every purchased line item from the attached supermarket receipt image.

Inspect the receipt text for currency symbols or abbreviations (e.g. "CHF", "EUR", "USD", "GBP", "€", "$", "£", "Fr."). Return a standard 3-letter uppercase ISO code in the "currency" field. Default to "EUR" if ambiguous or not explicitly specified.

IMPORTANT FORMATTING RULES:
- Output compact, minified JSON with no extra whitespace, indentation, or newlines to conserve tokens.
- Keep "raw_name" and "normalized_name" strings concise (omit redundant store codes, discounts, or excess whitespace).
- Ensure all line items are extracted completely without truncating the items array.

Return a JSON object with this structure:
{"store":"...","date":"YYYY-MM-DD or null","currency":"EUR","total":0.00,"items":[{"raw_name":"...","normalized_name":"...","quantity":1,"price":0.00}]}

Return ONLY the compact JSON object. No markdown, no code fences, no extra text.

Known staged cart item names (for context only): ${JSON.stringify(
    stagedItems.map((item) => String(item?.name ?? "")).filter(Boolean)
  )}`;
}

/** Strip reasoning blocks, code fences / prose and parse the provider's JSON answer. */
function parseReceiptJson(raw: string, finishReason?: string): ExtractedReceipt {
  // Reasoning models may emit thinking blocks before the actual JSON.
  // Drop those blocks first so they can never break JSON.parse().
  let clean = raw.replace(/<think\b[^>]*>[\s\S]*?<\/think>/gi, "").trim();

  if (clean.startsWith("```")) {
    clean = clean
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");
  }

  const firstBrace = clean.indexOf("{");
  const lastBrace = clean.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    clean = clean.slice(firstBrace, lastBrace + 1);
  }

  try {
    const parsed = JSON.parse(clean);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("AI returned a non-object receipt payload.");
    }
    return parsed as ExtractedReceipt;
  } catch (err: any) {
    if (err instanceof SyntaxError || err?.name === "SyntaxError") {
      const rawSnippet = raw.slice(Math.max(0, raw.length - 300));
      console.error(
        `[parseReceiptJson] SyntaxError parsing receipt JSON (finishReason: ${finishReason || "unknown"}). Truncated raw text tail:\n${rawSnippet}`
      );
    }
    throw err;
  }
}

function readMessageContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && typeof (part as any).text === "string") {
          return (part as any).text as string;
        }
        return "";
      })
      .join("");
  }
  return "";
}

async function extractWithGemini(
  apiKey: string,
  prompt: string,
  mimeType: string,
  base64: string
): Promise<ExtractedReceipt> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel(
    {
      model: GEMINI_MODEL_ID,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: receiptResponseSchema,
        temperature: 0.1,
        maxOutputTokens: 4096,
      },
    },
    {
      timeout: GEMINI_REQUEST_TIMEOUT_MS,
    }
  );

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        mimeType,
        data: base64,
      },
    },
  ]);

  const candidate = result.response.candidates?.[0];
  const finishReason = candidate?.finishReason;
  let rawText = "";
  try {
    rawText = result.response.text?.() ?? "";
  } catch (textErr: any) {
    console.warn(
      `[extractWithGemini] Failed to read candidate response text (finishReason: ${finishReason}):`,
      textErr?.message
    );
  }

  if (finishReason === "MAX_TOKENS") {
    const rawSnippet = rawText.slice(Math.max(0, rawText.length - 300));
    console.error(
      `[extractWithGemini] Gemini hit MAX_TOKENS truncation (finishReason: ${finishReason}). Truncated text tail:\n${rawSnippet}`
    );
    const error = new Error(
      `Gemini response truncated by MAX_TOKENS (${rawText.length} chars). Truncated snippet: ...${rawSnippet}`
    );
    (error as any).finishReason = finishReason;
    (error as any).rawSnippet = rawSnippet;
    (error as any).isTruncated = true;
    throw error;
  }

  try {
    return parseReceiptJson(rawText, finishReason);
  } catch (err: any) {
    if (err instanceof SyntaxError || err?.name === "SyntaxError") {
      const rawSnippet = rawText.slice(Math.max(0, rawText.length - 300));
      console.error(
        `[extractWithGemini] SyntaxError parsing Gemini JSON (finishReason: ${finishReason || "unknown"}). Truncated text tail:\n${rawSnippet}`,
        err
      );
      (err as any).finishReason = finishReason;
      (err as any).rawSnippet = rawSnippet;
      (err as any).isTruncated = true;
    }
    throw err;
  }
}

async function extractWithDeepSeek(
  apiKey: string,
  prompt: string,
  mimeType: string,
  base64: string
): Promise<ExtractedReceipt> {
  const response = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL_ID,
      temperature: 0.1,
      max_tokens: 4096,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You extract structured data from receipt images. Reply with a single strict compact minified JSON object with concise item names and no extra whitespace or newlines: { store, date, currency, total, items: [{ raw_name, normalized_name, quantity, price }] }.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64}` },
            },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(DEEPSEEK_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const error = new Error(
      `DeepSeek model "${DEEPSEEK_MODEL_ID}" responded ${response.status} ${response.statusText}: ${body.slice(0, 500)}`
    ) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  const payload: any = await response.json();
  const choice = payload?.choices?.[0];
  const finishReason = choice?.finish_reason;
  const content = readMessageContent(choice?.message?.content);
  if (!content.trim()) {
    throw new Error(`DeepSeek model "${DEEPSEEK_MODEL_ID}" returned an empty completion.`);
  }

  if (finishReason === "length") {
    const rawSnippet = content.slice(Math.max(0, content.length - 300));
    console.error(
      `[extractWithDeepSeek] DeepSeek hit length/max_tokens truncation (finish_reason: ${finishReason}). Truncated text tail:\n${rawSnippet}`
    );
    const error = new Error(
      `DeepSeek response truncated by max_tokens (${content.length} chars). Truncated snippet: ...${rawSnippet}`
    );
    (error as any).finishReason = finishReason;
    (error as any).rawSnippet = rawSnippet;
    (error as any).isTruncated = true;
    throw error;
  }

  try {
    return parseReceiptJson(content, finishReason);
  } catch (err: any) {
    if (err instanceof SyntaxError || err?.name === "SyntaxError") {
      const rawSnippet = content.slice(Math.max(0, content.length - 300));
      console.error(
        `[extractWithDeepSeek] SyntaxError parsing DeepSeek JSON (finish_reason: ${finishReason || "unknown"}). Truncated text tail:\n${rawSnippet}`,
        err
      );
      (err as any).finishReason = finishReason;
      (err as any).rawSnippet = rawSnippet;
      (err as any).isTruncated = true;
    }
    throw err;
  }
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
  const deepseekApiKey = process.env.DEEPSEEK_API_KEY;

  if (!geminiApiKey && !deepseekApiKey) {
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
    const base64 = buffer.toString('base64');

    const stagedItems: StagedCartItem[] = JSON.parse(stagedCartItemsStr || "[]");
    const prompt = buildExtractionPrompt(stagedItems);

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

    // Parallel Task 2: Primary Gemini 3.5 Flash Lite + Optional DeepSeek fallback
    const ocrPromise: Promise<{ extracted: ExtractedReceipt; usedProvider: string }> = (async () => {
      let lastError: any = null;

      // Primary: Google AI Studio Gemini 3.5 Flash Lite
      if (geminiApiKey) {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const startMs = Date.now();
            const extracted = await extractWithGemini(geminiApiKey, prompt, mimeType, base64);
            console.log(
              `[scanReceiptAction] Gemini attempt ${attempt + 1} succeeded in ${Date.now() - startMs}ms`
            );
            return { extracted, usedProvider: `gemini:${GEMINI_MODEL_ID}` };
          } catch (err: any) {
            lastError = err;
            const isTruncatedOrInvalid =
              err?.finishReason === "MAX_TOKENS" ||
              err?.isTruncated === true ||
              err instanceof SyntaxError ||
              err?.name === "SyntaxError" ||
              /JSON|Unexpected token|MAX_TOKENS/i.test(err?.message || "");

            const isTransient =
              err?.status === 503 ||
              err?.status === 502 ||
              err?.status === 504 ||
              err?.name === "TimeoutError" ||
              err?.name === "GoogleGenerativeAIAbortError" ||
              /UNAVAILABLE|overload|timed? ?out/i.test(err?.message || "");

            if (attempt === 0 && isTransient && !isTruncatedOrInvalid) {
              const backoff = 400 + Math.floor(Math.random() * 150);
              console.warn(
                `[scanReceiptAction] Gemini transient error (${err?.status || err?.message}). Retrying in ${backoff}ms...`
              );
              await new Promise((resolve) => setTimeout(resolve, backoff));
              continue;
            }
            console.warn(
              `[scanReceiptAction] Gemini attempt ${attempt + 1} failed:`,
              err?.finishReason
                ? `finishReason=${err.finishReason} (truncated/fallback-eligible)`
                : err?.status || err?.message
            );
            // Truncation or invalid JSON is fallback-eligible: break from Gemini loop to try DeepSeek
            break;
          }
        }
      }

      // Secondary fallback: DeepSeek Flash
      if (deepseekApiKey) {
        try {
          console.log("[scanReceiptAction] Attempting DeepSeek fallback...");
          const startMs = Date.now();
          const extracted = await extractWithDeepSeek(deepseekApiKey, prompt, mimeType, base64);
          console.log(
            `[scanReceiptAction] DeepSeek succeeded in ${Date.now() - startMs}ms`
          );
          return { extracted, usedProvider: `deepseek:${DEEPSEEK_MODEL_ID}` };
        } catch (err: any) {
          console.error("[scanReceiptAction] DeepSeek fallback failed:", err);
          lastError = err;
        }
      }

      throw lastError || new Error(ALL_PROVIDERS_FAILED_MESSAGE);
    })();

    // Concurrently await Blob upload and OCR
    const [blobUrl, ocrResult] = await Promise.all([blobPromise, ocrPromise]);
    uploadedUrl = blobUrl;
    const { extracted, usedProvider } = ocrResult;

    console.log(`[scanReceiptAction] OCR succeeded with ${usedProvider}`);

    const rawCurrency = String(extracted.currency ?? "EUR")
      .trim()
      .toUpperCase();
    const currency = rawCurrency.length === 3 ? rawCurrency : "EUR";
    const storeName =
      typeof extracted.store === "string" && extracted.store.trim()
        ? extracted.store.trim()
        : "Supermarket";

    const lines = Array.isArray(extracted.items)
      ? extracted.items.map((line) => ({
          raw_name: typeof line?.raw_name === "string" ? line.raw_name : "",
          price: Number(line?.price) || 0,
          quantity: Number(line?.quantity) || 1,
          matched_cart_item_id: matchCartItem(line, stagedItems),
        }))
      : [];

    return {
      ok: true,
      data: {
        receiptUrl: uploadedUrl,
        storeName,
        currency,
        totalReceiptAmount: Number(extracted.total) || 0,
        lines,
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
