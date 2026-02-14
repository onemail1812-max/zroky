/**
 * Aaliyah Connectors - API Routes
 *
 * Enterprise-grade REST API for unified email and calendar access.
 */
import { Router } from 'express';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { prisma } from '../lib/prisma.js';
import { TokenService } from '../services/token.service.js';
import { ApprovalService } from '../services/approval.service.js';
import { AuditService, AuditTimer } from '../services/audit.service.js';
import { GoogleGmailAdapter } from '../adapters/google/gmail.adapter.js';
import { GoogleCalendarAdapter } from '../adapters/google/calendar.adapter.js';
import { MicrosoftGraphMailAdapter } from '../adapters/microsoft/graph-mail.adapter.js';
import { MicrosoftGraphCalendarAdapter } from '../adapters/microsoft/graph-calendar.adapter.js';
import { logger, generateCorrelationId } from '../utils/logger.js';
import { ConnectorApiError } from '../models/index.js';
// ============================================
// ROUTE FACTORY
// ============================================
export function createRoutes(redis) {
    const router = Router();
    // Initialize services
    const tokenService = new TokenService(prisma, redis);
    const approvalService = new ApprovalService(prisma);
    const auditService = new AuditService(prisma);
    // Initialize adapters
    const gmailAdapter = new GoogleGmailAdapter(tokenService);
    const googleCalendarAdapter = new GoogleCalendarAdapter(tokenService);
    const msMailAdapter = new MicrosoftGraphMailAdapter(tokenService);
    const msCalendarAdapter = new MicrosoftGraphCalendarAdapter(tokenService);
    // ==========================================
    // MIDDLEWARE
    // ==========================================
    // Tenant context middleware
    const requireTenantContext = (req, res, next) => {
        const tenantId = req.headers['x-tenant-id'];
        const userId = req.headers['x-user-id'];
        if (!tenantId || !userId) {
            return res.status(401).json({
                type: 'https://api.aaliyah.ai/errors/unauthorized',
                title: 'Missing tenant context',
                status: 401,
                detail: 'x-tenant-id and x-user-id headers are required'
            });
        }
        req.tenantId = tenantId;
        req.userId = userId;
        req.correlationId = req.headers['x-correlation-id'] || generateCorrelationId();
        next();
    };
    // Account validation middleware
    const validateAccount = async (req, res, next) => {
        const accountId = req.params.accountId;
        const tenantId = req.tenantId;
        if (!accountId)
            return next();
        const account = await prisma.connectedAccount.findFirst({
            where: {
                id: accountId,
                tenantId // Tenant isolation
            }
        });
        if (!account) {
            return res.status(404).json({
                type: 'https://api.aaliyah.ai/errors/not-found',
                title: 'Account not found',
                status: 404,
                detail: 'The specified account was not found or you do not have access'
            });
        }
        req.account = account;
        next();
    };
    // Apply middleware
    router.use(requireTenantContext);
    // ==========================================
    // OAUTH ROUTES
    // ==========================================
    /**
     * POST /connect/google
     * Start Google OAuth flow
     */
    router.post('/connect/google', async (req, res) => {
        const tenantId = req.tenantId;
        const userId = req.userId;
        const correlationId = req.correlationId;
        const schema = z.object({
            returnUrl: z.string().url(),
            scopes: z.array(z.string()).optional()
        });
        try {
            const { returnUrl, scopes } = schema.parse(req.body);
            // Generate state with encrypted payload
            const state = Buffer.from(JSON.stringify({
                tenantId,
                userId,
                returnUrl,
                nonce: nanoid(),
                correlationId
            })).toString('base64url');
            // Store state in Redis (5 min TTL)
            await redis.setex(`oauth_state:${state}`, 300, 'pending');
            // Default scopes
            const requestedScopes = scopes || [
                'https://www.googleapis.com/auth/gmail.readonly',
                'https://www.googleapis.com/auth/gmail.modify',
                'https://www.googleapis.com/auth/calendar.readonly',
                'https://www.googleapis.com/auth/calendar.events'
            ];
            const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
            authUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID);
            authUrl.searchParams.set('redirect_uri', `${process.env.API_BASE_URL}/oauth/callback/google`);
            authUrl.searchParams.set('response_type', 'code');
            authUrl.searchParams.set('scope', requestedScopes.join(' '));
            authUrl.searchParams.set('access_type', 'offline');
            authUrl.searchParams.set('prompt', 'consent');
            authUrl.searchParams.set('state', state);
            await auditService.logSuccess({
                tenantId,
                userId,
                action: 'oauth.initiate',
                resourceType: 'oauth',
                correlationId,
                metadata: { provider: 'google' }
            });
            res.json({ authUrl: authUrl.toString() });
        }
        catch (error) {
            logger.error({ error, correlationId }, 'Failed to initiate Google OAuth');
            res.status(400).json({
                type: 'https://api.aaliyah.ai/errors/bad-request',
                title: 'Invalid request',
                status: 400,
                detail: error instanceof z.ZodError ? error.message : 'Failed to initiate OAuth'
            });
        }
    });
    /**
     * POST /connect/microsoft
     * Start Microsoft OAuth flow
     */
    router.post('/connect/microsoft', async (req, res) => {
        const tenantId = req.tenantId;
        const userId = req.userId;
        const correlationId = req.correlationId;
        const schema = z.object({
            returnUrl: z.string().url(),
            scopes: z.array(z.string()).optional()
        });
        try {
            const { returnUrl, scopes } = schema.parse(req.body);
            const state = Buffer.from(JSON.stringify({
                tenantId,
                userId,
                returnUrl,
                nonce: nanoid(),
                correlationId
            })).toString('base64url');
            await redis.setex(`oauth_state:${state}`, 300, 'pending');
            const requestedScopes = scopes || [
                'openid',
                'profile',
                'email',
                'offline_access',
                'Mail.ReadWrite',
                'Calendars.ReadWrite'
            ];
            const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
            authUrl.searchParams.set('client_id', process.env.MICROSOFT_CLIENT_ID);
            authUrl.searchParams.set('redirect_uri', `${process.env.API_BASE_URL}/oauth/callback/microsoft`);
            authUrl.searchParams.set('response_type', 'code');
            authUrl.searchParams.set('scope', requestedScopes.join(' '));
            authUrl.searchParams.set('response_mode', 'query');
            authUrl.searchParams.set('state', state);
            await auditService.logSuccess({
                tenantId,
                userId,
                action: 'oauth.initiate',
                resourceType: 'oauth',
                correlationId,
                metadata: { provider: 'microsoft' }
            });
            res.json({ authUrl: authUrl.toString() });
        }
        catch (error) {
            logger.error({ error, correlationId }, 'Failed to initiate Microsoft OAuth');
            res.status(400).json({
                type: 'https://api.aaliyah.ai/errors/bad-request',
                title: 'Invalid request',
                status: 400,
                detail: 'Failed to initiate OAuth'
            });
        }
    });
    /**
     * GET /oauth/callback/google
     * Handle Google OAuth callback (server-side)
     */
    router.get('/oauth/callback/google', async (req, res) => {
        const { code, state, error: oauthError } = req.query;
        if (oauthError) {
            return res.redirect(`${process.env.APP_URL}/settings/integrations?error=${oauthError}`);
        }
        try {
            // Validate state
            const stateExists = await redis.get(`oauth_state:${state}`);
            if (!stateExists) {
                return res.redirect(`${process.env.APP_URL}/settings/integrations?error=invalid_state`);
            }
            // Parse state
            const stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
            const { tenantId, userId, returnUrl, correlationId } = stateData;
            // Delete state
            await redis.del(`oauth_state:${state}`);
            // Exchange code for tokens
            const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: process.env.GOOGLE_CLIENT_ID,
                    client_secret: process.env.GOOGLE_CLIENT_SECRET,
                    code: code,
                    redirect_uri: `${process.env.API_BASE_URL}/oauth/callback/google`,
                    grant_type: 'authorization_code'
                })
            });
            if (!tokenResponse.ok) {
                throw new Error('Failed to exchange code for tokens');
            }
            const tokens = await tokenResponse.json();
            // Get user info
            const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { Authorization: `Bearer ${tokens.access_token}` }
            });
            const userInfo = await userInfoResponse.json();
            // Create or update connected account
            const account = await prisma.connectedAccount.upsert({
                where: {
                    tenantId_userId_provider_providerAccountId: {
                        tenantId,
                        userId,
                        provider: 'GOOGLE',
                        providerAccountId: userInfo.id
                    }
                },
                create: {
                    tenantId,
                    userId,
                    provider: 'GOOGLE',
                    providerAccountId: userInfo.id,
                    email: userInfo.email,
                    displayName: userInfo.name,
                    status: 'ACTIVE',
                    enabledScopes: tokens.scope.split(' '),
                    requestedScopes: tokens.scope.split(' ')
                },
                update: {
                    status: 'ACTIVE',
                    enabledScopes: tokens.scope.split(' ')
                }
            });
            // Store tokens
            await tokenService.storeTokens(account.id, tenantId, {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
                scope: tokens.scope,
                tokenType: tokens.token_type
            });
            // Create sync state
            await prisma.syncState.upsert({
                where: { accountId: account.id },
                create: { accountId: account.id },
                update: {}
            });
            await auditService.logSuccess({
                tenantId,
                userId,
                accountId: account.id,
                action: 'account.connect',
                resourceType: 'account',
                resourceId: account.id,
                correlationId,
                metadata: { provider: 'google', email: userInfo.email }
            });
            res.redirect(`${returnUrl}?success=true&provider=google`);
        }
        catch (error) {
            logger.error({ error }, 'Google OAuth callback failed');
            res.redirect(`${process.env.APP_URL}/settings/integrations?error=callback_failed`);
        }
    });
    /**
     * GET /oauth/callback/microsoft
     * Handle Microsoft OAuth callback
     */
    router.get('/oauth/callback/microsoft', async (req, res) => {
        const { code, state, error: oauthError } = req.query;
        if (oauthError) {
            return res.redirect(`${process.env.APP_URL}/settings/integrations?error=${oauthError}`);
        }
        try {
            const stateExists = await redis.get(`oauth_state:${state}`);
            if (!stateExists) {
                return res.redirect(`${process.env.APP_URL}/settings/integrations?error=invalid_state`);
            }
            const stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
            const { tenantId, userId, returnUrl, correlationId } = stateData;
            await redis.del(`oauth_state:${state}`);
            // Exchange code
            const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: process.env.MICROSOFT_CLIENT_ID,
                    client_secret: process.env.MICROSOFT_CLIENT_SECRET,
                    code: code,
                    redirect_uri: `${process.env.API_BASE_URL}/oauth/callback/microsoft`,
                    grant_type: 'authorization_code'
                })
            });
            if (!tokenResponse.ok) {
                throw new Error('Failed to exchange code');
            }
            const tokens = await tokenResponse.json();
            // Get user info from Microsoft Graph
            const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
                headers: { Authorization: `Bearer ${tokens.access_token}` }
            });
            const userInfo = await userResponse.json();
            // Create account
            const account = await prisma.connectedAccount.upsert({
                where: {
                    tenantId_userId_provider_providerAccountId: {
                        tenantId,
                        userId,
                        provider: 'MICROSOFT',
                        providerAccountId: userInfo.id
                    }
                },
                create: {
                    tenantId,
                    userId,
                    provider: 'MICROSOFT',
                    providerAccountId: userInfo.id,
                    email: userInfo.mail || userInfo.userPrincipalName,
                    displayName: userInfo.displayName,
                    status: 'ACTIVE',
                    enabledScopes: tokens.scope.split(' '),
                    requestedScopes: tokens.scope.split(' ')
                },
                update: {
                    status: 'ACTIVE',
                    enabledScopes: tokens.scope.split(' ')
                }
            });
            await tokenService.storeTokens(account.id, tenantId, {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
                scope: tokens.scope,
                tokenType: tokens.token_type
            });
            await prisma.syncState.upsert({
                where: { accountId: account.id },
                create: { accountId: account.id },
                update: {}
            });
            await auditService.logSuccess({
                tenantId,
                userId,
                accountId: account.id,
                action: 'account.connect',
                resourceType: 'account',
                resourceId: account.id,
                correlationId,
                metadata: { provider: 'microsoft' }
            });
            res.redirect(`${returnUrl}?success=true&provider=microsoft`);
        }
        catch (error) {
            logger.error({ error }, 'Microsoft OAuth callback failed');
            res.redirect(`${process.env.APP_URL}/settings/integrations?error=callback_failed`);
        }
    });
    // ==========================================
    // ACCOUNT ROUTES
    // ==========================================
    /**
     * GET /accounts
     * List connected accounts
     */
    router.get('/accounts', async (req, res) => {
        const tenantId = req.tenantId;
        const userId = req.userId;
        try {
            const accounts = await prisma.connectedAccount.findMany({
                where: { tenantId, userId },
                select: {
                    id: true,
                    provider: true,
                    email: true,
                    displayName: true,
                    status: true,
                    enabledScopes: true,
                    createdAt: true,
                    lastSyncAt: true
                }
            });
            res.json({ accounts });
        }
        catch (error) {
            logger.error({ error }, 'Failed to list accounts');
            res.status(500).json({
                type: 'https://api.aaliyah.ai/errors/internal',
                title: 'Internal error',
                status: 500
            });
        }
    });
    /**
     * POST /accounts/:accountId/revoke
     * Revoke an account connection
     */
    router.post('/accounts/:accountId/revoke', validateAccount, async (req, res) => {
        const account = req.account;
        const tenantId = req.tenantId;
        const userId = req.userId;
        const correlationId = req.correlationId;
        try {
            // Delete tokens
            await tokenService.revokeTokens(account.id);
            // Update account status
            await prisma.connectedAccount.update({
                where: { id: account.id },
                data: { status: 'REVOKED' }
            });
            await auditService.logSuccess({
                tenantId,
                userId,
                accountId: account.id,
                action: 'account.revoke',
                resourceType: 'account',
                resourceId: account.id,
                correlationId
            });
            res.json({ success: true });
        }
        catch (error) {
            logger.error({ error }, 'Failed to revoke account');
            res.status(500).json({
                type: 'https://api.aaliyah.ai/errors/internal',
                title: 'Failed to revoke account',
                status: 500
            });
        }
    });
    // ==========================================
    // EMAIL ROUTES
    // ==========================================
    /**
     * GET /email/threads
     * List email threads
     */
    router.get('/accounts/:accountId/email/threads', validateAccount, async (req, res) => {
        const account = req.account;
        const correlationId = req.correlationId;
        try {
            const adapter = account.provider === 'GOOGLE' ? gmailAdapter : msMailAdapter;
            const result = await adapter.listThreads(account.id, {
                maxResults: parseInt(req.query.limit) || 50,
                pageToken: req.query.pageToken,
                query: req.query.q,
                includeBody: req.query.includeBody === 'true'
            });
            res.json(result);
        }
        catch (error) {
            handleApiError(res, error, correlationId);
        }
    });
    /**
     * GET /email/threads/:threadId
     * Get a single thread
     */
    router.get('/accounts/:accountId/email/threads/:threadId', validateAccount, async (req, res) => {
        const account = req.account;
        const correlationId = req.correlationId;
        try {
            const adapter = account.provider === 'GOOGLE' ? gmailAdapter : msMailAdapter;
            const thread = await adapter.getThread(account.id, req.params.threadId, {
                includeBody: req.query.includeBody !== 'false'
            });
            res.json(thread);
        }
        catch (error) {
            handleApiError(res, error, correlationId);
        }
    });
    /**
     * POST /email/drafts
     * Create a draft
     */
    router.post('/accounts/:accountId/email/drafts', validateAccount, async (req, res) => {
        const account = req.account;
        const tenantId = req.tenantId;
        const userId = req.userId;
        const correlationId = req.correlationId;
        const schema = z.object({
            to: z.array(z.object({ email: z.string().email(), name: z.string().optional() })),
            cc: z.array(z.object({ email: z.string().email(), name: z.string().optional() })).optional(),
            bcc: z.array(z.object({ email: z.string().email(), name: z.string().optional() })).optional(),
            subject: z.string(),
            bodyText: z.string().optional(),
            bodyHtml: z.string().optional(),
            replyToMessageId: z.string().optional(),
            threadId: z.string().optional()
        });
        try {
            const data = schema.parse(req.body);
            const adapter = account.provider === 'GOOGLE' ? gmailAdapter : msMailAdapter;
            const draft = await adapter.createDraft(account.id, data);
            await auditService.logSuccess({
                tenantId,
                userId,
                accountId: account.id,
                action: 'email.draft.create',
                resourceType: 'draft',
                resourceId: draft.id,
                correlationId
            });
            res.status(201).json(draft);
        }
        catch (error) {
            handleApiError(res, error, correlationId);
        }
    });
    /**
     * POST /email/drafts/:draftId/send
     * Send a draft - REQUIRES APPROVAL
     */
    router.post('/accounts/:accountId/email/drafts/:draftId/send', validateAccount, async (req, res) => {
        const account = req.account;
        const tenantId = req.tenantId;
        const userId = req.userId;
        const correlationId = req.correlationId;
        const draftId = req.params.draftId;
        const approvalId = req.body.approvalId;
        const timer = new AuditTimer(auditService, {
            tenantId,
            userId,
            accountId: account.id,
            action: 'email.send',
            resourceType: 'email',
            resourceId: draftId,
            correlationId
        });
        try {
            // Check if approval is required
            if (!approvalId) {
                // Create approval request
                const adapter = account.provider === 'GOOGLE' ? gmailAdapter : msMailAdapter;
                const draft = await adapter.getDraft(account.id, draftId);
                const approval = await approvalService.createApproval({
                    tenantId,
                    userId,
                    accountId: account.id,
                    actionType: 'SEND_EMAIL',
                    actionPayload: {
                        draftId,
                        to: draft.to,
                        subject: draft.subject
                    },
                    correlationId
                });
                await auditService.logPendingApproval({
                    tenantId,
                    userId,
                    accountId: account.id,
                    action: 'email.send',
                    resourceType: 'email',
                    resourceId: draftId,
                    correlationId,
                    metadata: { approvalId: approval.approvalId }
                });
                return res.status(202).json({
                    requiresApproval: true,
                    approvalId: approval.approvalId,
                    expiresAt: approval.expiresAt,
                    riskLevel: approval.riskLevel
                });
            }
            // Validate approval
            const validation = await approvalService.validateApproval(approvalId, tenantId, userId, 'SEND_EMAIL');
            if (!validation.isValid) {
                return res.status(403).json({
                    type: 'https://api.aaliyah.ai/errors/approval-invalid',
                    title: 'Invalid approval',
                    status: 403,
                    detail: validation.error
                });
            }
            // Execute send
            const adapter = account.provider === 'GOOGLE' ? gmailAdapter : msMailAdapter;
            const message = await adapter.sendDraft(account.id, draftId);
            // Mark approval as executed
            await approvalService.markExecuted(approvalId);
            await timer.success({ messageId: message.id });
            res.json(message);
        }
        catch (error) {
            await timer.failure(error instanceof ConnectorApiError ? error.code : 'UNKNOWN_ERROR');
            handleApiError(res, error, correlationId);
        }
    });
    // ==========================================
    // CALENDAR ROUTES
    // ==========================================
    /**
     * GET /calendar/events
     * List calendar events
     */
    router.get('/accounts/:accountId/calendar/events', validateAccount, async (req, res) => {
        const account = req.account;
        const correlationId = req.correlationId;
        try {
            const adapter = account.provider === 'GOOGLE' ? googleCalendarAdapter : msCalendarAdapter;
            const result = await adapter.listEvents(account.id, {
                calendarId: req.query.calendarId,
                timeMin: req.query.timeMin ? new Date(req.query.timeMin) : undefined,
                timeMax: req.query.timeMax ? new Date(req.query.timeMax) : undefined,
                maxResults: parseInt(req.query.limit) || 50,
                pageToken: req.query.pageToken,
                singleEvents: req.query.singleEvents !== 'false'
            });
            res.json(result);
        }
        catch (error) {
            handleApiError(res, error, correlationId);
        }
    });
    /**
     * POST /calendar/events
     * Create calendar event
     */
    router.post('/accounts/:accountId/calendar/events', validateAccount, async (req, res) => {
        const account = req.account;
        const tenantId = req.tenantId;
        const userId = req.userId;
        const correlationId = req.correlationId;
        const schema = z.object({
            calendarId: z.string(),
            title: z.string(),
            description: z.string().optional(),
            location: z.string().optional(),
            start: z.object({
                dateTime: z.string().optional(),
                date: z.string().optional(),
                timezone: z.string().optional()
            }),
            end: z.object({
                dateTime: z.string().optional(),
                date: z.string().optional(),
                timezone: z.string().optional()
            }),
            attendees: z.array(z.object({
                email: z.string().email(),
                name: z.string().optional(),
                isOptional: z.boolean().optional()
            })).optional(),
            createConference: z.boolean().optional()
        });
        try {
            const data = schema.parse(req.body);
            const adapter = account.provider === 'GOOGLE' ? googleCalendarAdapter : msCalendarAdapter;
            const event = await adapter.createEvent(account.id, {
                ...data,
                start: {
                    dateTime: data.start.dateTime ? new Date(data.start.dateTime) : undefined,
                    date: data.start.date,
                    timezone: data.start.timezone
                },
                end: {
                    dateTime: data.end.dateTime ? new Date(data.end.dateTime) : undefined,
                    date: data.end.date,
                    timezone: data.end.timezone
                }
            });
            await auditService.logSuccess({
                tenantId,
                userId,
                accountId: account.id,
                action: 'calendar.event.create',
                resourceType: 'event',
                resourceId: event.id,
                correlationId
            });
            res.status(201).json(event);
        }
        catch (error) {
            handleApiError(res, error, correlationId);
        }
    });
    /**
     * DELETE /calendar/events/:eventId
     * Delete calendar event - REQUIRES APPROVAL
     */
    router.delete('/accounts/:accountId/calendar/events/:eventId', validateAccount, async (req, res) => {
        const account = req.account;
        const tenantId = req.tenantId;
        const userId = req.userId;
        const correlationId = req.correlationId;
        const eventId = req.params.eventId;
        const calendarId = req.query.calendarId || 'primary';
        const approvalId = req.body?.approvalId;
        try {
            if (!approvalId) {
                const approval = await approvalService.createApproval({
                    tenantId,
                    userId,
                    accountId: account.id,
                    actionType: 'DELETE_EVENT',
                    actionPayload: { eventId, calendarId },
                    correlationId
                });
                return res.status(202).json({
                    requiresApproval: true,
                    approvalId: approval.approvalId,
                    expiresAt: approval.expiresAt
                });
            }
            const validation = await approvalService.validateApproval(approvalId, tenantId, userId, 'DELETE_EVENT');
            if (!validation.isValid) {
                return res.status(403).json({
                    type: 'https://api.aaliyah.ai/errors/approval-invalid',
                    title: 'Invalid approval',
                    status: 403,
                    detail: validation.error
                });
            }
            const adapter = account.provider === 'GOOGLE' ? googleCalendarAdapter : msCalendarAdapter;
            await adapter.deleteEvent(account.id, { calendarId, eventId });
            await approvalService.markExecuted(approvalId);
            await auditService.logSuccess({
                tenantId,
                userId,
                accountId: account.id,
                action: 'calendar.event.delete',
                resourceType: 'event',
                resourceId: eventId,
                correlationId
            });
            res.status(204).send();
        }
        catch (error) {
            handleApiError(res, error, correlationId);
        }
    });
    // ==========================================
    // APPROVAL ROUTES
    // ==========================================
    /**
     * GET /approvals
     * List pending approvals
     */
    router.get('/approvals', async (req, res) => {
        const tenantId = req.tenantId;
        const userId = req.userId;
        try {
            const approvals = await approvalService.listPending(tenantId, userId);
            res.json({ approvals });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to list approvals' });
        }
    });
    /**
     * POST /approvals/:approvalId/approve
     * Approve a pending action
     */
    router.post('/approvals/:approvalId/approve', async (req, res) => {
        const tenantId = req.tenantId;
        const userId = req.userId;
        try {
            const result = await approvalService.approve(req.params.approvalId, tenantId, userId);
            res.json(result);
        }
        catch (error) {
            res.status(400).json({
                type: 'https://api.aaliyah.ai/errors/approval-failed',
                title: 'Approval failed',
                status: 400,
                detail: error.message
            });
        }
    });
    /**
     * POST /approvals/:approvalId/reject
     * Reject a pending action
     */
    router.post('/approvals/:approvalId/reject', async (req, res) => {
        const tenantId = req.tenantId;
        const userId = req.userId;
        try {
            const result = await approvalService.reject(req.params.approvalId, tenantId, userId);
            res.json(result);
        }
        catch (error) {
            res.status(400).json({
                type: 'https://api.aaliyah.ai/errors/rejection-failed',
                title: 'Rejection failed',
                status: 400,
                detail: error.message
            });
        }
    });
    return router;
}
// ============================================
// ERROR HANDLER
// ============================================
function handleApiError(res, error, correlationId) {
    logger.error({ error, correlationId }, 'API error');
    if (error instanceof ConnectorApiError) {
        return res.status(error.statusCode).json({
            type: `https://api.aaliyah.ai/errors/${error.code.toLowerCase()}`,
            title: error.message,
            status: error.statusCode,
            correlationId,
            retryable: error.retryable,
            details: error.details
        });
    }
    if (error instanceof z.ZodError) {
        return res.status(400).json({
            type: 'https://api.aaliyah.ai/errors/validation',
            title: 'Validation error',
            status: 400,
            correlationId,
            errors: error.errors
        });
    }
    res.status(500).json({
        type: 'https://api.aaliyah.ai/errors/internal',
        title: 'Internal server error',
        status: 500,
        correlationId
    });
}
//# sourceMappingURL=index.js.map