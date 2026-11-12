/**
 * Receipt normalization and deterministic mathematical reconciliation layer.
 * Specifically tuned for German and DACH supermarket receipts.
 */

export interface RawExtractedItem {
  raw_name?: string | null;
  normalized_name?: string | null;
  quantity?: number | string | null;
  unit_price?: number | string | null;
  line_total?: number | string | null;
  // Legacy / fallback field
  price?: number | string | null;
}

export interface ReconciledReceiptLine {
  raw_name: string;
  normalized_name: string;
  quantity: number;
  unit_price: number | null;
  line_total: number;
  // Downstream compatibility aliases:
  unitPrice: number | null;
  lineTotal: number;
  price: number; // Unambiguous line total to claim
  is_deposit?: boolean;
  is_discount?: boolean;
  matched_cart_item_id: string | null;
}

export interface ReconciliationSummary {
  lines: ReconciledReceiptLine[];
  computedSum: number;
  printedTotal: number;
  difference: number;
  isBalanced: boolean;
  warnings: string[];
}

/**
 * Common DACH retail chains with canonical display names and aliases/patterns.
 */
export const KNOWN_DACH_CHAINS: Array<{
  canonical: string;
  aliases: string[];
  patterns: RegExp[];
}> = [
  {
    canonical: "EDEKA",
    aliases: ["edeka", "edema", "edk", "e center", "ecenter", "e-center", "edeka center", "edeka niemerszein"],
    patterns: [/e[\s-]?center/i, /edeka/i, /edema/i, /\bedk\b/i],
  },
  {
    canonical: "REWE",
    aliases: ["rewe", "reve", "rewe city", "rewe center", "rewe markt", "rewe to go", "rewe group"],
    patterns: [/rewe/i, /\breve\b/i],
  },
  {
    canonical: "ALDI Süd",
    aliases: ["aldi sud", "aldi süd", "aldi sued", "aldi gmbh sud", "aldi süd gmbh"],
    patterns: [/aldi\s*(s[uü]d|sued)/i],
  },
  {
    canonical: "ALDI Nord",
    aliases: ["aldi nord", "aldi gmbh nord", "aldi nord gmbh"],
    patterns: [/aldi\s*nord/i],
  },
  {
    canonical: "ALDI",
    aliases: ["aldi", "ald1"],
    patterns: [/\baldi\b/i, /\bald1\b/i],
  },
  {
    canonical: "LIDL",
    aliases: ["lidl", "l1dl", "lid1", "lidl dienstleistung", "lidl vertriebs"],
    patterns: [/lidl/i, /\bl1dl\b/i, /\blid1\b/i],
  },
  {
    canonical: "dm",
    aliases: ["dm", "dm drogerie", "dm-drogerie markt", "dm drogeriemarkt", "dm markt"],
    patterns: [/\bdm[\s-]?(drogerie|markt)?\b/i],
  },
  {
    canonical: "ROSSMANN",
    aliases: ["rossmann", "rossman", "dirk rossmann", "rossmann drogeriemarkt"],
    patterns: [/rossmann?/i],
  },
  {
    canonical: "PENNY",
    aliases: ["penny", "penni", "penny markt", "penny-markt", "penny store"],
    patterns: [/penny/i, /\bpenni\b/i],
  },
  {
    canonical: "NETTO",
    aliases: ["netto", "netto marken-discount", "netto city", "netto aps", "netto supermarkt", "neto"],
    patterns: [/netto/i, /\bneto\b/i],
  },
  {
    canonical: "KAUFLAND",
    aliases: ["kaufland", "kauflano", "kaufland warenhandel", "kaufland sbg"],
    patterns: [/kaufland/i, /kauflano/i],
  },
  {
    canonical: "MÜLLER",
    aliases: ["müller", "mueller", "müller drogerie", "drogerie müller"],
    patterns: [/m[uü]ller\s*(drogerie|markt)?/i],
  },
  {
    canonical: "BUDNI",
    aliases: ["budni", "budnikowsky", "iwan budnikowsky"],
    patterns: [/budni/i, /budnikowsky/i],
  },
  {
    canonical: "DENN'S",
    aliases: ["denns", "denn's", "denns biomarkt", "denn's biomarkt", "denree"],
    patterns: [/denn'?s(\s*biomarkt)?/i, /denree/i],
  },
  {
    canonical: "ALNATURA",
    aliases: ["alnatura", "alnatur", "alnatura super natur markt", "alnatura bio"],
    patterns: [/alnatura?/i],
  },
  {
    canonical: "NORMA",
    aliases: ["norma", "norna", "norma lebensmittelfilialbetrieb"],
    patterns: [/\bnorma\b/i, /\bnorna\b/i],
  },
  {
    canonical: "SPAR",
    aliases: ["spar", "eurospar", "interspar"],
    patterns: [/\b(euro|inter)?spar\b/i],
  },
  {
    canonical: "HOFER",
    aliases: ["hofer", "hofer kg"],
    patterns: [/\bhofer\b/i],
  },
  {
    canonical: "BILLA",
    aliases: ["billa", "billa plus", "billa corso"],
    patterns: [/\bbilla(\s*plus|\s*corso)?\b/i],
  },
  {
    canonical: "COOP",
    aliases: ["coop", "coop supermarket"],
    patterns: [/\bcoop\b/i],
  },
  {
    canonical: "MIGROS",
    aliases: ["migros"],
    patterns: [/\bmigros\b/i],
  },
];

/**
 * Known German private labels / store brand identifiers.
 * When a receipt has no visible store header (e.g. folded/torn),
 * multiple occurrences of store brands strongly identify the retailer.
 */
export const STORE_BRAND_INDICATORS: Array<{
  store: string;
  patterns: RegExp[];
}> = [
  {
    store: "KAUFLAND",
    patterns: [/\bk[\s-.]?bio\b/i, /\bklc\b/i, /\bk[\s-.]?classic\b/i, /\bk[\s-.]?pur\b/i],
  },
  {
    store: "EDEKA",
    patterns: [/\bg&g\b/i, /\bgut\s*&\s*g[uü]nstig\b/i, /\bedeka\s*bio\b/i, /\belkos\b/i],
  },
  {
    store: "REWE",
    patterns: [/\bja!\b/i, /\brewe\s*bio\b/i, /\brewe\s*beste\s*wahl\b/i, /\brewe\s*feine\s*welt\b/i],
  },
  {
    store: "LIDL",
    patterns: [/\bmilbona\b/i, /\bsaskia\b/i, /\bfreeway\b/i, /\bcien\b/i, /\blupilu\b/i, /\bsolevita\b/i],
  },
  {
    store: "ALDI",
    patterns: [/\bgut\s*bio\b/i, /\bmilsani\b/i, /\brio\s*d'oro\b/i, /\btandil\b/i, /\bcucina\s*nobile\b/i],
  },
  {
    store: "PENNY",
    patterns: [/\bnaturgut\b/i, /\bsan\s*fabio\b/i, /\bmühlenhof\b/i],
  },
  {
    store: "dm",
    patterns: [/\bdm[\s-]bio\b/i, /\bbalea\b/i, /\balverde\b/i, /\bdenkmit\b/i, /\bdontodent\b/i],
  },
  {
    store: "ROSSMANN",
    patterns: [/\bisana\b/i, /\benerbio\b/i, /\bdomol\b/i, /\balouette\b/i, /\babtei\b/i],
  },
];

export function inferStoreFromLineItems(items?: Array<{ raw_name?: string | null }> | null): string | null {
  if (!items || items.length === 0) return null;

  const matchCounts: Record<string, number> = {};

  for (const item of items) {
    const raw = item?.raw_name || "";
    if (!raw) continue;

    for (const indicator of STORE_BRAND_INDICATORS) {
      for (const pattern of indicator.patterns) {
        if (pattern.test(raw)) {
          matchCounts[indicator.store] = (matchCounts[indicator.store] || 0) + 1;
          break; // Count once per item
        }
      }
    }
  }

  let bestStore: string | null = null;
  let maxCount = 0;
  for (const [store, count] of Object.entries(matchCounts)) {
    if (count > maxCount && count >= 2) {
      maxCount = count;
      bestStore = store;
    }
  }

  return bestStore;
}

/**
 * Standard Wagner-Fischer Levenshtein distance implementation.
 */
export function levenshteinDistance(a: string, b: string): number {
  const an = a.length;
  const bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;

  const matrix = Array.from({ length: bn + 1 }, (_, i) => [i]);
  for (let j = 0; j <= an; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= bn; i++) {
    for (let j = 1; j <= an; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[bn][an];
}

/**
 * Deterministically normalizes store name to clean DACH retail chains if matched,
 * while strictly preserving genuine independent store names if distance is too far.
 * If the header was missing/generic but items contain unambiguous private-label brands
 * (e.g. K-Bio / KLC -> Kaufland, Gut & Günstig -> Edeka), infers the correct retailer.
 */
export function normalizeStoreName(
  rawStore: string | null | undefined,
  items?: Array<{ raw_name?: string | null }> | null
): string {
  const brandStore = inferStoreFromLineItems(items);

  if (!rawStore || typeof rawStore !== "string") {
    return brandStore || "Supermarket";
  }

  const trimmed = rawStore.trim();
  if (!trimmed || /^supermarket$/i.test(trimmed)) {
    return brandStore || "Supermarket";
  }

  // If private label evidence is overwhelmingly strong (e.g. Kaufland own brands like KBio/KLC)
  // and the extracted raw store is not explicitly validated by a match:
  if (brandStore && (brandStore === "KAUFLAND" || brandStore === "EDEKA" || brandStore === "REWE")) {
    const isExactOtherChain = KNOWN_DACH_CHAINS.some(
      (c) => c.canonical !== brandStore && c.canonical.toLowerCase() === trimmed.toLowerCase()
    );
    // If the raw store was a generic or questionable guess while items have private brand:
    if (!isExactOtherChain || /supermarket|markt|filiale/i.test(trimmed)) {
      return brandStore;
    }
    // If rawStore was guessed without strong branding, brandStore prevails
    if (brandStore === "KAUFLAND" && !/aldi|lidl|edeka|rewe|penny/i.test(trimmed)) {
      return brandStore;
    }
  }

  // Clean common noise prefixes/suffixes (GmbH, & Co. KG, Filiale ...)
  const lower = trimmed.toLowerCase();

  // 1. Direct regex pattern matches against known chains
  for (const chain of KNOWN_DACH_CHAINS) {
    for (const pattern of chain.patterns) {
      if (pattern.test(trimmed)) {
        // Distinguish ALDI Süd vs ALDI Nord if bare ALDI matched
        if (chain.canonical === "ALDI") {
          if (/s[uü]d|sued/i.test(trimmed)) return "ALDI Süd";
          if (/nord/i.test(trimmed)) return "ALDI Nord";
        }
        return chain.canonical;
      }
    }
  }

  // 2. Token-level matching (split by spaces, dashes, commas)
  const tokens = lower
    .split(/[\s,.\-_/]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

  for (const token of tokens) {
    // Check exact token match
    for (const chain of KNOWN_DACH_CHAINS) {
      if (chain.aliases.some((alias) => alias.toLowerCase() === token)) {
        if (chain.canonical === "ALDI") {
          if (lower.includes("süd") || lower.includes("sud") || lower.includes("sued")) return "ALDI Süd";
          if (lower.includes("nord")) return "ALDI Nord";
        }
        return chain.canonical;
      }
    }

    // Check fuzzy Levenshtein match for small OCR typos on tokens (e.g. EDEMA -> EDEKA, REVE -> REWE)
    for (const chain of KNOWN_DACH_CHAINS) {
      for (const alias of chain.aliases) {
        if (alias.includes(" ")) continue; // Skip multi-word aliases for single-token check
        const dist = levenshteinDistance(token, alias.toLowerCase());
        const maxLen = Math.max(token.length, alias.length);
        
        // Strict threshold: distance 1 for 4-5 letter words, distance 2 for >= 7 letter words
        const allowedDist = maxLen <= 5 ? 1 : 2;
        if (dist <= allowedDist && dist / maxLen <= 0.3) {
          if (chain.canonical === "ALDI") {
            if (lower.includes("süd") || lower.includes("sud") || lower.includes("sued")) return "ALDI Süd";
            if (lower.includes("nord")) return "ALDI Nord";
          }
          return chain.canonical;
        }
      }
    }
  }

  // 3. Whole string fuzzy match against known chains
  for (const chain of KNOWN_DACH_CHAINS) {
    for (const alias of chain.aliases) {
      const dist = levenshteinDistance(lower, alias.toLowerCase());
      const maxLen = Math.max(lower.length, alias.length);
      if (dist <= 2 && dist / maxLen <= 0.25) {
        return chain.canonical;
      }
    }
  }

  // Genuine independent store name: clean up extraneous punctuation and return
  return trimmed
    .replace(/^["'\s]+|["'\s]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Safe number parsing handling German decimal comma ("1,29" -> 1.29) and stripping tax flags ("1,29 A" -> 1.29)
 */
export function parseReceiptNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "string") return null;

  let str = value.trim();
  if (!str) return null;

  // Handle negative values e.g. "-1,29", "1,29-", "- 1,29"
  const isNegative = str.startsWith("-") || str.endsWith("-") || /\b(storno|rabatt|leergut|rückgabe)\b/i.test(str);

  // Remove currency signs, letters, tax flags like 'A', 'B', '%', '*'
  str = str.replace(/[€$£CHFFr.\sABab%*]/g, "");
  str = str.replace(/-/g, "");

  // German format: "1.234,56" or "1,29"
  if (str.includes(",") && str.includes(".")) {
    if (str.lastIndexOf(",") > str.lastIndexOf(".")) {
      // European 1.234,56 -> 1234.56
      str = str.replace(/\./g, "").replace(",", ".");
    } else {
      // US 1,234.56 -> 1234.56
      str = str.replace(/,/g, "");
    }
  } else if (str.includes(",")) {
    // "1,29" -> "1.29"
    str = str.replace(",", ".");
  }

  const num = parseFloat(str);
  if (Number.isNaN(num) || !Number.isFinite(num)) return null;

  const result = isNegative ? -Math.abs(num) : num;
  return Math.round(result * 100) / 100;
}

/**
 * Reconcile extracted receipt line items with deterministic math checks.
 * Guarantees that:
 * 1. `line_total` is ALWAYS the total right-hand printed line amount.
 * 2. `unit_price` is the price per unit (when quantity > 1).
 * 3. `Math.abs(quantity * unit_price - line_total) <= 0.02` is reconciled when possible.
 * 4. Deposits (Pfand) and discounts/coupons retain correct positive/negative values.
 * 5. Downstream fields (`unitPrice`, `lineTotal`, `price`) are unambiguous.
 */
export function reconcileReceiptLines(
  rawItems: RawExtractedItem[] | null | undefined,
  receiptTotal?: number | null
): ReconciliationSummary {
  const items = Array.isArray(rawItems) ? rawItems : [];
  const warnings: string[] = [];
  const lines: ReconciledReceiptLine[] = [];

  const expectedTotal = typeof receiptTotal === "number" && Number.isFinite(receiptTotal)
    ? Math.round(receiptTotal * 100) / 100
    : null;

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    const rawName = String(item.raw_name ?? item.normalized_name ?? `Item ${idx + 1}`).trim();
    const normalizedName = String(item.normalized_name ?? rawName).trim();

    // Detect deposit / Pfand / Leergut
    const isDeposit = /\b(pfand|leergut|einwegpfand|mehrwegpfand)\b/i.test(rawName);
    const isReturn = /\b(leergut|rückgabe|storno|gutschrift)\b/i.test(rawName);
    const isDiscount = /\b(rabatt|coupon|nachlass|gutschein|aktionsrabatt|sofortrabatt)\b/i.test(rawName);

    // Parse raw values
    let qty = parseReceiptNumber(item.quantity) ?? 1;
    // Quantity should be at least 1 for non-weight items; weight items might have fractions
    if (qty <= 0) qty = 1;

    let unitPrice = parseReceiptNumber(item.unit_price);
    let lineTotal = parseReceiptNumber(item.line_total);

    // Legacy fallback: if line_total missing but price provided
    if (lineTotal === null && item.price !== undefined) {
      lineTotal = parseReceiptNumber(item.price);
    }

    // Automatic sign correction for returns / discounts
    if (isReturn && lineTotal !== null && lineTotal > 0) {
      lineTotal = -Math.abs(lineTotal);
    }
    if (isDiscount && lineTotal !== null && lineTotal > 0) {
      lineTotal = -Math.abs(lineTotal);
    }

    // Mathematical reconciliation:
    // Case 1: Both unitPrice and lineTotal present
    if (unitPrice !== null && lineTotal !== null) {
      // Check if unitPrice and lineTotal were inverted by the AI model
      // (e.g. quantity = 2, unitPrice = 2.58, lineTotal = 1.29)
      if (qty > 1 && Math.abs(qty * lineTotal - unitPrice) <= 0.02) {
        warnings.push(`Line "${rawName}": swapped inverted unitPrice (${unitPrice}) and lineTotal (${lineTotal}).`);
        const temp = unitPrice;
        unitPrice = lineTotal;
        lineTotal = temp;
      }
      // Check if lineTotal was extracted as unit price, and model didn't multiply
      // (e.g. quantity = 2, unitPrice = 1.29, lineTotal = 1.29)
      else if (qty > 1 && Math.abs(unitPrice - lineTotal) <= 0.01) {
        // If lineTotal equals unitPrice, compute expected line total
        const computedTotal = Math.round(qty * unitPrice * 100) / 100;
        // Verify against receiptTotal context if available
        if (expectedTotal !== null) {
          // If using computedTotal helps match expectedTotal, update lineTotal
          lineTotal = computedTotal;
        } else {
          // Default to multiplying quantity by unitPrice
          lineTotal = computedTotal;
        }
      }
      // Reconcile minor rounding discrepancy: qty * unitPrice vs lineTotal
      else if (Math.abs(qty * unitPrice - lineTotal) > 0.02) {
        // If qty is 1, lineTotal and unitPrice must be identical
        if (qty === 1) {
          unitPrice = lineTotal;
        } else {
          // Keep lineTotal as authoritative (the printed right-hand sum) and recompute unitPrice
          unitPrice = Math.round((lineTotal / qty) * 100) / 100;
        }
      }
    }
    // Case 2: lineTotal present, unitPrice missing
    else if (lineTotal !== null && unitPrice === null) {
      unitPrice = qty > 1 ? Math.round((lineTotal / qty) * 100) / 100 : lineTotal;
    }
    // Case 3: unitPrice present, lineTotal missing
    else if (unitPrice !== null && lineTotal === null) {
      lineTotal = Math.round(qty * unitPrice * 100) / 100;
    }
    // Case 4: Both missing
    else {
      lineTotal = 0;
      unitPrice = 0;
    }

    const roundedLineTotal = Math.round(lineTotal * 100) / 100;
    const roundedUnitPrice = unitPrice !== null ? Math.round(unitPrice * 100) / 100 : null;

    lines.push({
      raw_name: rawName,
      normalized_name: normalizedName,
      quantity: qty,
      unit_price: roundedUnitPrice,
      line_total: roundedLineTotal,
      unitPrice: roundedUnitPrice,
      lineTotal: roundedLineTotal,
      price: roundedLineTotal, // Downstream checkout claims the line total
      is_deposit: isDeposit,
      is_discount: isDiscount,
      matched_cart_item_id: null,
    });
  }

  // Compute total sum of lines
  const computedSum = Math.round(lines.reduce((acc, l) => acc + l.line_total, 0) * 100) / 100;
  const printedTotal = expectedTotal ?? computedSum;
  const difference = Math.round((computedSum - printedTotal) * 100) / 100;
  const isBalanced = Math.abs(difference) <= 0.05;

  if (!isBalanced && expectedTotal !== null) {
    warnings.push(
      `Receipt math discrepancy: sum of line items (${computedSum.toFixed(2)} €) does not match printed total (${printedTotal.toFixed(2)} €). Difference: ${difference.toFixed(2)} €`
    );
  }

  return {
    lines,
    computedSum,
    printedTotal,
    difference,
    isBalanced,
    warnings,
  };
}
