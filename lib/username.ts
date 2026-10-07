import { pool } from "@/lib/db";

export const USERNAME_MIN_LENGTH = 2;
const USERNAME_MAX_LENGTH = 32;

export interface UsernameAvailability {
  /** The sanitized candidate that was actually checked. */
  username: string;
  available: boolean;
  /** Guaranteed-available alternative (only when `available` is false and the input was valid). */
  suggestion?: string;
  /** Candidate was empty / too short after sanitizing - no DB lookup was made. */
  invalid?: boolean;
}

/** Lowercase, trim, keep only a-z, 0-9, "." and "_". */
export function sanitizeUsername(raw: string): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, "")
    .slice(0, USERNAME_MAX_LENGTH);
}

/** Case-insensitive lookup (matches how login/registration compare usernames). Returns the taken subset. */
async function findTaken(candidates: string[]): Promise<Set<string>> {
  if (candidates.length === 0) return new Set();
  const { rows } = await pool.query<{ username: string }>(
    `SELECT LOWER(username) AS username FROM users WHERE LOWER(username) = ANY($1::text[])`,
    [candidates]
  );
  return new Set(rows.map((r) => r.username));
}

/**
 * Ordered, human-looking fallbacks: finn2, finn3, finn_wg, finnk, then finn4..finn9.
 * Bare trailing "_" / "." variants are deliberately last: they read as typos, not handles.
 */
function buildSuggestionCandidates(base: string): string[] {
  const root = base.replace(/[._]+$/, "") || base;
  const ordered = [
    `${root}2`,
    `${root}3`,
    `${root}_wg`,
    `${root}k`,
    ...[4, 5, 6, 7, 8, 9].map((n) => `${root}${n}`),
    `${root}_`,
    `${root}.`,
  ];
  return [...new Set(ordered)].filter((c) => c.length <= USERNAME_MAX_LENGTH);
}

/**
 * Checks whether a username is free; if not, returns a suggestion that has itself
 * been verified against the database (one batched query, no race-prone loops).
 */
export async function checkUsernameAvailability(candidate: string): Promise<UsernameAvailability> {
  const username = sanitizeUsername(candidate);
  if (username.length < USERNAME_MIN_LENGTH) {
    return { username, available: false, invalid: true };
  }

  const suggestions = buildSuggestionCandidates(username);
  const taken = await findTaken([username, ...suggestions]);

  if (!taken.has(username)) {
    return { username, available: true };
  }

  const suggestion = suggestions.find((s) => !taken.has(s));
  return { username, available: false, suggestion };
}
