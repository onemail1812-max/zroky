/**
 * Token Service - OAuth Token Management
 * 
 * Handles:
 * - Secure token storage with encryption
 * - Token refresh with distributed locking
 * - Token validation and expiry checking
 */

import { PrismaClient } from '../generated/prisma/index.js';
import { Redis } from 'ioredis';
import {
    encryptToken,
    decryptToken,
    generateDataKey,
    encryptDataKey,
    decryptDataKey
} from './encryption.service.js';
import { logger } from '../utils/logger.js';

// ============================================
// TYPES
// ============================================

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
    isNearExpiry: boolean; // Within 5 minutes
}

// ============================================
// TOKEN SERVICE CLASS
// ============================================

export class TokenService {
    private readonly prisma: PrismaClient;
    private readonly redis: Redis;

    // Cache DEKs in memory for performance (scoped per tenant)
    private readonly dekCache: Map<string, { key: Buffer; expiresAt: number }> = new Map();
    private readonly DEK_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    constructor(prisma: PrismaClient, redis: Redis) {
        this.prisma = prisma;
        this.redis = redis;
    }

    /**
     * Store OAuth tokens securely
     */
    async storeTokens(
        accountId: string,
        tenantId: string,
        tokens: TokenData
    ): Promise<void> {
        const log = logger.child({ accountId, tenantId, operation: 'storeTokens' });

        try {
            // Get or create DEK for tenant
            const { key: dek, keyId, version } = await this.getOrCreateDek(tenantId);

            // Encrypt tokens
            const accessTokenEnc = encryptToken(tokens.accessToken, dek, keyId, version);
            const refreshTokenEnc = encryptToken(tokens.refreshToken, dek, keyId, version);

            // Upsert token record
            await this.prisma.oAuthToken.upsert({
                where: { accountId },
                create: {
                    accountId,
                    accessTokenEnc,
                    refreshTokenEnc,
                    accessTokenExpiresAt: tokens.expiresAt,
                    scope: tokens.scope,
                    tokenType: tokens.tokenType,
                    keyVersion: version,
                    encryptionKeyId: keyId
                },
                update: {
                    accessTokenEnc,
                    refreshTokenEnc,
                    accessTokenExpiresAt: tokens.expiresAt,
                    scope: tokens.scope,
                    tokenType: tokens.tokenType,
                    keyVersion: version,
                    encryptionKeyId: keyId
                }
            });

            log.info('Tokens stored successfully');
        } catch (error) {
            log.error({ error }, 'Failed to store tokens');
            throw error;
        }
    }

    /**
     * Retrieve and decrypt tokens
     */
    async getTokens(accountId: string, tenantId: string): Promise<DecryptedTokens | null> {
        const log = logger.child({ accountId, tenantId, operation: 'getTokens' });

        try {
            const tokenRecord = await this.prisma.oAuthToken.findUnique({
                where: { accountId }
            });

            if (!tokenRecord) {
                log.debug('No token record found');
                return null;
            }

            // Get DEK
            const dek = await this.getDek(tenantId, tokenRecord.keyVersion);

            if (!dek) {
                log.error('DEK not found for key version');
                throw new Error('Encryption key not found');
            }

            // Decrypt tokens
            const { token: accessToken } = decryptToken(tokenRecord.accessTokenEnc, dek);
            const { token: refreshToken } = decryptToken(tokenRecord.refreshTokenEnc, dek);

            const now = new Date();
            const expiresAt = tokenRecord.accessTokenExpiresAt;
            const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

            return {
                accessToken,
                refreshToken,
                expiresAt,
                isExpired: now >= expiresAt,
                isNearExpiry: now >= new Date(expiresAt.getTime() - 5 * 60 * 1000)
            };
        } catch (error) {
            log.error({ error }, 'Failed to get tokens');
            throw error;
        }
    }

