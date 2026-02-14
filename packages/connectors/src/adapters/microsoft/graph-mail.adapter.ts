/**
 * Microsoft Graph Mail Adapter
 * 
 * Implements EmailProvider interface for Microsoft Graph API (Outlook/Microsoft 365).
 */

import { Client } from '@microsoft/microsoft-graph-client';
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
import { TokenService } from '../../services/token.service.js';
import { logger } from '../../utils/logger.js';

// ============================================
// TYPES
// ============================================

interface GraphMessage {
    id: string;
    conversationId: string;
    internetMessageId: string;
    subject: string;
    bodyPreview: string;
    body?: { contentType: string; content: string };
    from?: { emailAddress: { address: string; name?: string } };
    toRecipients?: Array<{ emailAddress: { address: string; name?: string } }>;
    ccRecipients?: Array<{ emailAddress: { address: string; name?: string } }>;
    bccRecipients?: Array<{ emailAddress: { address: string; name?: string } }>;
    replyTo?: Array<{ emailAddress: { address: string; name?: string } }>;
    isRead: boolean;
    isDraft: boolean;
    hasAttachments: boolean;
    flag?: { flagStatus: string };
    sentDateTime: string;
    receivedDateTime: string;
    parentFolderId: string;
    attachments?: Array<{
        id: string;
        name: string;
        contentType: string;
        size: number;
    }>;
}

interface GraphFolder {
    id: string;
    displayName: string;
    parentFolderId?: string;
    childFolderCount: number;
    totalItemCount: number;
    unreadItemCount: number;
}

// ============================================
// MICROSOFT GRAPH MAIL ADAPTER
// ============================================

export class MicrosoftGraphMailAdapter implements EmailProvider {
    readonly providerId = 'microsoft' as const;

    private readonly tokenService: TokenService;

    constructor(tokenService: TokenService) {
        this.tokenService = tokenService;
    }

    // ==========================================
    // THREADS (Conversations in Graph)
    // ==========================================

