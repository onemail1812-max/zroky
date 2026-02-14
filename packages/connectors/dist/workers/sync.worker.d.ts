/**
 * Sync Worker
 *
 * Background worker for incremental sync of emails and calendars.
 * Uses BullMQ for job processing with Redis.
 */
export declare const QUEUE_NAMES: {
    EMAIL_SYNC: string;
    CALENDAR_SYNC: string;
    WEBHOOK_PROCESS: string;
    SUBSCRIPTION_RENEW: string;
};
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
export declare class SyncWorker {
    private readonly redis;
    private readonly tokenService;
    private readonly auditService;
    private readonly gmailAdapter;
    private readonly googleCalendarAdapter;
    private readonly msMailAdapter;
    private readonly msCalendarAdapter;
    private emailQueue;
    private calendarQueue;
    private webhookQueue;
    private emailWorker;
    private calendarWorker;
    private webhookWorker;
    constructor(redisUrl: string);
    private initQueues;
    private initWorkers;
    private processEmailSync;
    private processCalendarSync;
    private processWebhook;
    private processGoogleWebhook;
    private processMicrosoftWebhook;
    /**
     * Queue an email sync job
     */
    queueEmailSync(accountId: string, tenantId: string, type?: 'full' | 'incremental'): Promise<void>;
    /**
     * Queue a calendar sync job
     */
    queueCalendarSync(accountId: string, tenantId: string, type?: 'full' | 'incremental', calendarId?: string): Promise<void>;
    /**
     * Queue a webhook for processing
     */
    queueWebhook(provider: 'google' | 'microsoft', payload: Record<string, unknown>): Promise<void>;
    /**
     * Shutdown workers gracefully
     */
    shutdown(): Promise<void>;
}
export declare function getSyncWorker(): SyncWorker;
export declare function shutdownSyncWorker(): Promise<void>;
//# sourceMappingURL=sync.worker.d.ts.map