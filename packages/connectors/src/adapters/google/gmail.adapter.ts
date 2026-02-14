/**
 * Google Gmail Adapter
 * 
 * Implements EmailProvider interface for Gmail API.
 * Handles all email operations with proper error normalization.
 */

import { google, gmail_v1 } from 'googleapis';
import type {
    EmailProvider,
    ListThreadsOptions,
    GetThreadOptions,
    SearchOptions,
    ListMessagesOptions,
    CreateDraftOptions,
    UpdateDraftOptions,
    ApplyLabelsOptions,
    ArchiveOptions,
    IncrementalSyncOptions,
    HistoryChange
} from '../../interfaces/email-provider.js';
import type {
    Thread,
    Message,
    Draft,
    Label,
    Folder,
    Participant,
    Attachment,
    SyncResult
} from '../../models/index.js';
import { ConnectorApiError } from '../../models/index.js';
import type { TokenService, DecryptedTokens } from '../../services/token.service.js';
import { logger } from '../../utils/logger.js';

// ============================================
// TYPES
// ============================================

interface GmailClientContext {
    gmail: gmail_v1.Gmail;
    accountId: string;
    tenantId: string;
}

// ============================================
// GOOGLE GMAIL ADAPTER
// ============================================

export class GoogleGmailAdapter implements EmailProvider {
    readonly providerId = 'google' as const;

    private readonly tokenService: TokenService;

    constructor(tokenService: TokenService) {
        this.tokenService = tokenService;
    }

    // ==========================================
    // THREADS
    // ==========================================

