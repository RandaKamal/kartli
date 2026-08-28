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
