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
export interface EncryptedData {
    ciphertext: string;
    iv: string;
    authTag: string;
    keyVersion: number;
    keyId: string;
}
export interface EncryptionKeyData {
    key: Buffer;
    keyId: string;
    version: number;
}
/**
 * Generate a new DEK for a tenant
 */
export declare function generateDataKey(): Buffer;
/**
 * Encrypt a DEK with the master KEK
 */
export declare function encryptDataKey(dek: Buffer): string;
/**
 * Decrypt a DEK with the master KEK
 */
export declare function decryptDataKey(encryptedDek: string): Buffer;
/**
 * Encrypt sensitive data (like OAuth tokens)
 */
export declare function encryptData(plaintext: string, dek: Buffer, keyId: string, keyVersion: number): EncryptedData;
/**
 * Decrypt sensitive data
 */
export declare function decryptData(encryptedData: EncryptedData, dek: Buffer): string;
/**
 * Encrypt a token string to a single storable string
 * Format: version:keyId:iv:authTag:ciphertext
 */
export declare function encryptToken(token: string, dek: Buffer, keyId: string, keyVersion?: number): string;
/**
 * Decrypt a token from the stored format
 */
export declare function decryptToken(encryptedString: string, dek: Buffer): {
    token: string;
    keyVersion: number;
    keyId: string;
};
/**
 * Re-encrypt data with a new key version
 * Used during key rotation
 */
export declare function rotateEncryption(encryptedString: string, oldDek: Buffer, newDek: Buffer, newKeyId: string, newKeyVersion: number): string;
/**
 * Timing-safe comparison to prevent timing attacks
 */
export declare function secureCompare(a: string, b: string): boolean;
/**
 * Create a deterministic hash for idempotency keys
 */
export declare function createHash(data: string): string;
/**
 * Create a short hash (first 16 chars)
 */
export declare function createShortHash(data: string): string;
//# sourceMappingURL=encryption.service.d.ts.map