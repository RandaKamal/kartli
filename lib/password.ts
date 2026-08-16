import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

/**
 * Hashes a plaintext password using bcryptjs.
 *
 * @param password - Plaintext password.
 * @returns Hashed password string.
 */
export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, SALT_ROUNDS);
}

/**
 * Asynchronously hashes a plaintext password using bcryptjs.
 *
 * @param password - Plaintext password.
 * @returns Promise resolving to hashed password string.
 */
export async function hashPasswordAsync(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verifies a plaintext password against a stored bcrypt hash.
 *
 * @param password - Plaintext password.
 * @param storedHash - Bcrypt hash from database.
 * @returns True if password matches, false otherwise.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash) return false;
  return bcrypt.compareSync(password, storedHash);
}

/**
 * Asynchronously verifies a plaintext password against a stored bcrypt hash.
 *
 * @param password - Plaintext password.
 * @param storedHash - Bcrypt hash from database.
 * @returns Promise resolving to boolean.
 */
export async function verifyPasswordAsync(
  password: string,
  storedHash: string
): Promise<boolean> {
  if (!password || !storedHash) return false;
  return await bcrypt.compare(password, storedHash);
}
