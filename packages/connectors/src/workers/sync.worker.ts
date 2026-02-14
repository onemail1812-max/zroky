/**
 * Sync Worker
 * 
 * Background worker for incremental sync of emails and calendars.
 * Uses BullMQ for job processing with Redis.
 */

import { Worker, Queue, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { prisma } from '../lib/prisma.js';
import { TokenService } from '../services/token.service.js';
import { AuditService } from '../services/audit.service.js';
import { GoogleGmailAdapter } from '../adapters/google/gmail.adapter.js';
import { GoogleCalendarAdapter } from '../adapters/google/calendar.adapter.js';
import { MicrosoftGraphMailAdapter } from '../adapters/microsoft/graph-mail.adapter.js';
import { MicrosoftGraphCalendarAdapter } from '../adapters/microsoft/graph-calendar.adapter.js';
import { logger, startTimer, generateCorrelationId } from '../utils/logger.js';
import { MockRedis } from '../utils/mock-redis.js';

// ============================================
// QUEUE NAMES
// ============================================

export const QUEUE_NAMES = {
    EMAIL_SYNC: 'email-sync',
    CALENDAR_SYNC: 'calendar-sync',
    WEBHOOK_PROCESS: 'webhook-process',
    SUBSCRIPTION_RENEW: 'subscription-renew'
};

// ============================================
// JOB TYPES
// ============================================

export interface EmailSyncJob {
    accountId: string;
    tenantId: string;
    type: 'full' | 'incremental';
}

export interface CalendarSyncJob {
    accountId: string;
    tenantId: string;
    type: 'full' | 'incremental';
    calendarId?: string;
}

export interface WebhookProcessJob {
    provider: 'google' | 'microsoft';
    payload: Record<string, unknown>;
    receivedAt: string;
}

// ============================================
// SYNC WORKER CLASS
// ============================================

export class SyncWorker {
    private readonly redis: Redis;
    private readonly tokenService: TokenService;
    private readonly auditService: AuditService;

    private readonly gmailAdapter: GoogleGmailAdapter;
    private readonly googleCalendarAdapter: GoogleCalendarAdapter;
    private readonly msMailAdapter: MicrosoftGraphMailAdapter;
    private readonly msCalendarAdapter: MicrosoftGraphCalendarAdapter;

    private emailQueue: Queue | null = null;
    private calendarQueue: Queue | null = null;
    private webhookQueue: Queue | null = null;

    private emailWorker: Worker | null = null;
    private calendarWorker: Worker | null = null;
    private webhookWorker: Worker | null = null;

    private isMockMode = process.env.USE_MOCK_QUEUE === 'true';

    constructor(redisUrl: string) {
        if (this.isMockMode) {
            console.warn('⚠️  Running in MOCK QUEUE mode (In-Memory Processing)');
            this.redis = new MockRedis() as unknown as Redis;
        } else {
            this.redis = new Redis(redisUrl, {
                maxRetriesPerRequest: null,
                retryStrategy: (times) => Math.min(times * 50, 2000)
            });
        }

        this.tokenService = new TokenService(prisma, this.redis);
        this.auditService = new AuditService(prisma);

        this.gmailAdapter = new GoogleGmailAdapter(this.tokenService);
        this.googleCalendarAdapter = new GoogleCalendarAdapter(this.tokenService);
        this.msMailAdapter = new MicrosoftGraphMailAdapter(this.tokenService);
        this.msCalendarAdapter = new MicrosoftGraphCalendarAdapter(this.tokenService);

        if (!this.isMockMode) {
            this.initQueues();
            this.initWorkers();
        }
    }

    // ==========================================
    // QUEUE INITIALIZATION
    // ==========================================

    private initQueues() {
        const connection = { connection: this.redis };

        this.emailQueue = new Queue(QUEUE_NAMES.EMAIL_SYNC, connection);
        this.calendarQueue = new Queue(QUEUE_NAMES.CALENDAR_SYNC, connection);
        this.webhookQueue = new Queue(QUEUE_NAMES.WEBHOOK_PROCESS, connection);

        logger.info('Sync queues initialized');
    }

    // ==========================================
    // WORKER INITIALIZATION
    // ==========================================

    private initWorkers() {
        const connection = { connection: this.redis };

        // Email sync worker
        this.emailWorker = new Worker(
            QUEUE_NAMES.EMAIL_SYNC,
            async (job: Job<EmailSyncJob>) => {
                await this.processEmailSync(job);
            },
            {
                ...connection,
                concurrency: 5,
                limiter: {
                    max: 10,
                    duration: 1000
                }
            }
        );

        this.emailWorker.on('completed', (job) => {
            logger.info({ jobId: job.id }, 'Email sync completed');
        });

        this.emailWorker.on('failed', (job, error) => {
            logger.error({ jobId: job?.id, error }, 'Email sync failed');
        });

        // Calendar sync worker
        this.calendarWorker = new Worker(
            QUEUE_NAMES.CALENDAR_SYNC,
            async (job: Job<CalendarSyncJob>) => {
                await this.processCalendarSync(job);
            },
            {
                ...connection,
                concurrency: 5,
                limiter: {
                    max: 10,
                    duration: 1000
                }
            }
        );

        this.calendarWorker.on('completed', (job) => {
            logger.info({ jobId: job.id }, 'Calendar sync completed');
        });

        this.calendarWorker.on('failed', (job, error) => {
            logger.error({ jobId: job?.id, error }, 'Calendar sync failed');
        });

        // Webhook processor
        this.webhookWorker = new Worker(
            QUEUE_NAMES.WEBHOOK_PROCESS,
            async (job: Job<WebhookProcessJob>) => {
                await this.processWebhook(job);
            },
            {
                ...connection,
                concurrency: 10
            }
        );

        logger.info('Sync workers initialized');
    }

    // ==========================================
    // EMAIL SYNC
    // ==========================================

    private async processEmailSync(job: Job<EmailSyncJob>) {
        const { accountId, tenantId, type } = job.data;
        const correlationId = generateCorrelationId();
        const timer = startTimer();

        const log = logger.child({
            accountId,
            tenantId,
            type,
            correlationId,
            operation: 'emailSync'
        });

        log.info('Starting email sync');

        try {
            // Get account
            const account = await prisma.connectedAccount.findFirst({
                where: { id: accountId, tenantId }
            });

            if (!account) {
                throw new Error('Account not found');
            }

            // Get sync state
            const syncState = await prisma.syncState.findUnique({
                where: { accountId }
            });

            const adapter = account.provider === 'GOOGLE' ? this.gmailAdapter : this.msMailAdapter;

            let processedCount = 0;

            if (type === 'incremental' && syncState?.emailHistoryId) {
                // Incremental sync
                log.debug('Performing incremental sync');

                const changes = await adapter.getIncrementalChanges(accountId, {
                    historyId: syncState.emailHistoryId
                });

                processedCount = changes.changes.length;

                // Update sync state
                // Update sync state
                const newHistoryId = (changes as any).newHistoryId || (changes as any).newDeltaLink;
                if (newHistoryId) {
                    await prisma.syncState.update({
                        where: { accountId },
                        data: {
                            emailHistoryId: newHistoryId,
                            lastEmailSync: new Date()
                        }
                    });
                }

                log.info({ processedCount }, 'Incremental sync complete');
            } else {
                // Full sync - get initial state
                log.debug('Performing full sync');

                const threads = await adapter.listThreads(accountId, { maxResults: 100 });
                processedCount = threads.items.length;

                // Store initial history ID
                if (account.provider === 'GOOGLE') {
                    // For Gmail, we need to get the history ID from a watch
                    // For now, just mark as synced
                }

                await prisma.syncState.update({
                    where: { accountId },
                    data: {
                        lastEmailSync: new Date(),
                        emailSyncStatus: 'COMPLETE'
                    }
                });

                log.info({ processedCount }, 'Full sync complete');
            }

            // Update account
            await prisma.connectedAccount.update({
                where: { id: accountId },
                data: { lastSyncAt: new Date() }
            });

            const { durationMs } = timer();

            await this.auditService.logSuccess({
                tenantId,
                userId: account.userId,
                accountId,
                action: 'sync.email',
                resourceType: 'sync',
                correlationId,
                durationMs,
                metadata: { type, processedCount }
            });

            return { processedCount, durationMs };
        } catch (error) {
            const { durationMs } = timer();

            log.error({ error, durationMs }, 'Email sync failed');

            // Update sync state with error
            await prisma.syncState.update({
                where: { accountId },
                data: {
                    emailSyncStatus: 'ERROR',
                    errorMessage: (error as Error).message
                }
            });

            throw error;
        }
    }

    // ==========================================
    // CALENDAR SYNC
    // ==========================================

    private async processCalendarSync(job: Job<CalendarSyncJob>) {
        const { accountId, tenantId, type, calendarId } = job.data;
        const correlationId = generateCorrelationId();
        const timer = startTimer();

        const log = logger.child({
            accountId,
            tenantId,
            type,
            calendarId,
            correlationId,
            operation: 'calendarSync'
        });

        log.info('Starting calendar sync');

        try {
            const account = await prisma.connectedAccount.findFirst({
                where: { id: accountId, tenantId }
            });

            if (!account) {
                throw new Error('Account not found');
            }

            const syncState = await prisma.syncState.findUnique({
                where: { accountId }
            });

            const adapter = account.provider === 'GOOGLE'
                ? this.googleCalendarAdapter
                : this.msCalendarAdapter;

            let processedCount = 0;

            if (type === 'incremental' && syncState?.calendarSyncToken) {
                // Incremental sync
                const changes = await adapter.getIncrementalChanges(accountId, {
                    calendarId,
                    syncToken: syncState.calendarSyncToken,
                    deltaLink: syncState.calendarDeltaLink || undefined
                });

                processedCount = changes.events.length + changes.deletedEventIds.length;

                await prisma.syncState.update({
                    where: { accountId },
                    data: {
                        calendarSyncToken: (changes as any).nextSyncToken,
                        calendarDeltaLink: (changes as any).nextDeltaLink,
                        lastCalendarSync: new Date()
                    }
                });

                log.info({
                    eventsAdded: changes.events.length,
                    eventsDeleted: changes.deletedEventIds.length
                }, 'Incremental calendar sync complete');
            } else {
                // Full sync
                const events = await adapter.listEvents(accountId, {
                    calendarId: calendarId || undefined,
                    timeMin: new Date(),
                    timeMax: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
                    maxResults: 250
                });

                processedCount = events.items.length;

                await prisma.syncState.update({
                    where: { accountId },
                    data: {
                        calendarSyncToken: events.nextSyncToken,
                        lastCalendarSync: new Date(),
                        calendarSyncStatus: 'COMPLETE'
                    }
                });

                log.info({ processedCount }, 'Full calendar sync complete');
            }

            await prisma.connectedAccount.update({
                where: { id: accountId },
                data: { lastSyncAt: new Date() }
            });

            const { durationMs } = timer();

            await this.auditService.logSuccess({
                tenantId,
                userId: account.userId,
                accountId,
                action: 'sync.calendar',
                resourceType: 'sync',
                correlationId,
                durationMs,
                metadata: { type, processedCount }
            });

            return { processedCount, durationMs };
        } catch (error) {
            const { durationMs } = timer();

            log.error({ error, durationMs }, 'Calendar sync failed');

            await prisma.syncState.update({
                where: { accountId },
                data: {
                    calendarSyncStatus: 'ERROR',
                    errorMessage: (error as Error).message
                }
            });

            throw error;
        }
    }

    // ==========================================
    // WEBHOOK PROCESSING
    // ==========================================

    private async processWebhook(job: Job<WebhookProcessJob>) {
        const { provider, payload, receivedAt } = job.data;
        const correlationId = generateCorrelationId();

        const log = logger.child({
            provider,
            correlationId,
            operation: 'webhookProcess'
        });

        log.info('Processing webhook');

        try {
            if (provider === 'google') {
                await this.processGoogleWebhook(payload, correlationId);
            } else if (provider === 'microsoft') {
                await this.processMicrosoftWebhook(payload, correlationId);
            }

            log.info('Webhook processed successfully');
        } catch (error) {
            log.error({ error }, 'Webhook processing failed');
            throw error;
        }
    }

    private async processGoogleWebhook(payload: Record<string, unknown>, correlationId: string) {
        // ... (implementation remains same inside private method calls)
        const data = (payload.message as any)?.data as string;
        if (!data) return;

        const decoded = JSON.parse(Buffer.from(data, 'base64').toString());
        const { emailAddress, historyId } = decoded;

        // Find account by email
        const account = await prisma.connectedAccount.findFirst({
            where: { email: emailAddress, provider: 'GOOGLE' }
        });

        if (!account) return;

        // Queue incremental sync (using internal method)
        this.queueEmailSync(account.id, account.tenantId, 'incremental');

        // Mark as processed
        await prisma.processedEvent.create({
            data: {
                accountId: account.id,
                eventId: historyId,
                eventType: 'gmail_history',
                idempotencyKey: `${account.id}:${historyId}`,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
        });
    }

    private async processMicrosoftWebhook(payload: Record<string, unknown>, correlationId: string) {
        const { value } = payload as { value: Array<{ subscriptionId: string; changeType: string; resourceData: any }> };

        if (!value?.length) return;

        for (const notification of value) {
            const { subscriptionId } = notification;

            const syncState = await prisma.syncState.findFirst({
                where: {
                    OR: [
                        { emailSubscriptionId: subscriptionId },
                        { calendarSubscriptionId: subscriptionId }
                    ]
                },
                include: { account: true }
            });

            if (!syncState) continue;

            const isEmail = syncState.emailSubscriptionId === subscriptionId;

            if (isEmail) {
                this.queueEmailSync(syncState.accountId, syncState.account.tenantId, 'incremental');
            } else {
                this.queueCalendarSync(syncState.accountId, syncState.account.tenantId, 'incremental');
            }
        }
    }

    // ==========================================
    // PUBLIC API
    // ==========================================

    /**
     * Queue an email sync job
     */
    async queueEmailSync(accountId: string, tenantId: string, type: 'full' | 'incremental' = 'incremental') {
        const jobData = { accountId, tenantId, type };

        if (this.isMockMode || !this.emailQueue) {
            // Bypass queue and run immediately (async)
            this.processEmailSync({ data: jobData, id: 'mock-' + Date.now() } as any)
                .catch(err => logger.error({ err }, 'Mock email sync failed'));
            return;
        }

        await this.emailQueue.add('email-sync', jobData, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: 100,
            removeOnFail: 1000
        });
    }

    /**
     * Queue a calendar sync job
     */
    async queueCalendarSync(accountId: string, tenantId: string, type: 'full' | 'incremental' = 'incremental', calendarId?: string) {
        const jobData = { accountId, tenantId, type, calendarId };

        if (this.isMockMode || !this.calendarQueue) {
            // Bypass queue and run immediately
            this.processCalendarSync({ data: jobData, id: 'mock-' + Date.now() } as any)
                .catch(err => logger.error({ err }, 'Mock calendar sync failed'));
            return;
        }

        await this.calendarQueue.add('calendar-sync', jobData, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: 100,
            removeOnFail: 1000
        });
    }

    /**
     * Queue a webhook for processing
     */
    async queueWebhook(provider: 'google' | 'microsoft', payload: Record<string, unknown>) {
        const jobData = {
            provider,
            payload,
            receivedAt: new Date().toISOString()
        };

        if (this.isMockMode || !this.webhookQueue) {
            this.processWebhook({ data: jobData, id: 'mock-' + Date.now() } as any)
                .catch(err => logger.error({ err }, 'Mock webhook processing failed'));
            return;
        }

        await this.webhookQueue.add('webhook', jobData, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 500 }
        });
    }

    /**
     * Shutdown workers gracefully
     */
    async shutdown() {
        logger.info('Shutting down sync workers...');

        if (this.emailWorker) await this.emailWorker.close();
        if (this.calendarWorker) await this.calendarWorker.close();
        if (this.webhookWorker) await this.webhookWorker.close();

        if (this.emailQueue) await this.emailQueue.close();
        if (this.calendarQueue) await this.calendarQueue.close();
        if (this.webhookQueue) await this.webhookQueue.close();

        await this.redis.quit();

        logger.info('Sync workers shut down');
    }
}

// ============================================
// SINGLETON
// ============================================

let syncWorker: SyncWorker | null = null;

export function getSyncWorker(): SyncWorker {
    if (!syncWorker) {
        syncWorker = new SyncWorker(process.env.REDIS_URL || 'redis://localhost:6379');
    }
    return syncWorker;
}

export async function shutdownSyncWorker() {
    if (syncWorker) {
        await syncWorker.shutdown();
        syncWorker = null;
    }
}
