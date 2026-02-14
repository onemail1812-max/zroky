/**
 * Email Provider Interface
 *
 * Unified interface for email operations across all providers.
 * Implementations must normalize provider-specific responses to these models.
 */
import type { Thread, Message, Draft, Label, Folder, Participant, DraftAttachment, SyncResult } from '../models/index.js';
export interface ListThreadsOptions {
    labelIds?: string[];
    folderIds?: string[];
    query?: string;
    maxResults?: number;
    pageToken?: string;
    includeBody?: boolean;
}
export interface GetThreadOptions {
    includeBody?: boolean;
    format?: 'full' | 'metadata' | 'minimal';
}
export interface SearchOptions {
    query: string;
    after?: Date;
    before?: Date;
    from?: string;
    to?: string;
    isRead?: boolean;
    hasAttachment?: boolean;
    labelIds?: string[];
    folderIds?: string[];
    maxResults?: number;
    pageToken?: string;
}
export interface ListMessagesOptions {
    threadId?: string;
    labelIds?: string[];
    folderIds?: string[];
    maxResults?: number;
    pageToken?: string;
    includeBody?: boolean;
}
export interface CreateDraftOptions {
    to: Participant[];
    cc?: Participant[];
    bcc?: Participant[];
    subject: string;
    bodyText?: string;
    bodyHtml?: string;
    replyToMessageId?: string;
    threadId?: string;
    attachments?: DraftAttachment[];
}
export interface UpdateDraftOptions {
    to?: Participant[];
    cc?: Participant[];
    bcc?: Participant[];
    subject?: string;
    bodyText?: string;
    bodyHtml?: string;
    attachments?: DraftAttachment[];
}
export interface ApplyLabelsOptions {
    messageIds: string[];
    addLabelIds?: string[];
    removeLabelIds?: string[];
}
export interface ArchiveOptions {
    messageIds: string[];
}
export interface SendDraftOptions {
}
export interface IncrementalSyncOptions {
    historyId?: string;
    deltaLink?: string;
    historyTypes?: ('messageAdded' | 'messageDeleted' | 'labelAdded' | 'labelRemoved')[];
    labelId?: string;
}
export interface HistoryChange {
    type: 'added' | 'deleted' | 'labelAdded' | 'labelRemoved';
    messageId: string;
    threadId?: string;
    labelIds?: string[];
}
export interface EmailProvider {
    /**
     * Provider identifier
     */
    readonly providerId: 'google' | 'microsoft';
    /**
     * List email threads with optional filtering
     */
    listThreads(accountId: string, options?: ListThreadsOptions): Promise<SyncResult<Thread>>;
    /**
     * Get a single thread with all messages
     */
    getThread(accountId: string, threadId: string, options?: GetThreadOptions): Promise<Thread>;
    /**
     * Search threads
     */
    searchThreads(accountId: string, options: SearchOptions): Promise<SyncResult<Thread>>;
    /**
     * List messages
     */
    listMessages(accountId: string, options?: ListMessagesOptions): Promise<SyncResult<Message>>;
    /**
     * Get a single message
     */
    getMessage(accountId: string, messageId: string, options?: {
        format?: 'full' | 'metadata';
    }): Promise<Message>;
    /**
     * Search messages
     */
    searchMessages(accountId: string, options: SearchOptions): Promise<SyncResult<Message>>;
    /**
     * List all drafts
     */
    listDrafts(accountId: string, maxResults?: number, pageToken?: string): Promise<SyncResult<Draft>>;
    /**
     * Get a single draft
     */
    getDraft(accountId: string, draftId: string): Promise<Draft>;
    /**
     * Create a new draft
     */
    createDraft(accountId: string, options: CreateDraftOptions): Promise<Draft>;
    /**
     * Update an existing draft
     */
    updateDraft(accountId: string, draftId: string, options: UpdateDraftOptions): Promise<Draft>;
    /**
     * Delete a draft
     */
    deleteDraft(accountId: string, draftId: string): Promise<void>;
    /**
     * Send a draft (requires approval)
     * This is a high-risk action that requires approval_id
     */
    sendDraft(accountId: string, draftId: string, options?: SendDraftOptions): Promise<Message>;
    /**
     * List all labels (Gmail) or folders (Microsoft)
     */
    listLabels(accountId: string): Promise<Label[]>;
    /**
     * List all folders (Microsoft only, alias for listLabels for Gmail)
     */
    listFolders(accountId: string): Promise<Folder[]>;
    /**
     * Create a label/folder
     */
    createLabel(accountId: string, name: string, options?: {
        color?: string;
        parentId?: string;
    }): Promise<Label>;
    /**
     * Delete a label/folder
     */
    deleteLabel(accountId: string, labelId: string): Promise<void>;
    /**
     * Apply labels to messages
     */
    applyLabels(accountId: string, options: ApplyLabelsOptions): Promise<void>;
    /**
     * Archive messages
     */
    archiveMessages(accountId: string, options: ArchiveOptions): Promise<void>;
    /**
     * Mark messages as read/unread
     */
    setReadStatus(accountId: string, messageIds: string[], isRead: boolean): Promise<void>;
    /**
     * Move messages to trash
     */
    trashMessages(accountId: string, messageIds: string[]): Promise<void>;
    /**
     * Get incremental changes since last sync
     */
    getIncrementalChanges(accountId: string, options: IncrementalSyncOptions): Promise<{
        changes: HistoryChange[];
        newHistoryId?: string;
        newDeltaLink?: string;
    }>;
    /**
     * Set up webhook/push notifications
     */
    setupWatch(accountId: string, options: {
        webhookUrl: string;
        labelIds?: string[];
    }): Promise<{
        historyId?: string;
        expiration: Date;
        resourceId?: string;
    }>;
    /**
     * Stop webhook/push notifications
     */
    stopWatch(accountId: string, resourceId?: string): Promise<void>;
}
//# sourceMappingURL=email-provider.d.ts.map