    /**
     * Refresh tokens with distributed lock to prevent race conditions
     */
    async refreshTokensWithLock(
        accountId: string,
        tenantId: string,
        refreshFn: (refreshToken: string) => Promise<TokenData>
    ): Promise<DecryptedTokens> {
        const log = logger.child({ accountId, tenantId, operation: 'refreshTokens' });

        const lockKey = `token_refresh:${accountId}`;
        const lockValue = `${Date.now()}:${Math.random()}`;
        const lockTtl = 30; // 30 seconds

        try {
            // Try to acquire lock
            const acquired = await this.redis.set(lockKey, lockValue, 'EX', lockTtl, 'NX');

            if (!acquired) {
                // Another process is refreshing, wait and retry
                log.debug('Lock not acquired, waiting for refresh to complete');
                await this.waitForRefresh(accountId, tenantId);

                const tokens = await this.getTokens(accountId, tenantId);
                if (!tokens) {
                    throw new Error('Failed to get tokens after refresh');
                }
                return tokens;
            }

            try {
                // Get current tokens
                const currentTokens = await this.getTokens(accountId, tenantId);

                if (!currentTokens) {
                    throw new Error('No tokens to refresh');
                }

                // Check if still needs refresh (might have been refreshed by another process)
                if (!currentTokens.isNearExpiry && !currentTokens.isExpired) {
                    log.debug('Tokens still valid, skipping refresh');
                    return currentTokens;
                }

                // Perform refresh
                log.info('Refreshing tokens');
                const newTokens = await refreshFn(currentTokens.refreshToken);

                // Store new tokens
                await this.storeTokens(accountId, tenantId, newTokens);

                // Return decrypted tokens
                return {
                    accessToken: newTokens.accessToken,
                    refreshToken: newTokens.refreshToken,
                    expiresAt: newTokens.expiresAt,
                    isExpired: false,
                    isNearExpiry: false
                };
            } finally {
                // Release lock (only if we still own it)
                const currentValue = await this.redis.get(lockKey);
                if (currentValue === lockValue) {
                    await this.redis.del(lockKey);
                }
            }
        } catch (error) {
            log.error({ error }, 'Token refresh failed');
            throw error;
        }
    }

    /**
     * Revoke tokens (delete from storage)
     */
    async revokeTokens(accountId: string): Promise<void> {
        const log = logger.child({ accountId, operation: 'revokeTokens' });

        try {
            await this.prisma.oAuthToken.delete({
                where: { accountId }
            });

            log.info('Tokens revoked');
        } catch (error) {
            log.error({ error }, 'Failed to revoke tokens');
            throw error;
        }
    }

    // ==========================================
    // PRIVATE METHODS
    // ==========================================

    /**
     * Get or create a DEK for a tenant
     */
    private async getOrCreateDek(
        tenantId: string
    ): Promise<{ key: Buffer; keyId: string; version: number }> {
        // Check cache first
        const cacheKey = `dek:${tenantId}`;
        const cached = this.dekCache.get(cacheKey);

        if (cached && cached.expiresAt > Date.now()) {
            // Get latest version from DB to get keyId
            const keyRecord = await this.prisma.encryptionKey.findFirst({
                where: { tenantId, status: 'ACTIVE' },
                orderBy: { version: 'desc' }
            });

            if (keyRecord) {
                return { key: cached.key, keyId: keyRecord.id, version: keyRecord.version };
            }
        }

        // Find active key for tenant
        let keyRecord = await this.prisma.encryptionKey.findFirst({
            where: { tenantId, status: 'ACTIVE' },
            orderBy: { version: 'desc' }
        });

        if (!keyRecord) {
            // Create new DEK for tenant
            const newDek = generateDataKey();
            const encryptedDek = encryptDataKey(newDek);

            keyRecord = await this.prisma.encryptionKey.create({
                data: {
                    tenantId,
                    version: 1,
                    keyEncrypted: encryptedDek,
                    status: 'ACTIVE'
                }
            });

            // Cache the DEK
            this.dekCache.set(cacheKey, {
                key: newDek,
                expiresAt: Date.now() + this.DEK_CACHE_TTL
            });

            return { key: newDek, keyId: keyRecord.id, version: keyRecord.version };
        }

        // Decrypt existing DEK
        const dek = decryptDataKey(keyRecord.keyEncrypted);

        // Cache it
        this.dekCache.set(cacheKey, {
            key: dek,
            expiresAt: Date.now() + this.DEK_CACHE_TTL
        });

        return { key: dek, keyId: keyRecord.id, version: keyRecord.version };
    }

    /**
     * Get DEK for a specific version (for decryption)
     */
    private async getDek(tenantId: string, version: number): Promise<Buffer | null> {
        const keyRecord = await this.prisma.encryptionKey.findUnique({
            where: {
                tenantId_version: { tenantId, version }
            }
        });

        if (!keyRecord) {
            return null;
        }

        return decryptDataKey(keyRecord.keyEncrypted);
    }

    /**
     * Wait for another process to complete token refresh
     */
    private async waitForRefresh(
        accountId: string,
        tenantId: string,
        maxWait: number = 5000
    ): Promise<void> {
        const startTime = Date.now();
        const checkInterval = 100;

        while (Date.now() - startTime < maxWait) {
            const tokens = await this.getTokens(accountId, tenantId);

            if (tokens && !tokens.isExpired && !tokens.isNearExpiry) {
                return;
            }

            await new Promise(resolve => setTimeout(resolve, checkInterval));
        }
    }
}
