import { GoogleGenerativeAI, SchemaType, type ResponseSchema } from "@google/generative-ai";
import {
  normalizeStoreName,
  reconcileReceiptLines,
  type ReconciledReceiptLine,
  type ReconciliationSummary,
} from "./receipt-normalizer";

export const GEMINI_MODEL_ID = "gemini-3.5-flash-lite";
export const GEMINI_REQUEST_TIMEOUT_MS = 10_000;

export const REQUESTY_API_URL = "https://router.requesty.ai/v1/chat/completions";
export const REQUESTY_MODEL_ID = "gemma-4-31b-it";
export const REQUESTY_REQUEST_TIMEOUT_MS = 10_000;

export const ALL_PROVIDERS_FAILED_MESSAGE =
  "Receipt scanner is temporarily busy across all providers. Please try again in a moment.";

/** Strict JSON schema for native Gemini constrained decoding */
export const receiptResponseSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    store: {
      type: SchemaType.STRING,
      description:
        "Store name as printed on the receipt, e.g. Edeka, Rewe, Lidl, Aldi, Penny, Netto, Kaufland, dm, Rossmann",
    },
    date: {
      type: SchemaType.STRING,
      description: "Purchase date as YYYY-MM-DD or null if unreadable",
      nullable: true,
    },
    currency: {
      type: SchemaType.STRING,
      description: "3-letter uppercase ISO currency code: EUR, CHF, USD, GBP. Default EUR",
    },
    total: {
      type: SchemaType.NUMBER,
      description: "Overall gross receipt total as printed next to SUMME, GESAMTBETRAG, or TOTAL",
    },
    items: {
      type: SchemaType.ARRAY,
      description: "List of purchased items, deposits (Pfand), and discounts",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          raw_name: {
            type: SchemaType.STRING,
            description: "Item name text as printed on the receipt line",
          },
          normalized_name: {
            type: SchemaType.STRING,
            description: "Concise clean product name (e.g. Bio Bananen, Milch)",
          },
          quantity: {
            type: SchemaType.NUMBER,
            description: "Quantity/count of the item (e.g. 2 for '2 x 1,29'). Default 1",
          },
          unit_price: {
            type: SchemaType.NUMBER,
            description: "Price per single unit if multi-item (e.g. 1.29 for '1,29 x 2 -> 2,58'). Null if quantity is 1",
            nullable: true,
          },
          line_total: {
            type: SchemaType.NUMBER,
            description: "Right-hand total printed for this line (e.g. 2.58 for '1,29 x 2 -> 2,58')",
          },
          price: {
            type: SchemaType.NUMBER,
            description: "Total line price for this item (same as line_total)",
          },
        },
        required: ["raw_name", "quantity", "line_total"],
      },
    },
  },
  required: ["store", "currency", "total", "items"],
};

export interface ExtractedReceiptRaw {
  store?: unknown;
  date?: unknown;
  currency?: unknown;
  total?: unknown;
  items?: Array<{
    raw_name?: unknown;
    normalized_name?: unknown;
    quantity?: unknown;
    unit_price?: unknown;
    line_total?: unknown;
    price?: unknown;
  }>;
}

export interface StagedCartItem {
  id?: unknown;
  name?: unknown;
}

export interface ExtractedReceiptResult {
  storeName: string;
  rawStoreName: string;
  date: string | null;
  currency: string;
  totalReceiptAmount: number;
  lines: ReconciledReceiptLine[];
  reconciliation: ReconciliationSummary;
  usedProvider: string;
}

