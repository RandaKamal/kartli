/**
 * Supported currency definitions for kartli.
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
