/**
 * Microsoft Graph Mail Adapter
 *
 * Implements EmailProvider interface for Microsoft Graph API (Outlook/Microsoft 365).
 */
import type { EmailProvider, ListThreadsOptions, GetThreadOptions, SearchOptions, ListMessagesOptions, CreateDraftOptions, UpdateDraftOptions, ApplyLabelsOptions, ArchiveOptions, IncrementalSyncOptions, HistoryChange } from '../../interfaces/email-provider.js';
import type { Thread, Message, Draft, Label, Folder, SyncResult } from '../../models/index.js';
import { TokenService } from '../../services/token.service.js';
export declare class MicrosoftGraphMailAdapter implements EmailProvider {
    readonly providerId: "microsoft";
    private readonly tokenService;
    constructor(tokenService: TokenService);
    listThreads(accountId: string, options?: ListThreadsOptions): Promise<SyncResult<Thread>>;
    getThread(accountId: string, threadId: string, options?: GetThreadOptions): Promise<Thread>;
    searchThreads(accountId: string, options: SearchOptions): Promise<SyncResult<Thread>>;
    listMessages(accountId: string, options?: ListMessagesOptions): Promise<SyncResult<Message>>;
    getMessage(accountId: string, messageId: string, options?: {
        format?: 'full' | 'metadata';
    }): Promise<Message>;
    searchMessages(accountId: string, options: SearchOptions): Promise<SyncResult<Message>>;
    listDrafts(accountId: string, maxResults?: number, pageToken?: string): Promise<SyncResult<Draft>>;
    getDraft(accountId: string, draftId: string): Promise<Draft>;
    createDraft(accountId: string, options: CreateDraftOptions): Promise<Draft>;
    updateDraft(accountId: string, draftId: string, options: UpdateDraftOptions): Promise<Draft>;
    deleteDraft(accountId: string, draftId: string): Promise<void>;
    sendDraft(accountId: string, draftId: string): Promise<Message>;
    listLabels(accountId: string): Promise<Label[]>;
    listFolders(accountId: string): Promise<Folder[]>;
    createLabel(accountId: string, name: string, options?: {
        color?: string;
        parentId?: string;
    }): Promise<Label>;
    deleteLabel(accountId: string, labelId: string): Promise<void>;
    applyLabels(accountId: string, options: ApplyLabelsOptions): Promise<void>;
    archiveMessages(accountId: string, options: ArchiveOptions): Promise<void>;
    setReadStatus(accountId: string, messageIds: string[], isRead: boolean): Promise<void>;
    trashMessages(accountId: string, messageIds: string[]): Promise<void>;
    getIncrementalChanges(accountId: string, options: IncrementalSyncOptions): Promise<{
        changes: HistoryChange[];
        newDeltaLink?: string;
    }>;
    setupWatch(accountId: string, options: {
        webhookUrl: string;
        labelIds?: string[];
    }): Promise<{
        historyId?: string;
        expiration: Date;
        resourceId?: string;
    }>;
    stopWatch(accountId: string, resourceId?: string): Promise<void>;
    private getClient;
    private normalizeThread;
    private normalizeMessage;
    private normalizeDraft;
    private normalizeFolder;
    private normalizeError;
}
//# sourceMappingURL=graph-mail.adapter.d.ts.map