    async listThreads(
        accountId: string,
        options: ListThreadsOptions = {}
    ): Promise<SyncResult<Thread>> {
        const client = await this.getClient(accountId);

        try {
            // Graph groups by conversationId
            // First, get messages grouped by conversation
            let query = client.api('/me/messages')
                .select('id,conversationId,subject,bodyPreview,from,toRecipients,isRead,isDraft,receivedDateTime,hasAttachments,parentFolderId')
                .orderby('receivedDateTime desc')
                .top(options.maxResults || 50);

            if (options.folderIds?.length) {
                query = client.api(`/me/mailFolders/${options.folderIds[0]}/messages`)
                    .select('id,conversationId,subject,bodyPreview,from,toRecipients,isRead,isDraft,receivedDateTime,hasAttachments')
                    .orderby('receivedDateTime desc')
                    .top(options.maxResults || 50);
            }

            if (options.query) {
                query = query.search(`"${options.query}"`);
            }

            if (options.pageToken) {
                query = query.skipToken(options.pageToken);
            }

            const response = await query.get();

            // Group messages by conversationId
            const threadMap = new Map<string, GraphMessage[]>();

            for (const msg of response.value) {
                const convId = msg.conversationId;
                if (!threadMap.has(convId)) {
                    threadMap.set(convId, []);
                }
                threadMap.get(convId)!.push(msg);
            }

            const threads: Thread[] = [];

            for (const [convId, messages] of threadMap) {
                threads.push(this.normalizeThread(convId, messages, accountId));
            }

            // Extract skip token from @odata.nextLink
            let nextPageToken: string | undefined;
            if (response['@odata.nextLink']) {
                const match = response['@odata.nextLink'].match(/\$skiptoken=([^&]+)/);
                if (match) nextPageToken = match[1];
            }

            return {
                items: threads,
                nextPageToken,
                hasMore: !!response['@odata.nextLink']
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
        const client = await this.getClient(accountId);

        try {
            // Get all messages in this conversation
            const response = await client.api('/me/messages')
                .filter(`conversationId eq '${threadId}'`)
                .select('id,conversationId,internetMessageId,subject,bodyPreview,body,from,toRecipients,ccRecipients,bccRecipients,replyTo,isRead,isDraft,hasAttachments,flag,sentDateTime,receivedDateTime,attachments')
                .expand('attachments')
                .orderby('receivedDateTime asc')
                .get();

            return this.normalizeThread(threadId, response.value, accountId, options.includeBody);
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    async searchThreads(
        accountId: string,
        options: SearchOptions
    ): Promise<SyncResult<Thread>> {
        // Build OData filter
        let filter = '';

        if (options.from) {
            filter += `from/emailAddress/address eq '${options.from}'`;
        }

        if (options.isRead !== undefined) {
            if (filter) filter += ' and ';
            filter += `isRead eq ${options.isRead}`;
        }

        if (options.hasAttachment) {
            if (filter) filter += ' and ';
            filter += 'hasAttachments eq true';
        }

        return this.listThreads(accountId, {
            query: options.query,
            maxResults: options.maxResults,
            pageToken: options.pageToken
        });
    }

    // ==========================================
    // MESSAGES
    // ==========================================

    async listMessages(
        accountId: string,
        options: ListMessagesOptions = {}
    ): Promise<SyncResult<Message>> {
        const client = await this.getClient(accountId);

        try {
            let query = client.api('/me/messages')
                .select('id,conversationId,internetMessageId,subject,bodyPreview,from,toRecipients,ccRecipients,isRead,isDraft,hasAttachments,sentDateTime,receivedDateTime,parentFolderId')
                .orderby('receivedDateTime desc')
                .top(options.maxResults || 50);

            if (options.threadId) {
                query = query.filter(`conversationId eq '${options.threadId}'`);
            }

            if (options.folderIds?.length) {
                query = client.api(`/me/mailFolders/${options.folderIds[0]}/messages`)
                    .select('id,conversationId,internetMessageId,subject,bodyPreview,from,toRecipients,ccRecipients,isRead,isDraft,hasAttachments,sentDateTime,receivedDateTime')
                    .orderby('receivedDateTime desc')
                    .top(options.maxResults || 50);
            }

            if (options.pageToken) {
                query = query.skipToken(options.pageToken);
            }

            const response = await query.get();

            const messages = response.value.map((msg: GraphMessage) =>
                this.normalizeMessage(msg, accountId, options.includeBody)
            );

            let nextPageToken: string | undefined;
            if (response['@odata.nextLink']) {
                const match = response['@odata.nextLink'].match(/\$skiptoken=([^&]+)/);
                if (match) nextPageToken = match[1];
            }

            return {
                items: messages,
                nextPageToken,
                hasMore: !!response['@odata.nextLink']
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
        const client = await this.getClient(accountId);

        try {
            let query = client.api(`/me/messages/${messageId}`);

            if (options.format === 'full') {
                query = query.expand('attachments');
            }

            const message = await query.get();

            return this.normalizeMessage(message, accountId, options.format === 'full');
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    async searchMessages(
        accountId: string,
        options: SearchOptions
    ): Promise<SyncResult<Message>> {
        const client = await this.getClient(accountId);

        try {
            let query = client.api('/me/messages')
                .search(`"${options.query}"`)
                .top(options.maxResults || 50);

            if (options.pageToken) {
                query = query.skipToken(options.pageToken);
            }

            const response = await query.get();

            const messages = response.value.map((msg: GraphMessage) =>
                this.normalizeMessage(msg, accountId, false)
            );

            return {
                items: messages,
                hasMore: !!response['@odata.nextLink']
            };
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
        const client = await this.getClient(accountId);

        try {
            let query = client.api('/me/mailFolders/drafts/messages')
                .top(maxResults || 50);

            if (pageToken) {
                query = query.skipToken(pageToken);
            }

            const response = await query.get();

            const drafts = response.value.map((msg: GraphMessage) =>
                this.normalizeDraft(msg, accountId)
            );

            return {
                items: drafts,
                hasMore: !!response['@odata.nextLink']
            };
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    async getDraft(accountId: string, draftId: string): Promise<Draft> {
        const message = await this.getMessage(accountId, draftId, { format: 'full' });

        return {
            id: message.id,
            accountId,
            to: message.to,
            cc: message.cc,
            bcc: message.bcc,
            subject: message.subject,
            bodyText: message.bodyText,
            bodyHtml: message.bodyHtml,
            threadId: message.threadId,
            attachments: [],
            createdAt: message.receivedAt,
            updatedAt: message.receivedAt,
            providerDraftId: message.providerMessageId
        };
    }

    async createDraft(
        accountId: string,
        options: CreateDraftOptions
    ): Promise<Draft> {
        const client = await this.getClient(accountId);

        try {
            const message = {
                subject: options.subject,
                body: {
                    contentType: options.bodyHtml ? 'html' : 'text',
                    content: options.bodyHtml || options.bodyText || ''
                },
                toRecipients: options.to.map(p => ({
                    emailAddress: { address: p.email, name: p.name }
                })),
                ccRecipients: options.cc?.map(p => ({
                    emailAddress: { address: p.email, name: p.name }
                })),
                bccRecipients: options.bcc?.map(p => ({
                    emailAddress: { address: p.email, name: p.name }
                }))
            };

            const response = await client.api('/me/messages').post(message);

            return this.normalizeDraft(response, accountId);
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    async updateDraft(
        accountId: string,
        draftId: string,
        options: UpdateDraftOptions
    ): Promise<Draft> {
        const client = await this.getClient(accountId);

        try {
            const update: Record<string, unknown> = {};

            if (options.subject !== undefined) update.subject = options.subject;
            if (options.bodyText || options.bodyHtml) {
                update.body = {
                    contentType: options.bodyHtml ? 'html' : 'text',
                    content: options.bodyHtml || options.bodyText
                };
            }
            if (options.to) {
                update.toRecipients = options.to.map(p => ({
                    emailAddress: { address: p.email, name: p.name }
                }));
            }
            if (options.cc) {
                update.ccRecipients = options.cc.map(p => ({
                    emailAddress: { address: p.email, name: p.name }
                }));
            }

            const response = await client.api(`/me/messages/${draftId}`).patch(update);

            return this.normalizeDraft(response, accountId);
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    async deleteDraft(accountId: string, draftId: string): Promise<void> {
        const client = await this.getClient(accountId);

        try {
            await client.api(`/me/messages/${draftId}`).delete();
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    async sendDraft(accountId: string, draftId: string): Promise<Message> {
        const client = await this.getClient(accountId);

        try {
            await client.api(`/me/messages/${draftId}/send`).post({});

            // The message is moved to Sent Items
            // We need to find it there
            const sentMessages = await client.api('/me/mailFolders/sentItems/messages')
                .top(1)
                .orderby('sentDateTime desc')
                .get();

            if (sentMessages.value.length > 0) {
                return this.normalizeMessage(sentMessages.value[0], accountId, true);
            }

            throw new ConnectorApiError('SEND_ERROR', 'Message sent but could not retrieve', 500);
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    // ==========================================
    // FOLDERS (Microsoft uses folders, not labels)
    // ==========================================

    async listLabels(accountId: string): Promise<Label[]> {
        // Microsoft doesn't have labels, return empty
        return [];
    }

    async listFolders(accountId: string): Promise<Folder[]> {
        const client = await this.getClient(accountId);

        try {
            const response = await client.api('/me/mailFolders')
                .select('id,displayName,parentFolderId,childFolderCount,totalItemCount,unreadItemCount')
                .get();

            return response.value.map((folder: GraphFolder) => this.normalizeFolder(folder, accountId));
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    async createLabel(
        accountId: string,
        name: string,
        options: { color?: string; parentId?: string } = {}
    ): Promise<Label> {
        const client = await this.getClient(accountId);

        try {
            const folder = {
                displayName: name
            };

            const parentPath = options.parentId
                ? `/me/mailFolders/${options.parentId}/childFolders`
                : '/me/mailFolders';

            const response = await client.api(parentPath).post(folder);

            return {
                id: response.id,
                accountId,
                name: response.displayName,
                displayName: response.displayName,
                type: 'user',
                parentId: options.parentId,
                providerLabelId: response.id
            };
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    async deleteLabel(accountId: string, labelId: string): Promise<void> {
        const client = await this.getClient(accountId);

        try {
            await client.api(`/me/mailFolders/${labelId}`).delete();
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    async applyLabels(
        accountId: string,
        options: ApplyLabelsOptions
    ): Promise<void> {
        // Microsoft uses folders, not labels
        // Moving to a folder is the equivalent
        if (options.addLabelIds?.length) {
            const client = await this.getClient(accountId);

            for (const messageId of options.messageIds) {
                await client.api(`/me/messages/${messageId}/move`).post({
                    destinationId: options.addLabelIds[0]
                });
            }
        }
    }

    async archiveMessages(
        accountId: string,
        options: ArchiveOptions
    ): Promise<void> {
        const client = await this.getClient(accountId);

        try {
            for (const messageId of options.messageIds) {
                await client.api(`/me/messages/${messageId}/move`).post({
                    destinationId: 'archive'
                });
            }
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    async setReadStatus(
        accountId: string,
        messageIds: string[],
        isRead: boolean
    ): Promise<void> {
        const client = await this.getClient(accountId);

        try {
            for (const messageId of messageIds) {
                await client.api(`/me/messages/${messageId}`).patch({ isRead });
            }
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    async trashMessages(
        accountId: string,
        messageIds: string[]
    ): Promise<void> {
        const client = await this.getClient(accountId);

        try {
            for (const messageId of messageIds) {
                await client.api(`/me/messages/${messageId}/move`).post({
                    destinationId: 'deleteditems'
                });
            }
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
        newDeltaLink?: string;
    }> {
        const client = await this.getClient(accountId);

        try {
            let query;

            if (options.deltaLink) {
                // Use existing delta link
                query = client.api(options.deltaLink);
            } else {
                // Initial delta
                query = client.api('/me/mailFolders/inbox/messages/delta')
                    .select('id,isRead,parentFolderId');
            }

            const response = await query.get();

            const changes: HistoryChange[] = [];

            for (const msg of response.value) {
                if (msg['@removed']) {
                    changes.push({
                        type: 'deleted',
                        messageId: msg.id
                    });
                } else {
                    changes.push({
                        type: 'added',
                        messageId: msg.id
                    });
                }
            }

            return {
                changes,
                newDeltaLink: response['@odata.deltaLink']
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
        const client = await this.getClient(accountId);

        try {
            const subscription = {
                changeType: 'created,updated,deleted',
                notificationUrl: options.webhookUrl,
                resource: '/me/messages',
                expirationDateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days max
                clientState: process.env.MICROSOFT_WEBHOOK_SECRET || 'aaliyah-secret'
            };

            const response = await client.api('/subscriptions').post(subscription);

            return {
                expiration: new Date(response.expirationDateTime),
                resourceId: response.id
            };
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    async stopWatch(accountId: string, resourceId?: string): Promise<void> {
        if (!resourceId) return;

        const client = await this.getClient(accountId);

        try {
            await client.api(`/subscriptions/${resourceId}`).delete();
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    // ==========================================
    // PRIVATE METHODS
    // ==========================================

    private async getClient(accountId: string): Promise<Client> {
        const prisma = (await import('../../lib/prisma.js')).prisma;

        const account = await prisma.connectedAccount.findUnique({
            where: { id: accountId }
        });

        if (!account) {
            throw new ConnectorApiError('ACCOUNT_NOT_FOUND', 'Account not found', 404);
        }

        const tokens = await this.tokenService.getTokens(accountId, account.tenantId);

        if (!tokens) {
            throw new ConnectorApiError('NO_TOKENS', 'No tokens found', 401);
        }

        let accessToken = tokens.accessToken;

        if (tokens.isExpired || tokens.isNearExpiry) {
            const refreshed = await this.tokenService.refreshTokensWithLock(
                accountId,
                account.tenantId,
                async (refreshToken) => {
                    // Refresh Microsoft token
                    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({
                            client_id: process.env.MICROSOFT_CLIENT_ID!,
                            client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
                            refresh_token: refreshToken,
                            grant_type: 'refresh_token'
                        })
                    });

                    if (!response.ok) {
                        throw new Error('Failed to refresh Microsoft token');
                    }

                    const data = await response.json();

                    return {
                        accessToken: data.access_token,
                        refreshToken: data.refresh_token || refreshToken,
                        expiresAt: new Date(Date.now() + data.expires_in * 1000),
                        scope: data.scope,
                        tokenType: data.token_type
                    };
                }
            );
            accessToken = refreshed.accessToken;
        }

        return Client.init({
            authProvider: (done) => {
                done(null, accessToken);
            }
        });
    }

    private normalizeThread(
        conversationId: string,
        messages: GraphMessage[],
        accountId: string,
        includeBody?: boolean
    ): Thread {
        const firstMessage = messages[0];
        const lastMessage = messages[messages.length - 1];

        const participantSet = new Map<string, Participant>();

        for (const msg of messages) {
            if (msg.from?.emailAddress) {
                participantSet.set(msg.from.emailAddress.address, {
                    email: msg.from.emailAddress.address,
                    name: msg.from.emailAddress.name
                });
            }
            for (const to of msg.toRecipients || []) {
                participantSet.set(to.emailAddress.address, {
                    email: to.emailAddress.address,
                    name: to.emailAddress.name
                });
            }
        }

        const unreadCount = messages.filter(m => !m.isRead).length;

        return {
            id: conversationId,
            accountId,
            subject: firstMessage?.subject || '(No subject)',
            snippet: lastMessage?.bodyPreview || '',
            participants: Array.from(participantSet.values()),
            messageCount: messages.length,
            unreadCount,
            labels: [],
            folders: [...new Set(messages.map(m => m.parentFolderId))],
            lastMessageAt: lastMessage?.receivedDateTime
                ? new Date(lastMessage.receivedDateTime)
                : new Date(),
            firstMessageAt: firstMessage?.receivedDateTime
                ? new Date(firstMessage.receivedDateTime)
                : new Date(),
            messages: includeBody
                ? messages.map(m => this.normalizeMessage(m, accountId, true))
                : undefined,
            providerThreadId: conversationId
        };
    }

    private normalizeMessage(
        msg: GraphMessage,
        accountId: string,
        includeBody?: boolean
    ): Message {
        return {
            id: msg.id,
            threadId: msg.conversationId,
            accountId,
            internetMessageId: msg.internetMessageId || msg.id,
            from: msg.from?.emailAddress
                ? { email: msg.from.emailAddress.address, name: msg.from.emailAddress.name }
                : { email: 'unknown@unknown.com' },
            to: (msg.toRecipients || []).map(r => ({
                email: r.emailAddress.address,
                name: r.emailAddress.name
            })),
            cc: (msg.ccRecipients || []).map(r => ({
                email: r.emailAddress.address,
                name: r.emailAddress.name
            })),
            bcc: (msg.bccRecipients || []).map(r => ({
                email: r.emailAddress.address,
                name: r.emailAddress.name
            })),
            replyTo: (msg.replyTo || []).map(r => ({
                email: r.emailAddress.address,
                name: r.emailAddress.name
            })),
            subject: msg.subject || '',
            snippet: msg.bodyPreview || '',
            bodyText: includeBody && msg.body?.contentType === 'text' ? msg.body.content : undefined,
            bodyHtml: includeBody && msg.body?.contentType === 'html' ? msg.body.content : undefined,
            labels: [],
            folders: [msg.parentFolderId],
            isRead: msg.isRead,
            isStarred: msg.flag?.flagStatus === 'flagged',
            isDraft: msg.isDraft,
            isTrash: false,
            isSpam: false,
            attachments: (msg.attachments || []).map(a => ({
                id: a.id,
                filename: a.name,
                mimeType: a.contentType,
                size: a.size
            })),
            hasAttachments: msg.hasAttachments,
            sentAt: new Date(msg.sentDateTime),
            receivedAt: new Date(msg.receivedDateTime),
            providerMessageId: msg.id
        };
    }

    private normalizeDraft(msg: GraphMessage, accountId: string): Draft {
        return {
            id: msg.id,
            accountId,
            to: (msg.toRecipients || []).map(r => ({
                email: r.emailAddress.address,
                name: r.emailAddress.name
            })),
            cc: (msg.ccRecipients || []).map(r => ({
                email: r.emailAddress.address,
                name: r.emailAddress.name
            })),
            bcc: (msg.bccRecipients || []).map(r => ({
                email: r.emailAddress.address,
                name: r.emailAddress.name
            })),
            subject: msg.subject || '',
            bodyText: msg.body?.contentType === 'text' ? msg.body.content : undefined,
            bodyHtml: msg.body?.contentType === 'html' ? msg.body.content : undefined,
            threadId: msg.conversationId,
            attachments: [],
            createdAt: new Date(msg.receivedDateTime),
            updatedAt: new Date(msg.receivedDateTime),
            providerDraftId: msg.id
        };
    }

    private normalizeFolder(folder: GraphFolder, accountId: string): Folder {
        const systemFolders = ['inbox', 'drafts', 'sentitems', 'deleteditems', 'archive', 'junkemail'];
        const isSystem = systemFolders.includes(folder.displayName.toLowerCase().replace(/\s/g, ''));

        return {
            id: folder.id,
            accountId,
            name: folder.displayName,
            displayName: folder.displayName,
            type: isSystem ? 'system' : 'user',
            parentId: folder.parentFolderId,
            messageCount: folder.totalItemCount,
            unreadCount: folder.unreadItemCount,
            providerFolderId: folder.id
        };
    }

    private normalizeError(error: unknown): ConnectorApiError {
        if (error instanceof ConnectorApiError) return error;

        const err = error as any;

        if (err.statusCode) {
            if (err.statusCode === 429) {
                return new ConnectorApiError(
                    'RATE_LIMITED',
                    'Too many requests to Microsoft Graph',
                    429,
                    true,
                    { retryAfter: 60 }
                );
            }

            if (err.statusCode === 401 || err.statusCode === 403) {
                return new ConnectorApiError(
                    'AUTH_ERROR',
                    err.message || 'Authentication failed',
                    err.statusCode,
                    false
                );
            }

            return new ConnectorApiError(
                'PROVIDER_ERROR',
                err.message || 'Microsoft Graph error',
                err.statusCode,
                err.statusCode >= 500
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
