/**
 * Google Calendar Adapter
 *
 * Implements CalendarProvider interface for Google Calendar API.
 */
import { google } from 'googleapis';
import { ConnectorApiError } from '../../models/index.js';
// ============================================
// GOOGLE CALENDAR ADAPTER
// ============================================
export class GoogleCalendarAdapter {
    providerId = 'google';
    tokenService;
    constructor(tokenService) {
        this.tokenService = tokenService;
    }
    // ==========================================
    // CALENDARS
    // ==========================================
    async listCalendars(accountId, options = {}) {
        const calendar = await this.getClient(accountId);
        try {
            const response = await calendar.calendarList.list({
                showHidden: options.includeHidden
            });
            return (response.data.items || []).map(cal => this.normalizeCalendar(cal, accountId));
        }
        catch (error) {
            throw this.normalizeError(error);
        }
    }
    async getCalendar(accountId, calendarId) {
        const calendar = await this.getClient(accountId);
        try {
            const response = await calendar.calendarList.get({
                calendarId
            });
            return this.normalizeCalendar(response.data, accountId);
        }
        catch (error) {
            throw this.normalizeError(error);
        }
    }
    async getPrimaryCalendar(accountId) {
        return this.getCalendar(accountId, 'primary');
    }
    // ==========================================
    // EVENTS
    // ==========================================
    async listEvents(accountId, options = {}) {
        const calendar = await this.getClient(accountId);
        try {
            const response = await calendar.events.list({
                calendarId: options.calendarId || 'primary',
                timeMin: options.timeMin?.toISOString(),
                timeMax: options.timeMax?.toISOString(),
                q: options.query,
                showDeleted: options.showDeleted,
                singleEvents: options.singleEvents,
                maxResults: options.maxResults || 50,
                pageToken: options.pageToken,
                syncToken: options.syncToken,
                orderBy: options.singleEvents ? 'startTime' : undefined
            });
            const events = (response.data.items || []).map(event => this.normalizeEvent(event, accountId, options.calendarId || 'primary'));
            return {
                items: events,
                nextPageToken: response.data.nextPageToken || undefined,
                nextSyncToken: response.data.nextSyncToken || undefined,
                hasMore: !!response.data.nextPageToken
            };
        }
        catch (error) {
            throw this.normalizeError(error);
        }
    }
    async getEvent(accountId, calendarId, eventId, options = {}) {
        const calendar = await this.getClient(accountId);
        try {
            const response = await calendar.events.get({
                calendarId,
                eventId,
                maxAttendees: options.maxAttendees,
                timeZone: options.timeZone
            });
            return this.normalizeEvent(response.data, accountId, calendarId);
        }
        catch (error) {
            throw this.normalizeError(error);
        }
    }
    async searchEvents(accountId, query, options = {}) {
        return this.listEvents(accountId, { ...options, query });
    }
    async createEvent(accountId, options) {
        const calendar = await this.getClient(accountId);
        try {
            const requestBody = {
                summary: options.title,
                description: options.description,
                location: options.location,
                start: this.toGoogleDateTime(options.start),
                end: this.toGoogleDateTime(options.end),
                attendees: options.attendees?.map(a => ({
                    email: a.email,
                    displayName: a.name,
                    optional: a.isOptional
                })),
                visibility: options.visibility,
                transparency: options.transparency,
                reminders: options.reminders ? {
                    useDefault: options.useDefaultReminders ?? false,
                    overrides: options.reminders.map(r => ({
                        method: r.method,
                        minutes: r.minutes
                    }))
                } : undefined,
                recurrence: options.recurrence ? [this.toRRule(options.recurrence)] : undefined,
                conferenceData: options.createConference ? {
                    createRequest: {
                        requestId: `${Date.now()}`,
                        conferenceSolutionKey: {
                            type: options.conferenceType === 'hangoutsMeet' ? 'hangoutsMeet' : 'addOn'
                        }
                    }
                } : undefined
            };
            const response = await calendar.events.insert({
                calendarId: options.calendarId,
                requestBody,
                sendUpdates: options.sendUpdates || 'none',
                conferenceDataVersion: options.createConference ? 1 : undefined
            });
            return this.normalizeEvent(response.data, accountId, options.calendarId);
        }
        catch (error) {
            throw this.normalizeError(error);
        }
    }
    async updateEvent(accountId, options) {
        const calendar = await this.getClient(accountId);
        try {
            // Get existing event
            const existing = await this.getEvent(accountId, options.calendarId, options.eventId);
            const requestBody = {
                summary: options.title ?? existing.title,
                description: options.description ?? existing.description,
                location: options.location ?? existing.location,
                start: options.start ? this.toGoogleDateTime(options.start) : undefined,
                end: options.end ? this.toGoogleDateTime(options.end) : undefined,
                attendees: options.attendees?.map(a => ({
                    email: a.email,
                    displayName: a.name,
                    optional: a.isOptional
                })),
                visibility: options.visibility,
                reminders: options.reminders ? {
                    overrides: options.reminders.map(r => ({
                        method: r.method,
                        minutes: r.minutes
                    }))
                } : undefined
            };
            const response = await calendar.events.patch({
                calendarId: options.calendarId,
                eventId: options.eventId,
                requestBody,
                sendUpdates: options.sendUpdates || 'none'
            });
            return this.normalizeEvent(response.data, accountId, options.calendarId);
        }
        catch (error) {
            throw this.normalizeError(error);
        }
    }
    async deleteEvent(accountId, options) {
        const calendar = await this.getClient(accountId);
        try {
            await calendar.events.delete({
                calendarId: options.calendarId,
                eventId: options.eventId,
                sendUpdates: options.sendUpdates || 'none'
            });
        }
        catch (error) {
            throw this.normalizeError(error);
        }
    }
    async respondToEvent(accountId, options) {
        const calendar = await this.getClient(accountId);
        try {
            // Get current event
            const event = await calendar.events.get({
                calendarId: options.calendarId,
                eventId: options.eventId
            });
            // Find self in attendees and update response
            const attendees = event.data.attendees?.map(a => {
                if (a.self) {
                    return {
                        ...a,
                        responseStatus: options.response,
                        comment: options.comment
                    };
                }
                return a;
            });
            const response = await calendar.events.patch({
                calendarId: options.calendarId,
                eventId: options.eventId,
                requestBody: { attendees },
                sendUpdates: options.sendResponse ? 'all' : 'none'
            });
            return this.normalizeEvent(response.data, accountId, options.calendarId);
        }
        catch (error) {
            throw this.normalizeError(error);
        }
    }
    // ==========================================
    // AVAILABILITY
    // ==========================================
    async getFreeBusy(accountId, request) {
        const calendar = await this.getClient(accountId);
        try {
            const response = await calendar.freebusy.query({
                requestBody: {
                    timeMin: request.timeMin.toISOString(),
                    timeMax: request.timeMax.toISOString(),
                    items: request.calendars.map(id => ({ id }))
                }
            });
            const calendars = {};
            for (const [calId, data] of Object.entries(response.data.calendars || {})) {
                calendars[calId] = {
                    busy: (data.busy || []).map(b => ({
                        start: new Date(b.start),
                        end: new Date(b.end)
                    })),
                    errors: data.errors?.map(e => ({
                        domain: e.domain || 'unknown',
                        reason: e.reason || 'unknown'
                    }))
                };
            }
            return { calendars };
        }
        catch (error) {
            throw this.normalizeError(error);
        }
    }
    async findAvailableTimes(accountId, options) {
        // Get free/busy for all attendees
        const freeBusy = await this.getFreeBusy(accountId, {
            timeMin: options.timeMin,
            timeMax: options.timeMax,
            calendars: options.attendees
        });
        // Merge all busy times
        const allBusy = [];
        for (const cal of Object.values(freeBusy.calendars)) {
            allBusy.push(...cal.busy);
        }
        // Sort by start time
        allBusy.sort((a, b) => a.start.getTime() - b.start.getTime());
        // Find gaps that fit the duration
        const suggestions = [];
        let current = new Date(options.timeMin);
        for (const busy of allBusy) {
            const gap = busy.start.getTime() - current.getTime();
            const durationMs = options.duration * 60 * 1000;
            if (gap >= durationMs) {
                suggestions.push({
                    start: new Date(current),
                    end: new Date(current.getTime() + durationMs),
                    confidence: 1.0
                });
                if (suggestions.length >= 5)
                    break;
            }
            current = new Date(Math.max(current.getTime(), busy.end.getTime()));
        }
        // Check remaining time
        if (suggestions.length < 5) {
            const remaining = options.timeMax.getTime() - current.getTime();
            const durationMs = options.duration * 60 * 1000;
            if (remaining >= durationMs) {
                suggestions.push({
                    start: new Date(current),
                    end: new Date(current.getTime() + durationMs),
                    confidence: 1.0
                });
            }
        }
        return { suggestions };
    }
    // ==========================================
    // SYNC
    // ==========================================
    async getIncrementalChanges(accountId, options) {
        const calendar = await this.getClient(accountId);
        const calendarId = options.calendarId || 'primary';
        try {
            const response = await calendar.events.list({
                calendarId,
                syncToken: options.syncToken,
                showDeleted: true
            });
            const events = [];
            const deletedEventIds = [];
            for (const event of response.data.items || []) {
                if (event.status === 'cancelled') {
                    deletedEventIds.push(event.id);
                }
                else {
                    events.push(this.normalizeEvent(event, accountId, calendarId));
                }
            }
            return {
                events,
                deletedEventIds,
                nextSyncToken: response.data.nextSyncToken || undefined
            };
        }
        catch (error) {
            throw this.normalizeError(error);
        }
    }
    async setupSubscription(accountId, options) {
        const calendar = await this.getClient(accountId);
        try {
            const channelId = `calendar-${accountId}-${Date.now()}`;
            const response = await calendar.events.watch({
                calendarId: options.calendarId || 'primary',
                requestBody: {
                    id: channelId,
                    type: 'web_hook',
                    address: options.webhookUrl,
                    expiration: String(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
                }
            });
            return {
                subscriptionId: response.data.id,
                expiration: new Date(parseInt(response.data.expiration)),
                resourceId: response.data.resourceId || undefined
            };
        }
        catch (error) {
            throw this.normalizeError(error);
        }
    }
    async renewSubscription(accountId, subscriptionId) {
        // Google Calendar doesn't support renewing, need to create new
        throw new ConnectorApiError('NOT_SUPPORTED', 'Google Calendar subscriptions cannot be renewed, create a new one instead', 400);
    }
    async stopSubscription(accountId, subscriptionId) {
        const calendar = await this.getClient(accountId);
        try {
            await calendar.channels.stop({
                requestBody: {
                    id: subscriptionId,
                    resourceId: subscriptionId
                }
            });
        }
        catch (error) {
            throw this.normalizeError(error);
        }
    }
    // ==========================================
    // PRIVATE METHODS
    // ==========================================
    async getClient(accountId) {
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
            const refreshed = await this.tokenService.refreshTokensWithLock(accountId, account.tenantId, async (refreshToken) => {
                const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
                oauth2Client.setCredentials({ refresh_token: refreshToken });
                const { credentials } = await oauth2Client.refreshAccessToken();
                return {
                    accessToken: credentials.access_token,
                    refreshToken: credentials.refresh_token || refreshToken,
                    expiresAt: new Date(credentials.expiry_date),
                    scope: credentials.scope,
                    tokenType: credentials.token_type
                };
            });
            accessToken = refreshed.accessToken;
        }
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: accessToken });
        return google.calendar({ version: 'v3', auth: oauth2Client });
    }
    normalizeCalendar(cal, accountId) {
        return {
            id: cal.id,
            accountId,
            name: cal.summary,
            description: cal.description || undefined,
            isPrimary: cal.primary || false,
            isOwner: cal.accessRole === 'owner',
            accessRole: cal.accessRole,
            timezone: cal.timeZone || undefined,
            color: cal.backgroundColor || undefined,
            providerCalendarId: cal.id
        };
    }
    normalizeEvent(event, accountId, calendarId) {
        const organizer = {
            email: event.organizer?.email || 'unknown@unknown.com',
            name: event.organizer?.displayName || undefined,
            isOrganizer: true,
            isOptional: false,
            responseStatus: 'accepted'
        };
        const attendees = (event.attendees || []).map(a => ({
            email: a.email,
            name: a.displayName || undefined,
            isOrganizer: a.organizer || false,
            isOptional: a.optional || false,
            responseStatus: (a.responseStatus || 'needsAction'),
            comment: a.comment || undefined
        }));
        const reminders = (event.reminders?.overrides || []).map(r => ({
            method: r.method,
            minutes: r.minutes
        }));
        return {
            id: event.id,
            accountId,
            calendarId,
            title: event.summary || '(No title)',
            description: event.description || undefined,
            location: event.location || undefined,
            start: this.fromGoogleDateTime(event.start),
            end: this.fromGoogleDateTime(event.end),
            isAllDay: !!event.start?.date,
            timezone: event.start?.timeZone || undefined,
            recurrence: event.recurrence ? this.parseRRule(event.recurrence[0]) : undefined,
            recurringEventId: event.recurringEventId || undefined,
            originalStartTime: event.originalStartTime?.dateTime
                ? new Date(event.originalStartTime.dateTime)
                : undefined,
            organizer,
            attendees,
            status: (event.status || 'confirmed'),
            visibility: (event.visibility || 'default'),
            transparency: (event.transparency || 'opaque'),
            responseStatus: event.attendees?.find(a => a.self)?.responseStatus,
            conferenceData: event.conferenceData ? this.normalizeConference(event.conferenceData) : undefined,
            reminders,
            useDefaultReminders: event.reminders?.useDefault || false,
            createdAt: event.created ? new Date(event.created) : new Date(),
            updatedAt: event.updated ? new Date(event.updated) : new Date(),
            providerEventId: event.id,
            htmlLink: event.htmlLink || undefined,
            iCalUID: event.iCalUID || undefined
        };
    }
    normalizeConference(data) {
        return {
            type: data.conferenceSolution?.key?.type === 'hangoutsMeet' ? 'hangoutsMeet' : 'other',
            conferenceId: data.conferenceId || undefined,
            entryPoints: (data.entryPoints || []).map(ep => ({
                type: ep.entryPointType,
                uri: ep.uri || undefined,
                label: ep.label || undefined,
                pin: ep.pin || undefined,
                regionCode: ep.regionCode || undefined
            })),
            notes: data.notes || undefined
        };
    }
    toGoogleDateTime(dt) {
        if (dt.date) {
            return { date: dt.date, timeZone: dt.timezone };
        }
        return {
            dateTime: dt.dateTime?.toISOString(),
            timeZone: dt.timezone
        };
    }
    fromGoogleDateTime(dt) {
        if (dt.date) {
            return { date: dt.date, timezone: dt.timeZone || undefined };
        }
        return {
            dateTime: dt.dateTime ? new Date(dt.dateTime) : undefined,
            timezone: dt.timeZone || undefined
        };
    }
    toRRule(rule) {
        if (rule.rrule)
            return rule.rrule;
        let rrule = `RRULE:FREQ=${rule.frequency.toUpperCase()}`;
        if (rule.interval)
            rrule += `;INTERVAL=${rule.interval}`;
        if (rule.count)
            rrule += `;COUNT=${rule.count}`;
        if (rule.until)
            rrule += `;UNTIL=${rule.until.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
        if (rule.byDay?.length)
            rrule += `;BYDAY=${rule.byDay.join(',')}`;
        if (rule.byMonthDay?.length)
            rrule += `;BYMONTHDAY=${rule.byMonthDay.join(',')}`;
        if (rule.byMonth?.length)
            rrule += `;BYMONTH=${rule.byMonth.join(',')}`;
        return rrule;
    }
    parseRRule(rrule) {
        const rule = { frequency: 'daily', rrule };
        const match = rrule.match(/FREQ=(\w+)/);
        if (match) {
            rule.frequency = match[1].toLowerCase();
        }
        const interval = rrule.match(/INTERVAL=(\d+)/);
        if (interval)
            rule.interval = parseInt(interval[1]);
        const count = rrule.match(/COUNT=(\d+)/);
        if (count)
            rule.count = parseInt(count[1]);
        return rule;
    }
    normalizeError(error) {
        if (error instanceof ConnectorApiError)
            return error;
        const err = error;
        if (err.code && err.message) {
            return new ConnectorApiError('PROVIDER_ERROR', err.message, typeof err.code === 'number' ? err.code : 500, err.code >= 500);
        }
        return new ConnectorApiError('UNKNOWN_ERROR', err.message || 'Unknown error', 500, true);
    }
}
//# sourceMappingURL=calendar.adapter.js.map