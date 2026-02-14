/**
 * Token Service - OAuth Token Management
 *
 * Handles:
 * - Secure token storage with encryption
 * - Token refresh with distributed locking
 * - Token validation and expiry checking
 */
import { PrismaClient } from '../generated/prisma/index.js';
export interface TokenData {
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    scope: string;
    tokenType: string;
}
export interface DecryptedTokens {
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    isExpired: boolean;
    isNearExpiry: boolean;
}
export declare class TokenService {
    private readonly prisma;
    private readonly redis;
    private readonly dekCache;
    private readonly DEK_CACHE_TTL;
    constructor(prisma: PrismaClient, redis: Redis);
    /**
     * Store OAuth tokens securely
     */
    storeTokens(accountId: string, tenantId: string, tokens: TokenData): Promise<void>;
    /**
     * Retrieve and decrypt tokens
     */
    getTokens(accountId: string, tenantId: string): Promise<DecryptedTokens | null>;
    /**
     * Refresh tokens with distributed lock to prevent race conditions
     */
    refreshTokensWithLock(accountId: string, tenantId: string, refreshFn: (refreshToken: string) => Promise<TokenData>): Promise<DecryptedTokens>;
    /**
     * Revoke tokens (delete from storage)
     */
    revokeTokens(accountId: string): Promise<void>;
    /**
     * Get or create a DEK for a tenant
     */
    private getOrCreateDek;
    /**
     * Get DEK for a specific version (for decryption)
     */
    private getDek;
    /**
     * Wait for another process to complete token refresh
     */
    private waitForRefresh;
}
//# sourceMappingURL=token.service.d.ts.map