function normalizeName(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

/**
 * Match a receipt line to a staged cart item deterministically.
 */
export function matchCartItem(
  item: { raw_name?: string | null; normalized_name?: string | null },
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

export function buildExtractionPrompt(stagedItems: StagedCartItem[] = []): string {
  return `You are an expert DACH (Germany, Austria, Switzerland) supermarket receipt OCR extraction assistant.
Extract every purchased line item, bottle deposit (Pfand/Leergut), and discount/coupon with near-100% precision.

GERMAN RECEIPT RULES:
1. Multi-Item Lines:
   - Format: "Zwiebeln 1,29 € x 2 2,58 A" or "2 Stk x 1,29 2,58".
   - Capture:
     "quantity": 2
     "unit_price": 1.29
     "line_total": 2.58 (the right-hand printed line total).
   - CRITICAL: "line_total" is ALWAYS the printed right-hand line total (2.58), NEVER multiply quantity again!
2. Weight-based Lines:
   - Format: "0,450 kg x 2,99 EUR/kg 1,35".
   - Capture "quantity": 1, "unit_price": 1.35, "line_total": 1.35 (the printed right-hand amount).
3. Bottle Deposits (Pfand / Leergut):
   - "PFAND 0,25" -> quantity: 1, unit_price: 0.25, line_total: 0.25.
   - "LEERGUT -0,25" or return -> line_total: -0.25.
4. Discounts / Coupons:
   - "RABATT -0,50", "COUPON -1,00" -> line_total: -0.50 (negative value).
5. Decimal Commas & Tax Codes:
   - German numbers use commas: "1,29" -> 1.29.
   - Strip tax flags: "A", "B", "19%", "7%" from names and numbers.
6. Store Name:
   - Read thermal print carefully. Common chains: EDEKA, REWE, ALDI Nord, ALDI Süd, LIDL, dm, ROSSMANN, PENNY, NETTO, KAUFLAND, MÜLLER, BUDNI, DENN'S, ALNATURA, NORMA.
   - Beware OCR thermal typos: 'EDEMA' is EDEKA, 'LID1' is LIDL, 'REVE' is REWE.
7. Total Amount:
   - Extract the printed grand total next to "SUMME", "GESAMTBETRAG", or "TOTAL" into "total".
   - If no "SUMME" / "TOTAL" is printed or visible on the receipt (e.g. the receipt is torn or cut off before the sum line), calculate "total" as the exact sum of all extracted line items instead of guessing.
8. Currency:
   - Default "EUR" (or "CHF" for Switzerland, "USD", "GBP").

Output ONLY a compact JSON object adhering to this schema:
{"store":"...","date":"YYYY-MM-DD or null","currency":"EUR","total":0.00,"items":[{"raw_name":"...","normalized_name":"...","quantity":1,"unit_price":0.00,"line_total":0.00,"price":0.00}]}

Known staged cart item names (for context only): ${JSON.stringify(
    stagedItems.map((item) => String(item?.name ?? "")).filter(Boolean)
  )}`;
}

/** Strip reasoning blocks, code fences and parse JSON. */
export function parseReceiptJson(raw: string, finishReason?: string): ExtractedReceiptRaw {
  let clean = raw.replace(/<think\b[^>]*>[\s\S]*?<\/think>/gi, "").trim();

  if (clean.startsWith("```")) {
    clean = clean.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
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
    return parsed as ExtractedReceiptRaw;
  } catch (err: any) {
    if (err instanceof SyntaxError || err?.name === "SyntaxError") {
      const rawSnippet = raw.slice(Math.max(0, raw.length - 300));
      console.error(
        `[parseReceiptJson] SyntaxError parsing receipt JSON (finishReason: ${finishReason || "unknown"}). Tail:\n${rawSnippet}`
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

export async function extractWithGemini(
  apiKey: string,
  prompt: string,
  mimeType: string,
  base64: string
): Promise<ExtractedReceiptRaw> {
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
    const error = new Error(
      `Gemini response truncated by MAX_TOKENS (${rawText.length} chars). Snippet: ...${rawSnippet}`
    );
    (error as any).finishReason = finishReason;
    (error as any).isTruncated = true;
    throw error;
  }

  return parseReceiptJson(rawText, finishReason);
}

export async function extractWithRequesty(
  apiKey: string,
  prompt: string,
  mimeType: string,
  base64: string
): Promise<ExtractedReceiptRaw> {
  const response = await fetch(REQUESTY_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: REQUESTY_MODEL_ID,
      temperature: 0.1,
      max_tokens: 4096,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You extract structured data from receipt images. Return compact JSON: { store, date, currency, total, items: [{ raw_name, normalized_name, quantity, unit_price, line_total, price }] }.",
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
    signal: AbortSignal.timeout(REQUESTY_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const error = new Error(
      `Requesty model "${REQUESTY_MODEL_ID}" responded ${response.status} ${response.statusText}: ${body.slice(0, 500)}`
    ) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  const payload: any = await response.json();
  const choice = payload?.choices?.[0];
  const finishReason = choice?.finish_reason;
  const content = readMessageContent(choice?.message?.content);
  if (!content.trim()) {
    throw new Error(`Requesty model "${REQUESTY_MODEL_ID}" returned an empty completion.`);
  }

  if (finishReason === "length") {
    const rawSnippet = content.slice(Math.max(0, content.length - 300));
    const error = new Error(
      `Requesty response truncated by max_tokens (${content.length} chars). Snippet: ...${rawSnippet}`
    );
    (error as any).finishReason = finishReason;
    (error as any).isTruncated = true;
    throw error;
  }

  return parseReceiptJson(content, finishReason);
}

/**
 * Main OCR pipeline:
 * 1. Executes Gemini 3.5 Flash Lite with jittered retry on transient 502/503/504 errors.
 * 2. Falls back to Requesty (Gemma 4 31B IT) if Gemini fails.
 * 3. Applies deterministic DACH store normalization and mathematical line reconciliation.
 */
export async function extractReceiptData(
  buffer: Buffer,
  mimeType: string,
  options: {
    stagedItems?: StagedCartItem[];
    geminiApiKey?: string;
    requestyApiKey?: string;
  } = {}
): Promise<ExtractedReceiptResult> {
  const geminiApiKey = options.geminiApiKey || process.env.GEMINI_API_KEY;
  const requestyApiKey = options.requestyApiKey || process.env.REQUESTY_API_KEY;

  if (!geminiApiKey && !requestyApiKey) {
    throw new Error("Receipt OCR is not configured. Please set GEMINI_API_KEY.");
  }

  const base64 = buffer.toString("base64");
  const stagedItems = options.stagedItems || [];
  const prompt = buildExtractionPrompt(stagedItems);

  let rawReceipt: ExtractedReceiptRaw | null = null;
  let usedProvider = "";
  let lastError: any = null;

  // Primary: Gemini 3.5 Flash Lite
  if (geminiApiKey) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const startMs = Date.now();
        rawReceipt = await extractWithGemini(geminiApiKey, prompt, mimeType, base64);
        console.log(
          `[extractReceiptData] Gemini attempt ${attempt + 1} succeeded in ${Date.now() - startMs}ms`
        );
        usedProvider = `gemini:${GEMINI_MODEL_ID}`;
        break;
      } catch (err: any) {
        lastError = err;
        const isTransient =
          err?.status === 503 ||
          err?.status === 502 ||
          err?.status === 504 ||
          err?.name === "TimeoutError" ||
          err?.name === "GoogleGenerativeAIAbortError" ||
          /UNAVAILABLE|overload|timed? ?out/i.test(err?.message || "");

        const isTruncated = err?.finishReason === "MAX_TOKENS" || err?.isTruncated;

        if (attempt === 0 && isTransient && !isTruncated) {
          const backoff = 400 + Math.floor(Math.random() * 150);
          console.warn(
            `[extractReceiptData] Gemini transient error (${err?.status || err?.message}). Retrying in ${backoff}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, backoff));
          continue;
        }

        console.warn(
          `[extractReceiptData] Gemini attempt ${attempt + 1} failed:`,
          err?.status || err?.message
        );
        break;
      }
    }
  }

  // Fallback: Requesty
  if (!rawReceipt && requestyApiKey) {
    try {
      console.log("[extractReceiptData] Attempting Requesty fallback...");
      const startMs = Date.now();
      rawReceipt = await extractWithRequesty(requestyApiKey, prompt, mimeType, base64);
      console.log(`[extractReceiptData] Requesty succeeded in ${Date.now() - startMs}ms`);
      usedProvider = `requesty:${REQUESTY_MODEL_ID}`;
    } catch (reqErr: any) {
      console.error("[extractReceiptData] Requesty fallback failed:", reqErr);
      lastError = reqErr;
    }
  }

  if (!rawReceipt) {
    throw lastError || new Error(ALL_PROVIDERS_FAILED_MESSAGE);
  }

  // Currency normalization
  const rawCurrency = String(rawReceipt.currency ?? "EUR")
    .trim()
    .toUpperCase();
  const currency = rawCurrency.length === 3 ? rawCurrency : "EUR";

  // Store name normalization
  const rawStoreName =
    typeof rawReceipt.store === "string" && rawReceipt.store.trim()
      ? rawReceipt.store.trim()
      : "Supermarket";
  const rawItems = Array.isArray(rawReceipt.items) ? rawReceipt.items : [];
  const storeName = normalizeStoreName(
    rawStoreName,
    rawItems.map((item) => ({ raw_name: typeof item?.raw_name === "string" ? item.raw_name : "" }))
  );

  // Date parsing
  const date = typeof rawReceipt.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rawReceipt.date.trim())
    ? rawReceipt.date.trim()
    : null;

  // Total amount
  const totalReceiptAmount = Number(rawReceipt.total) || 0;

  // Deterministic math reconciliation
  const reconciliation = reconcileReceiptLines(
    rawItems.map((item) => ({
      raw_name: item?.raw_name as string,
      normalized_name: item?.normalized_name as string,
      quantity: item?.quantity as number,
      unit_price: item?.unit_price as number,
      line_total: item?.line_total as number,
      price: item?.price as number,
    })),
    totalReceiptAmount
  );

  // Cart item matching
  const lines: ReconciledReceiptLine[] = reconciliation.lines.map((line) => ({
    ...line,
    matched_cart_item_id: matchCartItem(line, stagedItems),
  }));

  return {
    storeName,
    rawStoreName,
    date,
    currency,
    totalReceiptAmount,
    lines,
    reconciliation,
    usedProvider,
  };
}
