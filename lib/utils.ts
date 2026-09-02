import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Capitalizes names and words (e.g. "@lisa" -> "Lisa", "lisa smith" -> "Lisa Smith").
 */
export function capitalize(str?: string | null): string {
  if (!str) return "";
  const cleaned = str.startsWith("@") ? str.slice(1) : str;
  return cleaned
    .split(" ")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ""))
    .join(" ");
}

export function formatCurrency(amount: number | string, currency = 'EUR') {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currency || 'EUR',
  }).format(isNaN(num) ? 0 : num);
}

/**
 * Days left before a refunded checkout's receipt is auto-deleted by the
 * cleanup cron (which runs 30 days after `refunded_at`). Clamped at 0.
 */
export function daysUntilReceiptAutoDelete(refundedAt: string | Date): number {
  const daysElapsed = (Date.now() - new Date(refundedAt).getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.ceil(30 - daysElapsed));
}
