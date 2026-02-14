/**
 * Webhook Provider Interface
 * 
 * Handles incoming webhooks from providers and sync operations.
 */

import type { WebhookPayload } from '../models/index.js';

// ============================================
// WEBHOOK VALIDATION
// ============================================

export interface WebhookValidationResult {
    isValid: boolean;
    error?: string;

    // Extracted data if valid
    accountId?: string;
    eventType?: string;
    resourceId?: string;
}

// ============================================
// WEBHOOK PROVIDER INTERFACE
// ============================================

export interface WebhookProvider {
    /**
     * Provider identifier
     */
    readonly providerId: 'google' | 'microsoft';

    /**
     * Validate an incoming webhook request
     * 
     * For Google: Validates Pub/Sub JWT signature
     * For Microsoft: Validates clientState and subscription
     */
    validateWebhook(
        headers: Record<string, string>,
        body: unknown,
        expectedSecret?: string
    ): Promise<WebhookValidationResult>;

    /**
     * Parse and normalize webhook payload
     */
    parseWebhookPayload(
        headers: Record<string, string>,
        body: unknown
    ): Promise<WebhookPayload>;

    /**
     * Process a webhook and trigger sync if needed
     * Returns true if processing should continue (not a duplicate)
     */
    ingestWebhook(
        payload: WebhookPayload,
        idempotencyKey: string
    ): Promise<{
        shouldProcess: boolean;
        reason?: string;
    }>;

    /**
     * Perform incremental sync based on webhook notification
     */
    syncIncremental(
        accountId: string,
        options: {
            resourceType: 'mail' | 'calendar';
            resourceId?: string;
            changeType?: string;
        }
    ): Promise<{
        changesProcessed: number;
        newSyncState: Record<string, unknown>;
    }>;
}

// ============================================
// GOOGLE-SPECIFIC WEBHOOK TYPES
// ============================================

export interface GooglePubSubMessage {
    message: {
        data: string; // Base64 encoded
        messageId: string;
        publishTime: string;
    };
    subscription: string;
}

export interface GoogleWatchNotification {
    emailAddress: string;
    historyId: string;
}

// ============================================
// MICROSOFT-SPECIFIC WEBHOOK TYPES
// ============================================

export interface MicrosoftSubscriptionNotification {
    value: MicrosoftChangeNotification[];
}

export interface MicrosoftChangeNotification {
    subscriptionId: string;
    subscriptionExpirationDateTime: string;
    changeType: 'created' | 'updated' | 'deleted';
    resource: string;
    resourceData?: {
        '@odata.type': string;
        '@odata.id': string;
        '@odata.etag'?: string;
        id: string;
    };
    clientState?: string;
    tenantId: string;
}

// ============================================
// EXPORTS
// ============================================

export * from './email-provider.js';
export * from './calendar-provider.js';
