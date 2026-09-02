import { pool } from "@/lib/db";
import { hashPasswordAsync, verifyPasswordAsync } from "@/lib/password";
import type { DbUser } from "@/types";

export interface RegisterUserInput {
  username: string;
  password: string;
}

/**
 * Registers a new user account in PostgreSQL using username and password.
 *
 * @param input - Registration payload including username and password.
 * @returns The created user object.
 */
export async function registerUser(input: RegisterUserInput): Promise<DbUser> {
  const username = input.username?.trim();
  const password = input.password;

  if (!username || username.length < 2) {
    throw new Error("Username must be at least 2 characters long.");
  }

  if (!password || password.length < 6) {
    throw new Error("Password must be at least 6 characters long.");
  }

  // Check if username already exists
  const existingSql = `
    SELECT id FROM users WHERE LOWER(username) = LOWER($1)
  `;
  const existing = await pool.query(existingSql, [username]);
  if (existing.rows.length > 0) {
    throw new Error("Username is already taken. Please choose another.");
  }

  const passwordHash = await hashPasswordAsync(password);

  try {
    const insertSql = `
      INSERT INTO users (username, password_hash, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW())
      RETURNING id, username, password_hash, created_at, updated_at
    `;
    const { rows } = await pool.query<DbUser>(insertSql, [username, passwordHash]);
    return rows[0];
  } catch (error: any) {
    if (error?.code === "23505") {
      throw new Error("Username is already taken. Please choose another.");
    }
    throw error;
  }
}

/**
 * Verifies username and password credentials.
 *
 * @param username - User's username.
 * @param password - Plaintext password.
 * @returns User object if verified, or null if invalid.
 */
export async function verifyUserCredentials(
  username: string,
  password: string
): Promise<{ id: string; username: string; preferred_currency: string } | null> {
  const cleanUsername = username?.trim();
  if (!cleanUsername || !password) {
    return null;
  }

  const sql = `
    SELECT id, username, password_hash, preferred_currency
    FROM users
    WHERE LOWER(username) = LOWER($1)
    LIMIT 1
  `;
  const { rows } = await pool.query<{
    id: string;
    username: string;
    password_hash: string;
    preferred_currency?: string | null;
  }>(sql, [cleanUsername]);

  if (rows.length === 0) {
    return null;
  }

  const user = rows[0];
  const isValid = await verifyPasswordAsync(password, user.password_hash);
  if (!isValid) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    preferred_currency: user.preferred_currency || "EUR",
  };
}

/**
 * Retrieves a user by their username.
 *
 * @param username - User username.
 * @returns User record or null.
 */
export async function getUserByUsername(username: string): Promise<DbUser | null> {
  const cleanUsername = username?.trim();
  if (!cleanUsername) return null;

  const sql = `
    SELECT id, username, password_hash, preferred_currency, created_at, updated_at
    FROM users
    WHERE LOWER(username) = LOWER($1)
  `;
  const { rows } = await pool.query<DbUser>(sql, [cleanUsername]);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Retrieves a user by their UUID.
 *
 * @param id - User UUID.
 * @returns User record or null.
 */
export async function getUserById(id: string): Promise<DbUser | null> {
  const sql = `
    SELECT id, username, password_hash, preferred_currency, created_at, updated_at
    FROM users
    WHERE id = $1
  `;
  const { rows } = await pool.query<DbUser>(sql, [id]);
  return rows.length > 0 ? rows[0] : null;
}
