/**
 * Sync Worker
 *
 * Background worker for incremental sync of emails and calendars.
 * Uses BullMQ for job processing with Redis.
 */
import { Worker, Queue } from 'bullmq';
import Redis from 'ioredis';
import { prisma } from '../lib/prisma.js';
import { TokenService } from '../services/token.service.js';
import { AuditService } from '../services/audit.service.js';
import { GoogleGmailAdapter } from '../adapters/google/gmail.adapter.js';
import { GoogleCalendarAdapter } from '../adapters/google/calendar.adapter.js';
import { MicrosoftGraphMailAdapter } from '../adapters/microsoft/graph-mail.adapter.js';
import { MicrosoftGraphCalendarAdapter } from '../adapters/microsoft/graph-calendar.adapter.js';
import { logger, startTimer, generateCorrelationId } from '../utils/logger.js';
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
// SYNC WORKER CLASS
// ============================================
export class SyncWorker {
    redis;
    tokenService;
    auditService;
    gmailAdapter;
    googleCalendarAdapter;
    msMailAdapter;
    msCalendarAdapter;
    emailQueue;
    calendarQueue;
    webhookQueue;
    emailWorker;
    calendarWorker;
    webhookWorker;
    constructor(redisUrl) {
        this.redis = new Redis(redisUrl, { maxRetriesPerRequest: null });
        this.tokenService = new TokenService(prisma, this.redis);
        this.auditService = new AuditService(prisma);
        this.gmailAdapter = new GoogleGmailAdapter(this.tokenService);
        this.googleCalendarAdapter = new GoogleCalendarAdapter(this.tokenService);
        this.msMailAdapter = new MicrosoftGraphMailAdapter(this.tokenService);
        this.msCalendarAdapter = new MicrosoftGraphCalendarAdapter(this.tokenService);
        this.initQueues();
        this.initWorkers();
    }
    // ==========================================
    // QUEUE INITIALIZATION
    // ==========================================
    initQueues() {
        const connection = { connection: this.redis };
        this.emailQueue = new Queue(QUEUE_NAMES.EMAIL_SYNC, connection);
        this.calendarQueue = new Queue(QUEUE_NAMES.CALENDAR_SYNC, connection);
        this.webhookQueue = new Queue(QUEUE_NAMES.WEBHOOK_PROCESS, connection);
        logger.info('Sync queues initialized');
    }
    // ==========================================
    // WORKER INITIALIZATION
    // ==========================================
    initWorkers() {
        const connection = { connection: this.redis };
        // Email sync worker
        this.emailWorker = new Worker(QUEUE_NAMES.EMAIL_SYNC, async (job) => {
            await this.processEmailSync(job);
        }, {
            ...connection,
            concurrency: 5,
            limiter: {
                max: 10,
                duration: 1000
            }
        });
        this.emailWorker.on('completed', (job) => {
            logger.info({ jobId: job.id }, 'Email sync completed');
        });
        this.emailWorker.on('failed', (job, error) => {
            logger.error({ jobId: job?.id, error }, 'Email sync failed');
        });
        // Calendar sync worker
        this.calendarWorker = new Worker(QUEUE_NAMES.CALENDAR_SYNC, async (job) => {
            await this.processCalendarSync(job);
        }, {
            ...connection,
            concurrency: 5,
            limiter: {
                max: 10,
                duration: 1000
            }
        });
        this.calendarWorker.on('completed', (job) => {
            logger.info({ jobId: job.id }, 'Calendar sync completed');
        });
        this.calendarWorker.on('failed', (job, error) => {
            logger.error({ jobId: job?.id, error }, 'Calendar sync failed');
        });
        // Webhook processor
        this.webhookWorker = new Worker(QUEUE_NAMES.WEBHOOK_PROCESS, async (job) => {
            await this.processWebhook(job);
        }, {
            ...connection,
            concurrency: 10
        });
        logger.info('Sync workers initialized');
    }
    // ==========================================
    // EMAIL SYNC
    // ==========================================
    async processEmailSync(job) {
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
                if (changes.newHistoryId || changes.newDeltaLink) {
                    await prisma.syncState.update({
                        where: { accountId },
                        data: {
                            emailHistoryId: changes.newHistoryId || changes.newDeltaLink,
                            lastEmailSync: new Date()
                        }
                    });
                }
                log.info({ processedCount }, 'Incremental sync complete');
            }
            else {
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
        }
        catch (error) {
            const { durationMs } = timer();
            log.error({ error, durationMs }, 'Email sync failed');
            // Update sync state with error
            await prisma.syncState.update({
                where: { accountId },
                data: {
                    emailSyncStatus: 'ERROR',
                    errorMessage: error.message
                }
            });
            throw error;
        }
    }
    // ==========================================
    // CALENDAR SYNC
    // ==========================================
    async processCalendarSync(job) {
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
                        calendarSyncToken: changes.nextSyncToken,
                        calendarDeltaLink: changes.nextDeltaLink,
                        lastCalendarSync: new Date()
                    }
                });
                log.info({
                    eventsAdded: changes.events.length,
                    eventsDeleted: changes.deletedEventIds.length
                }, 'Incremental calendar sync complete');
            }
            else {
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
        }
        catch (error) {
            const { durationMs } = timer();
            log.error({ error, durationMs }, 'Calendar sync failed');
            await prisma.syncState.update({
                where: { accountId },
                data: {
                    calendarSyncStatus: 'ERROR',
                    errorMessage: error.message
                }
            });
            throw error;
        }
    }
    // ==========================================
    // WEBHOOK PROCESSING
    // ==========================================
    async processWebhook(job) {
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
            }
            else if (provider === 'microsoft') {
                await this.processMicrosoftWebhook(payload, correlationId);
            }
            log.info('Webhook processed successfully');
        }
        catch (error) {
            log.error({ error }, 'Webhook processing failed');
            throw error;
        }
    }
    async processGoogleWebhook(payload, correlationId) {
        // Google webhooks come from Pub/Sub
        const data = payload.message?.data;
        if (!data)
            return;
        const decoded = JSON.parse(Buffer.from(data, 'base64').toString());
        const { emailAddress, historyId } = decoded;
        // Find account by email
        const account = await prisma.connectedAccount.findFirst({
            where: { email: emailAddress, provider: 'GOOGLE' }
        });
        if (!account) {
            logger.warn({ emailAddress }, 'No account found for Google webhook');
            return;
        }
        // Check idempotency
        const processed = await prisma.processedEvent.findFirst({
            where: {
                accountId: account.id,
                eventId: historyId
            }
        });
        if (processed) {
            logger.debug({ historyId }, 'Event already processed');
            return;
        }
        // Queue incremental sync
        await this.emailQueue.add('email-sync', {
            accountId: account.id,
            tenantId: account.tenantId,
            type: 'incremental'
        });
        // Mark as processed
        await prisma.processedEvent.create({
            data: {
                accountId: account.id,
                eventId: historyId,
                eventType: 'gmail_history',
                idempotencyKey: `${account.id}:${historyId}`
            }
        });
    }
    async processMicrosoftWebhook(payload, correlationId) {
        const { value } = payload;
        if (!value?.length)
            return;
        for (const notification of value) {
            const { subscriptionId, changeType, resourceData } = notification;
            // Find account by subscription
            const syncState = await prisma.syncState.findFirst({
                where: {
                    OR: [
                        { emailSubscriptionId: subscriptionId },
                        { calendarSubscriptionId: subscriptionId }
                    ]
                },
                include: { account: true }
            });
            if (!syncState) {
                logger.warn({ subscriptionId }, 'No account found for Microsoft webhook');
                continue;
            }
            // Check idempotency
            const eventId = resourceData?.id || `${subscriptionId}:${Date.now()}`;
            const processed = await prisma.processedEvent.findFirst({
                where: {
                    accountId: syncState.accountId,
                    eventId
                }
            });
            if (processed)
                continue;
            // Determine sync type based on resource
            const isEmail = syncState.emailSubscriptionId === subscriptionId;
            const queue = isEmail ? this.emailQueue : this.calendarQueue;
            const jobName = isEmail ? 'email-sync' : 'calendar-sync';
            await queue.add(jobName, {
                accountId: syncState.accountId,
                tenantId: syncState.account.tenantId,
                type: 'incremental'
            });
            await prisma.processedEvent.create({
                data: {
                    accountId: syncState.accountId,
                    eventId,
                    eventType: isEmail ? 'ms_mail_notification' : 'ms_calendar_notification',
                    idempotencyKey: `${syncState.accountId}:${eventId}`
                }
            });
        }
    }
    // ==========================================
    // PUBLIC API
    // ==========================================
    /**
     * Queue an email sync job
     */
    async queueEmailSync(accountId, tenantId, type = 'incremental') {
        await this.emailQueue.add('email-sync', { accountId, tenantId, type }, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 1000
            },
            removeOnComplete: 100,
            removeOnFail: 1000
        });
    }
    /**
     * Queue a calendar sync job
     */
    async queueCalendarSync(accountId, tenantId, type = 'incremental', calendarId) {
        await this.calendarQueue.add('calendar-sync', { accountId, tenantId, type, calendarId }, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 1000
            },
            removeOnComplete: 100,
            removeOnFail: 1000
        });
    }
    /**
     * Queue a webhook for processing
     */
    async queueWebhook(provider, payload) {
        await this.webhookQueue.add('webhook', {
            provider,
            payload,
            receivedAt: new Date().toISOString()
        }, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 500
            }
        });
    }
    /**
     * Shutdown workers gracefully
     */
    async shutdown() {
        logger.info('Shutting down sync workers...');
        await this.emailWorker.close();
        await this.calendarWorker.close();
        await this.webhookWorker.close();
        await this.emailQueue.close();
        await this.calendarQueue.close();
        await this.webhookQueue.close();
        await this.redis.quit();
        logger.info('Sync workers shut down');
    }
}
// ============================================
// SINGLETON
// ============================================
let syncWorker = null;
export function getSyncWorker() {
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
//# sourceMappingURL=sync.worker.js.map