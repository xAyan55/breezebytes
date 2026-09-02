import crypto from 'crypto';
import { JWT_SECRET } from '../middleware/auth.js';

// Derive 32-byte AES encryption key from environment secret or JWT_SECRET
const MASTER_SECRET = process.env.SMTP_ENCRYPTION_KEY || JWT_SECRET || 'breezebytes_secret_key_2026';
const ENCRYPTION_KEY = crypto.createHash('sha256').update(MASTER_SECRET).digest();
const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypt sensitive string using AES-256-GCM.
 * Stored format: iv:authTag:encryptedHex
 */
export function encryptSecret(plainText) {
  if (!plainText) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt string encrypted with encryptSecret.
 */
export function decryptSecret(encryptedPayload) {
  if (!encryptedPayload) return '';
  try {
    const parts = encryptedPayload.split(':');
    if (parts.length !== 3) return '';
    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return '';
  }
}

/**
 * Generates a cryptographically secure 6-digit verification code.
 */
export function generateVerificationCode() {
  return String(crypto.randomInt(100000, 1000000));
}

/**
 * Generates a cryptographically secure 32-byte hex token for password reset.
 */
export function generateSecureToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Creates a SHA-256 hash of a token or code for secure database storage.
 */
export function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

export default {
  encryptSecret,
  decryptSecret,
  generateVerificationCode,
  generateSecureToken,
  hashToken,
};
