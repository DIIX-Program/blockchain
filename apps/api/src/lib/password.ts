import bcrypt from 'bcryptjs';

/**
 * Number of bcrypt salt rounds. Kept consistent with the seed script
 * (which also uses bcryptjs with 10 rounds) so seed and runtime hashes
 * are comparable.
 */
const SALT_ROUNDS = 10;

/**
 * Salts and hashes a plaintext password using bcrypt.
 * Returns the full hash string (includes salt + rounds).
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compares a plaintext password against a stored bcrypt hash.
 * Returns true on match, false otherwise. Never throws on mismatch.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
