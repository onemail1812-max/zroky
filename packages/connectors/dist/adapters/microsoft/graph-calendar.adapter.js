/**
 * Microsoft Graph Calendar Adapter
 *
 * Implements CalendarProvider interface for Microsoft Graph API.
 */
import { Client } from '@microsoft/microsoft-graph-client';
import { ConnectorApiError } from '../../models/index.js';
// ============================================
// MICROSOFT GRAPH CALENDAR ADAPTER
// ============================================
export class MicrosoftGraphCalendarAdapter {
    providerId = 'microsoft';
    tokenService;
    constructor(tokenService) {
        this.tokenService = tokenService;
    }
    // ==========================================
    // CALENDARS
    // ==========================================
    async listCalendars(accountId, options = {}) {
        const client = await this.getClient(accountId);
        try {
            const response = await client.api('/me/calendars')
                .select('id,name,color,isDefaultCalendar,canEdit,owner')
                .get();
            return response.value.map((cal) => this.normalizeCalendar(cal, accountId));
        }
        catch (error) {
            throw this.normalizeError(error);
        }
    }
    async getCalendar(accountId, calendarId) {
        const client = await this.getClient(accountId);
        try {
            const calendar = await client.api(`/me/calendars/${calendarId}`)
                .select('id,name,color,isDefaultCalendar,canEdit,owner')
                .get();
            return this.normalizeCalendar(calendar, accountId);
        }
        catch (error) {
            throw this.normalizeError(error);
        }
    }
    async getPrimaryCalendar(accountId) {
        const client = await this.getClient(accountId);
        try {
            const calendar = await client.api('/me/calendar')
                .select('id,name,color,isDefaultCalendar,canEdit,owner')
                .get();
            return this.normalizeCalendar(calendar, accountId);
        }
        catch (error) {
            throw this.normalizeError(error);
        }
    }
    // ==========================================
    // EVENTS
    // ==========================================
    async listEvents(accountId, options = {}) {
        const client = await this.getClient(accountId);
        const calendarId = options.calendarId || 'calendar';
        try {
            let query = client.api(`/me/calendars/${calendarId}/events`)
                .select('id,subject,body,bodyPreview,start,end,isAllDay,location,organizer,attendees,showAs,sensitivity,isReminderOn,reminderMinutesBeforeStart,recurrence,seriesMasterId,isCancelled,onlineMeeting,createdDateTime,lastModifiedDateTime,webLink,iCalUId')
                .orderby('start/dateTime')
                .top(options.maxResults || 50);
            if (options.timeMin) {
                query = query.filter(`start/dateTime ge '${options.timeMin.toISOString()}'`);
            }
            if (options.timeMax) {
                const existingFilter = options.timeMin
                    ? ` and end/dateTime le '${options.timeMax.toISOString()}'`
                    : `end/dateTime le '${options.timeMax.toISOString()}'`;
                query = query.filter(existingFilter);
            }
            if (options.pageToken) {
                query = query.skipToken(options.pageToken);
            }
            const response = await query.get();
            const events = response.value.map((event) => this.normalizeEvent(event, accountId, calendarId));
            let nextPageToken;
            if (response['@odata.nextLink']) {
                const match = response['@odata.nextLink'].match(/\$skiptoken=([^&]+)/);
                if (match)
                    nextPageToken = match[1];
            }
            return {
                items: events,
                nextPageToken,
                hasMore: !!response['@odata.nextLink']
            };
        }
        catch (error) {
            throw this.normalizeError(error);
        }
    }
    async getEvent(accountId, calendarId, eventId, options = {}) {
        const client = await this.getClient(accountId);
        try {
            const event = await client.api(`/me/calendars/${calendarId}/events/${eventId}`)
                .select('id,subject,body,bodyPreview,start,end,isAllDay,location,organizer,attendees,showAs,sensitivity,isReminderOn,reminderMinutesBeforeStart,recurrence,seriesMasterId,isCancelled,onlineMeeting,createdDateTime,lastModifiedDateTime,webLink,iCalUId')
                .get();
            return this.normalizeEvent(event, accountId, calendarId);
        }
        catch (error) {
            throw this.normalizeError(error);
        }
    }
    async searchEvents(accountId, query, options = {}) {
        const client = await this.getClient(accountId);
        const calendarId = options.calendarId || 'calendar';
        try {
            const response = await client.api(`/me/calendars/${calendarId}/events`)
                .filter(`contains(subject,'${query}')`)
                .top(options.maxResults || 50)
                .get();
            const events = response.value.map((event) => this.normalizeEvent(event, accountId, calendarId));
            return {
                items: events,
                hasMore: !!response['@odata.nextLink']
            };
        }
        catch (error) {
            throw this.normalizeError(error);
        }
    }
    async createEvent(accountId, options) {
        const client = await this.getClient(accountId);
        try {
            const event = {
                subject: options.title,
                body: {
                    contentType: 'html',
                    content: options.description || ''
                },
                start: this.toGraphDateTime(options.start, options.timezone),
                end: this.toGraphDateTime(options.end, options.timezone),
                isAllDay: options.isAllDay || false,
                location: options.location ? { displayName: options.location } : undefined,
                attendees: options.attendees?.map(a => ({
                    emailAddress: { address: a.email, name: a.name },
                    type: a.isOptional ? 'optional' : 'required'
                })),
                showAs: options.transparency === 'transparent' ? 'free' : 'busy',
                sensitivity: options.visibility === 'private' ? 'private' : 'normal'
            };
            if (options.reminders?.length) {
                event.isReminderOn = true;
                event.reminderMinutesBeforeStart = options.reminders[0].minutes;
            }
            if (options.createConference) {
                event.isOnlineMeeting = true;
                event.onlineMeetingProvider = 'teamsForBusiness';
            }
            const response = await client.api(`/me/calendars/${options.calendarId}/events`).post(event);
            return this.normalizeEvent(response, accountId, options.calendarId);
        }
        catch (error) {
            throw this.normalizeError(error);
        }
    }
    async updateEvent(accountId, options) {
        const client = await this.getClient(accountId);
        try {
            const update = {};
            if (options.title !== undefined)
                update.subject = options.title;
            if (options.description !== undefined) {
                update.body = { contentType: 'html', content: options.description };
            }
            if (options.location !== undefined) {
                update.location = { displayName: options.location };
            }
            if (options.start) {
                update.start = this.toGraphDateTime(options.start);
            }
            if (options.end) {
                update.end = this.toGraphDateTime(options.end);
            }
            if (options.attendees) {
                update.attendees = options.attendees.map(a => ({
                    emailAddress: { address: a.email, name: a.name },
                    type: a.isOptional ? 'optional' : 'required'
                }));
            }
            const response = await client
                .api(`/me/calendars/${options.calendarId}/events/${options.eventId}`)
                .patch(update);
            return this.normalizeEvent(response, accountId, options.calendarId);
        }
        catch (error) {
            throw this.normalizeError(error);
        }
    }
    async deleteEvent(accountId, options) {
        const client = await this.getClient(accountId);
        try {
            await client
                .api(`/me/calendars/${options.calendarId}/events/${options.eventId}`)
                .delete();
        }
        catch (error) {
            throw this.normalizeError(error);
        }
    }
    async respondToEvent(accountId, options) {
        const client = await this.getClient(accountId);
        try {
            const endpoint = options.response === 'accepted' ? 'accept'
                : options.response === 'declined' ? 'decline'
                    : 'tentativelyAccept';
            await client
                .api(`/me/calendars/${options.calendarId}/events/${options.eventId}/${endpoint}`)
                .post({
                comment: options.comment,
                sendResponse: options.sendResponse ?? true
            });
            return this.getEvent(accountId, options.calendarId, options.eventId);
        }
        catch (error) {
            throw this.normalizeError(error);
        }
    }
    // ==========================================
    // AVAILABILITY
    // ==========================================
    async getFreeBusy(accountId, request) {
        const client = await this.getClient(accountId);
        try {
            const response = await client.api('/me/calendar/getSchedule').post({
                schedules: request.calendars,
                startTime: {
                    dateTime: request.timeMin.toISOString(),
                    timeZone: 'UTC'
                },
                endTime: {
                    dateTime: request.timeMax.toISOString(),
                    timeZone: 'UTC'
                },
                availabilityViewInterval: 30
            });
            const calendars = {};
            for (const schedule of response.value) {
                calendars[schedule.scheduleId] = {
                    busy: (schedule.scheduleItems || []).map((item) => ({
                        start: new Date(item.start.dateTime),
                        end: new Date(item.end.dateTime)
                    })),
                    errors: schedule.error ? [{
                            domain: 'microsoft',
                            reason: schedule.error.message
                        }] : undefined
                };
            }
            return { calendars };
        }
        catch (error) {
            throw this.normalizeError(error);
        }
    }
    async findAvailableTimes(accountId, options) {
        const client = await this.getClient(accountId);
        try {
            const response = await client.api('/me/findMeetingTimes').post({
                attendees: options.attendees.map(email => ({
                    emailAddress: { address: email },
                    type: 'required'
                })),
                timeConstraint: {
                    timeslots: [{
                            start: {
                                dateTime: options.timeMin.toISOString(),
                                timeZone: options.timezone || 'UTC'
                            },
                            end: {
                                dateTime: options.timeMax.toISOString(),
                                timeZone: options.timezone || 'UTC'
                            }
                        }]
                },
                meetingDuration: `PT${options.duration}M`,
                maxCandidates: 5
            });
            return {
                suggestions: (response.meetingTimeSuggestions || []).map((s) => ({
                    start: new Date(s.meetingTimeSlot.start.dateTime),
                    end: new Date(s.meetingTimeSlot.end.dateTime),
                    confidence: s.confidence / 100
                }))
            };
        }
        catch (error) {
            throw this.normalizeError(error);
        }
    }
    // ==========================================
    // SYNC
    // ==========================================
    async getIncrementalChanges(accountId, options) {
        const client = await this.getClient(accountId);
        const calendarId = options.calendarId || 'calendar';
        try {
            let query;
            if (options.deltaLink) {
                query = client.api(options.deltaLink);
            }
            else {
                query = client.api(`/me/calendars/${calendarId}/events/delta`);
            }
            const response = await query.get();
            const events = [];
            const deletedEventIds = [];
            for (const event of response.value) {
                if (event['@removed']) {
                    deletedEventIds.push(event.id);
                }
                else {
                    events.push(this.normalizeEvent(event, accountId, calendarId));
                }
            }
            return {
                events,
                deletedEventIds,
                nextDeltaLink: response['@odata.deltaLink']
            };
        }
        catch (error) {
            throw this.normalizeError(error);
        }
    }
    async setupSubscription(accountId, options) {
        const client = await this.getClient(accountId);
        try {
            const subscription = {
                changeType: 'created,updated,deleted',
                notificationUrl: options.webhookUrl,
                resource: `/me/calendars/${options.calendarId || 'calendar'}/events`,
                expirationDateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                clientState: process.env.MICROSOFT_WEBHOOK_SECRET || 'aaliyah-calendar-secret'
            };
            const response = await client.api('/subscriptions').post(subscription);
            return {
                subscriptionId: response.id,
                expiration: new Date(response.expirationDateTime),
                resourceId: response.id
            };
        }
        catch (error) {
            throw this.normalizeError(error);
        }
    }
    async renewSubscription(accountId, subscriptionId) {
        const client = await this.getClient(accountId);
        try {
            const response = await client.api(`/subscriptions/${subscriptionId}`).patch({
                expirationDateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
            });
            return {
                expiration: new Date(response.expirationDateTime)
            };
        }
        catch (error) {
            throw this.normalizeError(error);
        }
    }
    async stopSubscription(accountId, subscriptionId) {
        const client = await this.getClient(accountId);
        try {
            await client.api(`/subscriptions/${subscriptionId}`).delete();
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
                const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        client_id: process.env.MICROSOFT_CLIENT_ID,
                        client_secret: process.env.MICROSOFT_CLIENT_SECRET,
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
            });
            accessToken = refreshed.accessToken;
        }
        return Client.init({
            authProvider: (done) => {
                done(null, accessToken);
            }
        });
    }
    normalizeCalendar(cal, accountId) {
        return {
            id: cal.id,
            accountId,
            name: cal.name,
            isPrimary: cal.isDefaultCalendar,
            isOwner: cal.canEdit,
            accessRole: cal.canEdit ? 'owner' : 'reader',
            color: cal.color,
            providerCalendarId: cal.id
        };
    }
    normalizeEvent(event, accountId, calendarId) {
        const organizer = {
            email: event.organizer?.emailAddress?.address || 'unknown@unknown.com',
            name: event.organizer?.emailAddress?.name,
            isOrganizer: true,
            isOptional: false,
            responseStatus: 'accepted'
        };
        const attendees = (event.attendees || []).map(a => ({
            email: a.emailAddress.address,
            name: a.emailAddress.name,
            isOrganizer: false,
            isOptional: a.type === 'optional',
            responseStatus: this.mapResponseStatus(a.status.response)
        }));
        const reminders = event.isReminderOn && event.reminderMinutesBeforeStart
            ? [{ method: 'popup', minutes: event.reminderMinutesBeforeStart }]
            : [];
        return {
            id: event.id,
            accountId,
            calendarId,
            title: event.subject || '(No title)',
            description: event.body?.content,
            location: event.location?.displayName,
            start: this.fromGraphDateTime(event.start),
            end: this.fromGraphDateTime(event.end),
            isAllDay: event.isAllDay,
            timezone: event.start.timeZone,
            recurringEventId: event.seriesMasterId,
            organizer,
            attendees,
            status: event.isCancelled ? 'cancelled' : 'confirmed',
            visibility: event.sensitivity === 'private' ? 'private' : 'default',
            transparency: event.showAs === 'free' ? 'transparent' : 'opaque',
            conferenceData: event.onlineMeeting ? {
                type: 'teams',
                entryPoints: [{
                        type: 'video',
                        uri: event.onlineMeeting.joinUrl
                    }]
            } : undefined,
            reminders,
            useDefaultReminders: !event.isReminderOn,
            createdAt: new Date(event.createdDateTime),
            updatedAt: new Date(event.lastModifiedDateTime),
            providerEventId: event.id,
            htmlLink: event.webLink,
            iCalUID: event.iCalUId
        };
    }
    toGraphDateTime(dt, timezone) {
        if (dt.date) {
            return {
                dateTime: `${dt.date}T00:00:00`,
                timeZone: timezone || dt.timezone || 'UTC'
            };
        }
        return {
            dateTime: dt.dateTime?.toISOString().replace('Z', '') || new Date().toISOString().replace('Z', ''),
            timeZone: timezone || dt.timezone || 'UTC'
        };
    }
    fromGraphDateTime(dt) {
        return {
            dateTime: new Date(dt.dateTime + (dt.dateTime.includes('Z') ? '' : 'Z')),
            timezone: dt.timeZone
        };
    }
    mapResponseStatus(status) {
        switch (status.toLowerCase()) {
            case 'accepted': return 'accepted';
            case 'declined': return 'declined';
            case 'tentativelyaccepted': return 'tentative';
            default: return 'needsAction';
        }
    }
    normalizeError(error) {
        if (error instanceof ConnectorApiError)
            return error;
        const err = error;
        if (err.statusCode) {
            return new ConnectorApiError('PROVIDER_ERROR', err.message || 'Microsoft Graph error', err.statusCode, err.statusCode >= 500);
        }
        return new ConnectorApiError('UNKNOWN_ERROR', err.message || 'Unknown error', 500, true);
    }
}
//# sourceMappingURL=graph-calendar.adapter.js.map