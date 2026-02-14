/**
 * Encryption Service - Envelope Encryption for OAuth Tokens
 * 
 * Security Architecture:
 * - KEK (Key Encryption Key): Stored in environment variable or HSM
 * - DEK (Data Encryption Key): Generated per-tenant, encrypted with KEK
 * - Data encrypted with DEK using AES-256-GCM
 * 
 * This allows key rotation without re-encrypting all data.
 */

import crypto from 'crypto';

// ============================================
// CONFIGURATION
// ============================================

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;         // 128 bits for GCM
const AUTH_TAG_LENGTH = 16;   // 128 bits
const KEY_LENGTH = 32;        // 256 bits

// ============================================
// TYPES
// ============================================

export interface EncryptedData {
    ciphertext: string;  // Base64 encoded
    iv: string;          // Base64 encoded
    authTag: string;     // Base64 encoded
    keyVersion: number;
    keyId: string;
}

export interface EncryptionKeyData {
    key: Buffer;
    keyId: string;
    version: number;
}

// ============================================
// KEY MANAGEMENT
// ============================================

/**
 * Get the master KEK from environment.
 * In production, this should come from AWS KMS, GCP KMS, or HashiCorp Vault.
 */
function getMasterKey(): Buffer {
    const kekBase64 = process.env.CONNECTOR_MASTER_KEY;

    if (!kekBase64) {
        throw new Error('CONNECTOR_MASTER_KEY environment variable is required');
    }

    const kek = Buffer.from(kekBase64, 'base64');

    if (kek.length !== KEY_LENGTH) {
        throw new Error('CONNECTOR_MASTER_KEY must be 32 bytes (256 bits) when decoded');
    }

    return kek;
}

/**
 * Generate a new DEK for a tenant
 */
export function generateDataKey(): Buffer {
    return crypto.randomBytes(KEY_LENGTH);
}

/**
 * Encrypt a DEK with the master KEK
 */
export function encryptDataKey(dek: Buffer): string {
    const kek = getMasterKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, kek, iv);

    const encrypted = Buffer.concat([
        cipher.update(dek),
        cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:ciphertext (all base64)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

/**
 * Decrypt a DEK with the master KEK
 */
export function decryptDataKey(encryptedDek: string): Buffer {
    const kek = getMasterKey();

    const parts = encryptedDek.split(':');
    if (parts.length !== 3) {
        throw new Error('Invalid encrypted DEK format');
    }

    const [ivBase64, authTagBase64, ciphertextBase64] = parts;

    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');
    const ciphertext = Buffer.from(ciphertextBase64, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, kek, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([
        decipher.update(ciphertext),
        decipher.final()
    ]);
}

// ============================================
// DATA ENCRYPTION
// ============================================

/**
 * Encrypt sensitive data (like OAuth tokens)
 */
export function encryptData(
    plaintext: string,
    dek: Buffer,
    keyId: string,
    keyVersion: number
): EncryptedData {
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, dek, iv);

    const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    return {
        ciphertext: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        keyVersion,
        keyId
    };
}

/**
 * Decrypt sensitive data
 */
export function decryptData(
    encryptedData: EncryptedData,
    dek: Buffer
): string {
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const authTag = Buffer.from(encryptedData.authTag, 'base64');
    const ciphertext = Buffer.from(encryptedData.ciphertext, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, dek, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([
        decipher.update(ciphertext),
        decipher.final()
    ]).toString('utf8');
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Encrypt a token string to a single storable string
 * Format: version:keyId:iv:authTag:ciphertext
 */
export function encryptToken(
    token: string,
    dek: Buffer,
    keyId: string,
    keyVersion: number = 1
): string {
    const encrypted = encryptData(token, dek, keyId, keyVersion);

    return [
        encrypted.keyVersion.toString(),
        encrypted.keyId,
        encrypted.iv,
        encrypted.authTag,
        encrypted.ciphertext
    ].join(':');
}

/**
 * Decrypt a token from the stored format
 */
export function decryptToken(
    encryptedString: string,
    dek: Buffer
): { token: string; keyVersion: number; keyId: string } {
    const parts = encryptedString.split(':');

    if (parts.length !== 5) {
        throw new Error('Invalid encrypted token format');
    }

    const [versionStr, keyId, iv, authTag, ciphertext] = parts;
    const keyVersion = parseInt(versionStr, 10);

    const token = decryptData(
        { ciphertext, iv, authTag, keyVersion, keyId },
        dek
    );

    return { token, keyVersion, keyId };
}

// ============================================
// KEY ROTATION SUPPORT
// ============================================

/**
 * Re-encrypt data with a new key version
 * Used during key rotation
 */
export function rotateEncryption(
    encryptedString: string,
    oldDek: Buffer,
    newDek: Buffer,
    newKeyId: string,
    newKeyVersion: number
): string {
    // Decrypt with old key
    const { token } = decryptToken(encryptedString, oldDek);

    // Re-encrypt with new key
    return encryptToken(token, newDek, newKeyId, newKeyVersion);
}

// ============================================
// SECURE COMPARISON
// ============================================

/**
 * Timing-safe comparison to prevent timing attacks
 */
export function secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
        return false;
    }

    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// ============================================
// HASHING (for idempotency keys, etc.)
// ============================================

/**
 * Create a deterministic hash for idempotency keys
 */
export function createHash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Create a short hash (first 16 chars)
 */
export function createShortHash(data: string): string {
    return createHash(data).substring(0, 16);
}
