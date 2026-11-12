import { GoogleGenerativeAI, SchemaType, type ResponseSchema } from "@google/generative-ai";
import {
  normalizeStoreName,
  reconcileReceiptLines,
  type ReconciledReceiptLine,
  type ReconciliationSummary,
} from "./receipt-normalizer";

export const GEMINI_CASCADE_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-2.5-flash-lite",
  "gemini-3-flash",
  "gemini-2.5-flash",
] as const;

export type GeminiCascadeModel = (typeof GEMINI_CASCADE_MODELS)[number];

export const GEMINI_MODEL_ID = GEMINI_CASCADE_MODELS[0];
export const GEMINI_REQUEST_TIMEOUT_MS = 7_000;

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

function getConciseErrorMessage(err: any): string {
  if (typeof err?.status === "number") {
    return `${err.status}`;
  }
  const msg = typeof err?.message === "string" ? err.message : String(err ?? "");
  const statusMatch = msg.match(/\[(\d{3})\b/);
  if (statusMatch) {
    return statusMatch[1];
  }
  if (err?.finishReason === "MAX_TOKENS" || err?.isTruncated) {
    return "MAX_TOKENS";
  }
  if (
    err?.name === "TimeoutError" ||
    err?.name === "GoogleGenerativeAIAbortError" ||
    err?.name === "AbortError" ||
    /aborted|timed? ?out/i.test(msg)
  ) {
    return "timeout";
  }
  if (err instanceof SyntaxError || /JSON|Unexpected token|non-object receipt payload/i.test(msg)) {
    return "JSON error";
  }
  return msg.length > 35 ? `${msg.slice(0, 32)}...` : msg || "failed";
}

export async function extractWithGemini(
  apiKey: string,
  modelName: string,
  prompt: string,
  mimeType: string,
  base64: string,
  signal?: AbortSignal
): Promise<ExtractedReceiptRaw> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: receiptResponseSchema,
      temperature: 0.1,
      maxOutputTokens: 4096,
    },
  });

  const result = await model.generateContent(
    [
      prompt,
      {
        inlineData: {
          mimeType,
          data: base64,
        },
      },
    ],
    {
      signal: signal ?? AbortSignal.timeout(GEMINI_REQUEST_TIMEOUT_MS),
    }
  );

  const candidate = result.response.candidates?.[0];
  const finishReason = candidate?.finishReason;
  let rawText = "";
  try {
    rawText = result.response.text?.() ?? "";
  } catch (textErr: any) {
    console.warn(
      `[extractWithGemini] Failed to read candidate response text (${modelName}, finishReason: ${finishReason}):`,
      textErr?.message
    );
  }

  if (finishReason === "MAX_TOKENS") {
    const rawSnippet = rawText.slice(Math.max(0, rawText.length - 300));
    const error = new Error(
      `Gemini (${modelName}) response truncated by MAX_TOKENS (${rawText.length} chars). Snippet: ...${rawSnippet}`
    );
    (error as any).finishReason = finishReason;
    (error as any).isTruncated = true;
    throw error;
  }

  return parseReceiptJson(rawText, finishReason);
}

/**
 * Main OCR pipeline:
 * Pure Google AI Studio multi-model fallback cascade across:
 * 1. gemini-3.5-flash-lite (Primary: 15 RPM / 500 RPD)
 * 2. gemini-2.5-flash-lite (Fallback 1: 10 RPM / 20 RPD)
 * 3. gemini-3-flash (Fallback 2: 5 RPM / 20 RPD)
 * 4. gemini-2.5-flash (Fallback 3: 5 RPM / 20 RPD)
 *
 * Each attempt runs with a fast 7s timeout.
 * Any failure immediately advances to the next model in the cascade without delays.
 */
export async function extractReceiptData(
  buffer: Buffer,
  mimeType: string,
  options: {
    stagedItems?: StagedCartItem[];
    geminiApiKey?: string;
  } = {}
): Promise<ExtractedReceiptResult> {
  const geminiApiKey = options.geminiApiKey || process.env.GEMINI_API_KEY;

  if (!geminiApiKey) {
    throw new Error("Receipt OCR is not configured. Please set GEMINI_API_KEY.");
  }

  const base64 = buffer.toString("base64");
  const stagedItems = options.stagedItems || [];
  const prompt = buildExtractionPrompt(stagedItems);

  let rawReceipt: ExtractedReceiptRaw | null = null;
  let usedProvider = "";
  const errors: string[] = [];

  for (const model of GEMINI_CASCADE_MODELS) {
    try {
      const startMs = Date.now();
      rawReceipt = await extractWithGemini(
        geminiApiKey,
        model,
        prompt,
        mimeType,
        base64,
        AbortSignal.timeout(GEMINI_REQUEST_TIMEOUT_MS)
      );
      console.log(
        `[extractReceiptData] Model ${model} succeeded in ${Date.now() - startMs}ms`
      );
      usedProvider = `gemini:${model}`;
      break;
    } catch (err: any) {
      const reason = getConciseErrorMessage(err);
      errors.push(`${model}: ${reason}`);
      console.warn(
        `[extractReceiptData] Model ${model} failed (${reason}), immediately advancing to next model:`,
        err?.status || err?.message
      );
    }
  }

  if (!rawReceipt) {
    throw new Error(
      `Alle Gemini-Modelle sind gerade überlastet (${errors.join(", ")}). Bitte in einem Moment erneut versuchen.`
    );
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