    async listThreads(
        accountId: string,
        options: ListThreadsOptions = {}
    ): Promise<SyncResult<Thread>> {
        const ctx = await this.getClient(accountId);
        const log = logger.child({ accountId, operation: 'listThreads' });

        try {
            // Build query
            let q = '';
            if (options.labelIds?.length) {
                q = options.labelIds.map(l => `label:${l}`).join(' ');
            }
            if (options.query) {
                q += ` ${options.query}`;
            }

            const response = await ctx.gmail.users.threads.list({
                userId: 'me',
                q: q.trim() || undefined,
                maxResults: options.maxResults || 50,
                pageToken: options.pageToken,
                labelIds: options.labelIds
            });

            const threads: Thread[] = [];

            for (const thread of response.data.threads || []) {
                if (!thread.id) continue;

                // Get thread details
                const threadData = await ctx.gmail.users.threads.get({
                    userId: 'me',
                    id: thread.id,
                    format: options.includeBody ? 'full' : 'metadata',
                    metadataHeaders: ['From', 'To', 'Subject', 'Date']
                });

                threads.push(this.normalizeThread(threadData.data, accountId, options.includeBody));
            }

            log.debug({ count: threads.length }, 'Listed threads');

            return {
                items: threads,
                nextPageToken: response.data.nextPageToken || undefined,
                hasMore: !!response.data.nextPageToken
            };
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    async getThread(
        accountId: string,
        threadId: string,
        options: GetThreadOptions = {}
    ): Promise<Thread> {
        const ctx = await this.getClient(accountId);

        try {
            const response = await ctx.gmail.users.threads.get({
                userId: 'me',
                id: threadId,
                format: options.format || 'full'
            });

            return this.normalizeThread(response.data, accountId, options.includeBody);
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    async searchThreads(
        accountId: string,
        options: SearchOptions
    ): Promise<SyncResult<Thread>> {
        const ctx = await this.getClient(accountId);

        try {
            // Build Gmail search query
            let q = options.query;

            if (options.after) {
                q += ` after:${Math.floor(options.after.getTime() / 1000)}`;
            }
            if (options.before) {
                q += ` before:${Math.floor(options.before.getTime() / 1000)}`;
            }
            if (options.from) {
                q += ` from:${options.from}`;
            }
            if (options.to) {
                q += ` to:${options.to}`;
            }
            if (options.isRead !== undefined) {
                q += options.isRead ? ' is:read' : ' is:unread';
            }
            if (options.hasAttachment) {
                q += ' has:attachment';
            }

            return this.listThreads(accountId, {
                query: q,
                maxResults: options.maxResults,
                pageToken: options.pageToken
            });
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    // ==========================================
    // MESSAGES
    // ==========================================

    async listMessages(
        accountId: string,
        options: ListMessagesOptions = {}
    ): Promise<SyncResult<Message>> {
        const ctx = await this.getClient(accountId);

        try {
            let q = '';
            if (options.threadId) {
                q = `thread:${options.threadId}`;
            }

            const response = await ctx.gmail.users.messages.list({
                userId: 'me',
                q: q || undefined,
                maxResults: options.maxResults || 50,
                pageToken: options.pageToken,
                labelIds: options.labelIds
            });

            const messages: Message[] = [];

            for (const msg of response.data.messages || []) {
                if (!msg.id) continue;

                const msgData = await ctx.gmail.users.messages.get({
                    userId: 'me',
                    id: msg.id,
                    format: options.includeBody ? 'full' : 'metadata',
                    metadataHeaders: ['From', 'To', 'Cc', 'Bcc', 'Subject', 'Date', 'Message-ID', 'In-Reply-To', 'References']
                });

                messages.push(this.normalizeMessage(msgData.data, accountId, options.includeBody));
            }

            return {
                items: messages,
                nextPageToken: response.data.nextPageToken || undefined,
                hasMore: !!response.data.nextPageToken
            };
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    async getMessage(
        accountId: string,
        messageId: string,
        options: { format?: 'full' | 'metadata' } = {}
    ): Promise<Message> {
        const ctx = await this.getClient(accountId);

        try {
            const response = await ctx.gmail.users.messages.get({
                userId: 'me',
                id: messageId,
                format: options.format || 'full'
            });

            return this.normalizeMessage(response.data, accountId, options.format !== 'metadata');
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    async searchMessages(
        accountId: string,
        options: SearchOptions
    ): Promise<SyncResult<Message>> {
        const ctx = await this.getClient(accountId);

        try {
            let q = options.query;

            if (options.from) q += ` from:${options.from}`;
            if (options.to) q += ` to:${options.to}`;
            if (options.after) q += ` after:${Math.floor(options.after.getTime() / 1000)}`;
            if (options.before) q += ` before:${Math.floor(options.before.getTime() / 1000)}`;

            return this.listMessages(accountId, {
                maxResults: options.maxResults,
                pageToken: options.pageToken
            });
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    // ==========================================
    // DRAFTS
    // ==========================================

    async listDrafts(
        accountId: string,
        maxResults?: number,
        pageToken?: string
    ): Promise<SyncResult<Draft>> {
        const ctx = await this.getClient(accountId);

        try {
            const response = await ctx.gmail.users.drafts.list({
                userId: 'me',
                maxResults: maxResults || 50,
                pageToken
            });

            const drafts: Draft[] = [];

            for (const draft of response.data.drafts || []) {
                if (!draft.id) continue;

                const draftData = await ctx.gmail.users.drafts.get({
                    userId: 'me',
                    id: draft.id,
                    format: 'full'
                });

                drafts.push(this.normalizeDraft(draftData.data, accountId));
            }

            return {
                items: drafts,
                nextPageToken: response.data.nextPageToken || undefined,
                hasMore: !!response.data.nextPageToken
            };
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    async getDraft(accountId: string, draftId: string): Promise<Draft> {
        const ctx = await this.getClient(accountId);

        try {
            const response = await ctx.gmail.users.drafts.get({
                userId: 'me',
                id: draftId,
                format: 'full'
            });

            return this.normalizeDraft(response.data, accountId);
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    async createDraft(
        accountId: string,
        options: CreateDraftOptions
    ): Promise<Draft> {
        const ctx = await this.getClient(accountId);

        try {
            const raw = this.buildRawEmail(options);

            const response = await ctx.gmail.users.drafts.create({
                userId: 'me',
                requestBody: {
                    message: {
                        raw,
                        threadId: options.threadId
                    }
                }
            });

            return this.normalizeDraft(response.data, accountId);
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    async updateDraft(
        accountId: string,
        draftId: string,
        options: UpdateDraftOptions
    ): Promise<Draft> {
        const ctx = await this.getClient(accountId);

        try {
            // Get existing draft
            const existing = await this.getDraft(accountId, draftId);

            // Merge with updates
            const merged: CreateDraftOptions = {
                to: options.to || existing.to,
                cc: options.cc || existing.cc,
                bcc: options.bcc || existing.bcc,
                subject: options.subject || existing.subject,
                bodyText: options.bodyText || existing.bodyText,
                bodyHtml: options.bodyHtml || existing.bodyHtml,
                attachments: options.attachments || [],
                threadId: existing.threadId
            };

            const raw = this.buildRawEmail(merged);

            const response = await ctx.gmail.users.drafts.update({
                userId: 'me',
                id: draftId,
                requestBody: {
                    message: {
                        raw
                    }
                }
            });

            return this.normalizeDraft(response.data, accountId);
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    async deleteDraft(accountId: string, draftId: string): Promise<void> {
        const ctx = await this.getClient(accountId);

        try {
            await ctx.gmail.users.drafts.delete({
                userId: 'me',
                id: draftId
            });
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    async sendDraft(accountId: string, draftId: string): Promise<Message> {
        const ctx = await this.getClient(accountId);

        try {
            const response = await ctx.gmail.users.drafts.send({
                userId: 'me',
                requestBody: {
                    id: draftId
                }
            });

            // Get the sent message
            return this.getMessage(accountId, response.data.id!, { format: 'full' });
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    // ==========================================
    // LABELS
    // ==========================================

    async listLabels(accountId: string): Promise<Label[]> {
        const ctx = await this.getClient(accountId);

        try {
            const response = await ctx.gmail.users.labels.list({
                userId: 'me'
            });

            return (response.data.labels || []).map(label => this.normalizeLabel(label, accountId));
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    async listFolders(accountId: string): Promise<Folder[]> {
        // Gmail uses labels, not folders
        const labels = await this.listLabels(accountId);

        return labels.map(l => ({
            id: l.id,
            accountId: l.accountId,
            name: l.name,
            displayName: l.displayName,
            type: l.type,
            parentId: l.parentId,
            messageCount: l.messageCount,
            unreadCount: l.unreadCount,
            providerFolderId: l.providerLabelId
        }));
    }

    async createLabel(
        accountId: string,
        name: string,
        options: { color?: string; parentId?: string } = {}
    ): Promise<Label> {
        const ctx = await this.getClient(accountId);

        try {
            const response = await ctx.gmail.users.labels.create({
                userId: 'me',
                requestBody: {
                    name,
                    labelListVisibility: 'labelShow',
                    messageListVisibility: 'show',
                    color: options.color ? {
                        backgroundColor: options.color,
                        textColor: '#ffffff'
                    } : undefined
                }
            });

            return this.normalizeLabel(response.data, accountId);
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    async deleteLabel(accountId: string, labelId: string): Promise<void> {
        const ctx = await this.getClient(accountId);

        try {
            await ctx.gmail.users.labels.delete({
                userId: 'me',
                id: labelId
            });
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    async applyLabels(
        accountId: string,
        options: ApplyLabelsOptions
    ): Promise<void> {
        const ctx = await this.getClient(accountId);

        try {
            await ctx.gmail.users.messages.batchModify({
                userId: 'me',
                requestBody: {
                    ids: options.messageIds,
                    addLabelIds: options.addLabelIds,
                    removeLabelIds: options.removeLabelIds
                }
            });
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    async archiveMessages(
        accountId: string,
        options: ArchiveOptions
    ): Promise<void> {
        return this.applyLabels(accountId, {
            messageIds: options.messageIds,
            removeLabelIds: ['INBOX']
        });
    }

    async setReadStatus(
        accountId: string,
        messageIds: string[],
        isRead: boolean
    ): Promise<void> {
        return this.applyLabels(accountId, {
            messageIds,
            addLabelIds: isRead ? [] : ['UNREAD'],
            removeLabelIds: isRead ? ['UNREAD'] : []
        });
    }

    async trashMessages(
        accountId: string,
        messageIds: string[]
    ): Promise<void> {
        const ctx = await this.getClient(accountId);

        try {
            await Promise.all(
                messageIds.map(id =>
                    ctx.gmail.users.messages.trash({ userId: 'me', id })
                )
            );
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    // ==========================================
    // SYNC
    // ==========================================

    async getIncrementalChanges(
        accountId: string,
        options: IncrementalSyncOptions
    ): Promise<{
        changes: HistoryChange[];
        newHistoryId?: string;
    }> {
        const ctx = await this.getClient(accountId);

        try {
            if (!options.historyId) {
                throw new ConnectorApiError(
                    'MISSING_HISTORY_ID',
                    'historyId is required for incremental sync',
                    400
                );
            }

            const response = await ctx.gmail.users.history.list({
                userId: 'me',
                startHistoryId: options.historyId,
                historyTypes: options.historyTypes as any,
                labelId: options.labelId
            });

            const changes: HistoryChange[] = [];

            for (const history of response.data.history || []) {
                if (history.messagesAdded) {
                    for (const added of history.messagesAdded) {
                        if (added.message?.id) {
                            changes.push({
                                type: 'added',
                                messageId: added.message.id,
                                threadId: added.message.threadId || undefined,
                                labelIds: added.message.labelIds || undefined
                            });
                        }
                    }
                }

                if (history.messagesDeleted) {
                    for (const deleted of history.messagesDeleted) {
                        if (deleted.message?.id) {
                            changes.push({
                                type: 'deleted',
                                messageId: deleted.message.id,
                                threadId: deleted.message.threadId || undefined
                            });
                        }
                    }
                }

                if (history.labelsAdded) {
                    for (const labelAdded of history.labelsAdded) {
                        if (labelAdded.message?.id) {
                            changes.push({
                                type: 'labelAdded',
                                messageId: labelAdded.message.id,
                                threadId: labelAdded.message.threadId || undefined,
                                labelIds: labelAdded.labelIds || undefined
                            });
                        }
                    }
                }

                if (history.labelsRemoved) {
                    for (const labelRemoved of history.labelsRemoved) {
                        if (labelRemoved.message?.id) {
                            changes.push({
                                type: 'labelRemoved',
                                messageId: labelRemoved.message.id,
                                threadId: labelRemoved.message.threadId || undefined,
                                labelIds: labelRemoved.labelIds || undefined
                            });
                        }
                    }
                }
            }

            return {
                changes,
                newHistoryId: response.data.historyId || undefined
            };
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    async setupWatch(
        accountId: string,
        options: { webhookUrl: string; labelIds?: string[] }
    ): Promise<{
        historyId?: string;
        expiration: Date;
        resourceId?: string;
    }> {
        const ctx = await this.getClient(accountId);

        try {
            // Gmail uses Pub/Sub for webhooks
            // The topicName should be configured in the environment
            const topicName = process.env.GOOGLE_PUBSUB_TOPIC;

            if (!topicName) {
                throw new ConnectorApiError(
                    'CONFIG_ERROR',
                    'GOOGLE_PUBSUB_TOPIC environment variable is required',
                    500
                );
            }

            const response = await ctx.gmail.users.watch({
                userId: 'me',
                requestBody: {
                    topicName,
                    labelIds: options.labelIds || ['INBOX'],
                    labelFilterAction: 'include'
                }
            });

            return {
                historyId: response.data.historyId || undefined,
                expiration: new Date(parseInt(response.data.expiration || '0')),
                resourceId: undefined // Gmail doesn't return resourceId for watch
            };
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    async stopWatch(accountId: string): Promise<void> {
        const ctx = await this.getClient(accountId);

        try {
            await ctx.gmail.users.stop({ userId: 'me' });
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    // ==========================================
    // PRIVATE METHODS
    // ==========================================

    private async getClient(accountId: string): Promise<GmailClientContext> {
        // Get tenant ID from account
        const prisma = (await import('../../lib/prisma.js')).prisma;

        const account = await prisma.connectedAccount.findUnique({
            where: { id: accountId },
            include: { oauthToken: true }
        });

        if (!account) {
            throw new ConnectorApiError('ACCOUNT_NOT_FOUND', 'Account not found', 404);
        }

        // Get tokens
        const tokens = await this.tokenService.getTokens(accountId, account.tenantId);

        if (!tokens) {
            throw new ConnectorApiError('NO_TOKENS', 'No tokens found for account', 401);
        }

        // Check if refresh needed
        let accessToken = tokens.accessToken;

        if (tokens.isExpired || tokens.isNearExpiry) {
            const refreshed = await this.tokenService.refreshTokensWithLock(
                accountId,
                account.tenantId,
                async (refreshToken) => {
                    const oauth2Client = new google.auth.OAuth2(
                        process.env.GOOGLE_CLIENT_ID,
                        process.env.GOOGLE_CLIENT_SECRET
                    );

                    oauth2Client.setCredentials({ refresh_token: refreshToken });

                    const { credentials } = await oauth2Client.refreshAccessToken();

                    return {
                        accessToken: credentials.access_token!,
                        refreshToken: credentials.refresh_token || refreshToken,
                        expiresAt: new Date(credentials.expiry_date!),
                        scope: credentials.scope!,
                        tokenType: credentials.token_type!
                    };
                }
            );

            accessToken = refreshed.accessToken;
        }

        // Create Gmail client
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: accessToken });

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        return { gmail, accountId, tenantId: account.tenantId };
    }

    private normalizeThread(
        thread: gmail_v1.Schema$Thread,
        accountId: string,
        includeBody?: boolean
    ): Thread {
        const messages = thread.messages || [];
        const firstMessage = messages[0];
        const lastMessage = messages[messages.length - 1];

        // Extract participants from all messages
        const participantSet = new Map<string, Participant>();

        for (const msg of messages) {
            const from = this.extractParticipant(msg, 'From');
            if (from) participantSet.set(from.email, from);

            for (const to of this.extractParticipants(msg, 'To')) {
                participantSet.set(to.email, to);
            }
        }

        // Count unread
        const unreadCount = messages.filter(m =>
            m.labelIds?.includes('UNREAD')
        ).length;

        return {
            id: thread.id!,
            accountId,
            subject: this.getHeader(firstMessage, 'Subject') || '(No subject)',
            snippet: thread.snippet || '',
            participants: Array.from(participantSet.values()),
            messageCount: messages.length,
            unreadCount,
            labels: [...new Set(messages.flatMap(m => m.labelIds || []))],
            folders: [],
            lastMessageAt: lastMessage?.internalDate
                ? new Date(parseInt(lastMessage.internalDate))
                : new Date(),
            firstMessageAt: firstMessage?.internalDate
                ? new Date(parseInt(firstMessage.internalDate))
                : new Date(),
            messages: includeBody
                ? messages.map(m => this.normalizeMessage(m, accountId, true))
                : undefined,
            providerThreadId: thread.id!
        };
    }

    private normalizeMessage(
        message: gmail_v1.Schema$Message,
        accountId: string,
        includeBody?: boolean
    ): Message {
        const from = this.extractParticipant(message, 'From');

        let bodyText: string | undefined;
        let bodyHtml: string | undefined;

        if (includeBody && message.payload) {
            const body = this.extractBody(message.payload);
            bodyText = body.text;
            bodyHtml = body.html;
        }

        const attachments = this.extractAttachments(message.payload);

        return {
            id: message.id!,
            threadId: message.threadId!,
            accountId,
            internetMessageId: this.getHeader(message, 'Message-ID') || message.id!,
            from: from || { email: 'unknown@unknown.com' },
            to: this.extractParticipants(message, 'To'),
            cc: this.extractParticipants(message, 'Cc'),
            bcc: this.extractParticipants(message, 'Bcc'),
            replyTo: this.extractParticipants(message, 'Reply-To'),
            subject: this.getHeader(message, 'Subject') || '',
            snippet: message.snippet || '',
            bodyText,
            bodyHtml,
            labels: message.labelIds || [],
            folders: [],
            isRead: !message.labelIds?.includes('UNREAD'),
            isStarred: message.labelIds?.includes('STARRED') || false,
            isDraft: message.labelIds?.includes('DRAFT') || false,
            isTrash: message.labelIds?.includes('TRASH') || false,
            isSpam: message.labelIds?.includes('SPAM') || false,
            attachments,
            hasAttachments: attachments.length > 0,
            sentAt: message.internalDate
                ? new Date(parseInt(message.internalDate))
                : new Date(),
            receivedAt: message.internalDate
                ? new Date(parseInt(message.internalDate))
                : new Date(),
            inReplyTo: this.getHeader(message, 'In-Reply-To') || undefined,
            references: this.getHeader(message, 'References')?.split(/\s+/) || undefined,
            providerMessageId: message.id!
        };
    }

    private normalizeDraft(
        draft: gmail_v1.Schema$Draft,
        accountId: string
    ): Draft {
        const message = draft.message;

        return {
            id: draft.id!,
            accountId,
            to: message ? this.extractParticipants(message, 'To') : [],
            cc: message ? this.extractParticipants(message, 'Cc') : [],
            bcc: message ? this.extractParticipants(message, 'Bcc') : [],
            subject: message ? this.getHeader(message, 'Subject') || '' : '',
            bodyText: message?.payload ? this.extractBody(message.payload).text : undefined,
            bodyHtml: message?.payload ? this.extractBody(message.payload).html : undefined,
            replyToMessageId: message ? this.getHeader(message, 'In-Reply-To') || undefined : undefined,
            threadId: message?.threadId || undefined,
            attachments: [],
            createdAt: message?.internalDate
                ? new Date(parseInt(message.internalDate))
                : new Date(),
            updatedAt: new Date(),
            providerDraftId: draft.id!
        };
    }

    private normalizeLabel(
        label: gmail_v1.Schema$Label,
        accountId: string
    ): Label {
        return {
            id: label.id!,
            accountId,
            name: label.name!,
            displayName: label.name!,
            type: label.type === 'system' ? 'system' : 'user',
            color: label.color?.backgroundColor,
            messageCount: label.messagesTotal || undefined,
            unreadCount: label.messagesUnread || undefined,
            providerLabelId: label.id!
        };
    }

    private getHeader(message: gmail_v1.Schema$Message | undefined, name: string): string | undefined {
        return message?.payload?.headers?.find(
            h => h.name?.toLowerCase() === name.toLowerCase()
        )?.value || undefined;
    }

    private extractParticipant(
        message: gmail_v1.Schema$Message,
        header: string
    ): Participant | undefined {
        const value = this.getHeader(message, header);
        if (!value) return undefined;
        return this.parseEmailAddress(value);
    }

    private extractParticipants(
        message: gmail_v1.Schema$Message,
        header: string
    ): Participant[] {
        const value = this.getHeader(message, header);
        if (!value) return [];

        // Split by comma, handling quoted names
        const addresses = value.match(/[^,]+/g) || [];
        return addresses.map(a => this.parseEmailAddress(a.trim())).filter((p): p is Participant => !!p);
    }

    private parseEmailAddress(raw: string): Participant | undefined {
        // Format: "Name" <email@example.com> or just email@example.com
        const match = raw.match(/^(?:"?([^"<]+)"?\s*)?<?([^>]+@[^>]+)>?$/);

        if (!match) return undefined;

        return {
            email: match[2].trim(),
            name: match[1]?.trim() || undefined
        };
    }

    private extractBody(payload: gmail_v1.Schema$MessagePart): { text?: string; html?: string } {
        let text: string | undefined;
        let html: string | undefined;

        const processBody = (part: gmail_v1.Schema$MessagePart) => {
            if (part.mimeType === 'text/plain' && part.body?.data) {
                text = Buffer.from(part.body.data, 'base64').toString('utf8');
            } else if (part.mimeType === 'text/html' && part.body?.data) {
                html = Buffer.from(part.body.data, 'base64').toString('utf8');
            } else if (part.parts) {
                for (const subPart of part.parts) {
                    processBody(subPart);
                }
            }
        };

        processBody(payload);

        return { text, html };
    }

    private extractAttachments(payload?: gmail_v1.Schema$MessagePart): Attachment[] {
        const attachments: Attachment[] = [];

        if (!payload) return attachments;

        const processAttachments = (part: gmail_v1.Schema$MessagePart) => {
            if (part.filename && part.body?.attachmentId) {
                attachments.push({
                    id: part.body.attachmentId,
                    filename: part.filename,
                    mimeType: part.mimeType || 'application/octet-stream',
                    size: part.body.size || 0,
                    contentId: part.headers?.find(h => h.name === 'Content-ID')?.value || undefined
                });
            }

            if (part.parts) {
                for (const subPart of part.parts) {
                    processAttachments(subPart);
                }
            }
        };

        processAttachments(payload);

        return attachments;
    }

    private buildRawEmail(options: CreateDraftOptions): string {
        const boundary = `----=_Part_${Date.now()}`;

        const headers = [
            `To: ${options.to.map(p => p.name ? `"${p.name}" <${p.email}>` : p.email).join(', ')}`,
            options.cc?.length ? `Cc: ${options.cc.map(p => p.name ? `"${p.name}" <${p.email}>` : p.email).join(', ')}` : '',
            options.bcc?.length ? `Bcc: ${options.bcc.map(p => p.name ? `"${p.name}" <${p.email}>` : p.email).join(', ')}` : '',
            `Subject: ${options.subject}`,
            options.replyToMessageId ? `In-Reply-To: ${options.replyToMessageId}` : '',
            options.replyToMessageId ? `References: ${options.replyToMessageId}` : '',
            `MIME-Version: 1.0`,
            `Content-Type: multipart/alternative; boundary="${boundary}"`
        ].filter(Boolean).join('\r\n');

        let body = `${headers}\r\n\r\n`;

        if (options.bodyText) {
            body += `--${boundary}\r\n`;
            body += `Content-Type: text/plain; charset="UTF-8"\r\n\r\n`;
            body += `${options.bodyText}\r\n\r\n`;
        }

        if (options.bodyHtml) {
            body += `--${boundary}\r\n`;
            body += `Content-Type: text/html; charset="UTF-8"\r\n\r\n`;
            body += `${options.bodyHtml}\r\n\r\n`;
        }

        body += `--${boundary}--`;

        return Buffer.from(body).toString('base64url');
    }

    private normalizeError(error: unknown): ConnectorApiError {
        if (error instanceof ConnectorApiError) return error;

        const err = error as any;

        // Google API errors
        if (err.code && err.message) {
            const statusCode = typeof err.code === 'number' ? err.code : 500;

            // Check for rate limiting
            if (statusCode === 429) {
                return new ConnectorApiError(
                    'RATE_LIMITED',
                    'Too many requests to Gmail API',
                    429,
                    true,
                    { retryAfter: 60 }
                );
            }

            // Check for auth errors
            if (statusCode === 401 || statusCode === 403) {
                return new ConnectorApiError(
                    'AUTH_ERROR',
                    err.message,
                    statusCode,
                    false
                );
            }

            return new ConnectorApiError(
                'PROVIDER_ERROR',
                err.message,
                statusCode,
                statusCode >= 500
            );
        }

        return new ConnectorApiError(
            'UNKNOWN_ERROR',
            err.message || 'Unknown error',
            500,
            true
        );
    }
}
