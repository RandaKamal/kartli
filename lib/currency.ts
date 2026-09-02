/**
 * Lightweight FX conversion utility for kartli.
 * Converts currencies across all major European currencies + USD with fallback rate matrix and live cached rates.
 */

export const SUPPORTED_CURRENCIES = [
  { code: "EUR", label: "EUR - Euro (€)", symbol: "€" },
  { code: "CHF", label: "CHF - Swiss Franc (CHF)", symbol: "CHF" },
  { code: "GBP", label: "GBP - British Pound (£)", symbol: "£" },
  { code: "USD", label: "USD - US Dollar ($)", symbol: "$" },
  { code: "SEK", label: "SEK - Swedish Krona (kr)", symbol: "kr" },
  { code: "NOK", label: "NOK - Norwegian Krone (kr)", symbol: "kr" },
  { code: "DKK", label: "DKK - Danish Krone (kr)", symbol: "kr" },
  { code: "PLN", label: "PLN - Polish Złoty (zł)", symbol: "zł" },
  { code: "CZK", label: "CZK - Czech Koruna (Kč)", symbol: "Kč" },
  { code: "HUF", label: "HUF - Hungarian Forint (Ft)", symbol: "Ft" },
  { code: "RON", label: "RON - Romanian Leu (lei)", symbol: "lei" },
  { code: "BGN", label: "BGN - Bulgarian Lev (лв)", symbol: "лв" },
  { code: "ISK", label: "ISK - Icelandic Króna (kr)", symbol: "kr" },
] as const;

export type SupportedCurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]["code"];

export const FALLBACK_RATES_TO_EUR: Record<string, number> = {
  EUR: 1.0,
  USD: 1.08,
  CHF: 0.96,
  GBP: 0.86,
  SEK: 11.4,
  NOK: 11.6,
  DKK: 7.46,
  PLN: 4.3,
  CZK: 25.2,
  HUF: 395.0,
  RON: 4.97,
  BGN: 1.96,
  ISK: 150.0,
};

let cachedRates: Record<string, number> = { ...FALLBACK_RATES_TO_EUR };
let lastFetched = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Optionally refresh live rates in the background from open exchange rates endpoint.
 */
export async function refreshExchangeRates(): Promise<Record<string, number>> {
  const now = Date.now();
  if (now - lastFetched < CACHE_TTL_MS && Object.keys(cachedRates).length > 4) {
    return cachedRates;
  }

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/EUR", {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.rates && typeof data.rates === "object") {
        cachedRates = { ...FALLBACK_RATES_TO_EUR, ...data.rates };
        lastFetched = now;
      }
    }
  } catch {
    // Fall back to offline static rates
  }

  return cachedRates;
}

/**
 * Converts an amount from one currency to another using base EUR exchange matrix.
 * Returns numeric value rounded to 2 decimal places.
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): number {
  if (isNaN(amount) || amount === 0) return 0;
  const from = (fromCurrency || "EUR").toUpperCase();
  const to = (toCurrency || "EUR").toUpperCase();

  if (from === to) return amount;

  const fromRate = cachedRates[from] ?? FALLBACK_RATES_TO_EUR[from] ?? 1.0;
  const toRate = cachedRates[to] ?? FALLBACK_RATES_TO_EUR[to] ?? 1.0;

  // Amount in base currency (EUR) = amount / fromRate
  const amountInEUR = amount / fromRate;
  const converted = amountInEUR * toRate;

  return Number(converted.toFixed(2));
}
