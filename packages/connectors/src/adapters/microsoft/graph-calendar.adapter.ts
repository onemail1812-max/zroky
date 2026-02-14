/**
 * Microsoft Graph Calendar Adapter
 * 
 * Implements CalendarProvider interface for Microsoft Graph API.
 */

import { Client } from '@microsoft/microsoft-graph-client';
import type {
    CalendarProvider,
    ListCalendarsOptions,
    ListEventsOptions,
    GetEventOptions,
    CreateEventOptions,
    UpdateEventOptions,
    DeleteEventOptions,
    RespondToEventOptions
} from '../../interfaces/calendar-provider.js';
import type {
    Calendar,
    CalendarEvent,
    FreeBusyRequest,
    FreeBusyResponse,
    EventDateTime,
    Attendee,
    Reminder,
    SyncResult,
    ConferenceData
} from '../../models/index.js';
import { ConnectorApiError } from '../../models/index.js';
import { TokenService } from '../../services/token.service.js';
import { logger } from '../../utils/logger.js';

// ============================================
// TYPES
// ============================================

interface GraphEvent {
    id: string;
    subject: string;
    body?: { contentType: string; content: string };
    bodyPreview?: string;
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
    isAllDay: boolean;
    location?: { displayName: string };
    organizer?: { emailAddress: { address: string; name?: string } };
    attendees?: Array<{
        emailAddress: { address: string; name?: string };
        type: string;
        status: { response: string };
    }>;
    showAs: string;
    sensitivity: string;
    isReminderOn: boolean;
    reminderMinutesBeforeStart?: number;
    recurrence?: any;
    seriesMasterId?: string;
    isCancelled: boolean;
    onlineMeeting?: { joinUrl: string };
    createdDateTime: string;
    lastModifiedDateTime: string;
    webLink?: string;
    iCalUId?: string;
}

interface GraphCalendar {
    id: string;
    name: string;
    color?: string;
    isDefaultCalendar: boolean;
    canEdit: boolean;
    owner?: { address: string; name?: string };
}

// ============================================
// MICROSOFT GRAPH CALENDAR ADAPTER
// ============================================

export class MicrosoftGraphCalendarAdapter implements CalendarProvider {
    readonly providerId = 'microsoft' as const;

    private readonly tokenService: TokenService;

    constructor(tokenService: TokenService) {
        this.tokenService = tokenService;
    }

    // ==========================================
    // CALENDARS
    // ==========================================

    async listCalendars(
        accountId: string,
        options: ListCalendarsOptions = {}
    ): Promise<Calendar[]> {
        const client = await this.getClient(accountId);

        try {
            const response = await client.api('/me/calendars')
                .select('id,name,color,isDefaultCalendar,canEdit,owner')
                .get();

            return response.value.map((cal: GraphCalendar) =>
                this.normalizeCalendar(cal, accountId)
            );
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    async getCalendar(accountId: string, calendarId: string): Promise<Calendar> {
        const client = await this.getClient(accountId);

        try {
            const calendar = await client.api(`/me/calendars/${calendarId}`)
                .select('id,name,color,isDefaultCalendar,canEdit,owner')
                .get();

            return this.normalizeCalendar(calendar, accountId);
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    async getPrimaryCalendar(accountId: string): Promise<Calendar> {
        const client = await this.getClient(accountId);

        try {
            const calendar = await client.api('/me/calendar')
                .select('id,name,color,isDefaultCalendar,canEdit,owner')
                .get();

            return this.normalizeCalendar(calendar, accountId);
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    // ==========================================
    // EVENTS
    // ==========================================

    async listEvents(
        accountId: string,
        options: ListEventsOptions = {}
    ): Promise<SyncResult<CalendarEvent>> {
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

            const events = response.value.map((event: GraphEvent) =>
                this.normalizeEvent(event, accountId, calendarId)
            );

            let nextPageToken: string | undefined;
            if (response['@odata.nextLink']) {
                const match = response['@odata.nextLink'].match(/\$skiptoken=([^&]+)/);
                if (match) nextPageToken = match[1];
            }

            return {
                items: events,
                nextPageToken,
                hasMore: !!response['@odata.nextLink']
            };
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    async getEvent(
        accountId: string,
        calendarId: string,
        eventId: string,
        options: GetEventOptions = {}
    ): Promise<CalendarEvent> {
        const client = await this.getClient(accountId);

        try {
            const event = await client.api(`/me/calendars/${calendarId}/events/${eventId}`)
                .select('id,subject,body,bodyPreview,start,end,isAllDay,location,organizer,attendees,showAs,sensitivity,isReminderOn,reminderMinutesBeforeStart,recurrence,seriesMasterId,isCancelled,onlineMeeting,createdDateTime,lastModifiedDateTime,webLink,iCalUId')
                .get();

            return this.normalizeEvent(event, accountId, calendarId);
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    async searchEvents(
        accountId: string,
        query: string,
        options: Omit<ListEventsOptions, 'query'> = {}
    ): Promise<SyncResult<CalendarEvent>> {
        const client = await this.getClient(accountId);
        const calendarId = options.calendarId || 'calendar';

        try {
            const response = await client.api(`/me/calendars/${calendarId}/events`)
                .filter(`contains(subject,'${query}')`)
                .top(options.maxResults || 50)
                .get();

            const events = response.value.map((event: GraphEvent) =>
                this.normalizeEvent(event, accountId, calendarId)
            );

            return {
                items: events,
                hasMore: !!response['@odata.nextLink']
            };
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    async createEvent(
        accountId: string,
        options: CreateEventOptions
    ): Promise<CalendarEvent> {
        const client = await this.getClient(accountId);

        try {
            const event: Record<string, unknown> = {
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
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    async updateEvent(
        accountId: string,
        options: UpdateEventOptions
    ): Promise<CalendarEvent> {
        const client = await this.getClient(accountId);

        try {
            const update: Record<string, unknown> = {};

            if (options.title !== undefined) update.subject = options.title;
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
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    async deleteEvent(
        accountId: string,
        options: DeleteEventOptions
    ): Promise<void> {
        const client = await this.getClient(accountId);

        try {
            await client
                .api(`/me/calendars/${options.calendarId}/events/${options.eventId}`)
                .delete();
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    async respondToEvent(
        accountId: string,
        options: RespondToEventOptions
    ): Promise<CalendarEvent> {
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
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    // ==========================================
    // AVAILABILITY
    // ==========================================

    async getFreeBusy(
        accountId: string,
        request: FreeBusyRequest
    ): Promise<FreeBusyResponse> {
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

            const calendars: FreeBusyResponse['calendars'] = {};

            for (const schedule of response.value) {
                calendars[schedule.scheduleId] = {
                    busy: (schedule.scheduleItems || []).map((item: any) => ({
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
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    async findAvailableTimes(
        accountId: string,
        options: {
            attendees: string[];
            duration: number;
            timeMin: Date;
            timeMax: Date;
            timezone?: string;
        }
    ): Promise<{
        suggestions: { start: Date; end: Date; confidence: number }[];
    }> {
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
                suggestions: (response.meetingTimeSuggestions || []).map((s: any) => ({
                    start: new Date(s.meetingTimeSlot.start.dateTime),
                    end: new Date(s.meetingTimeSlot.end.dateTime),
                    confidence: s.confidence / 100
                }))
            };
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    // ==========================================
    // SYNC
    // ==========================================

    async getIncrementalChanges(
        accountId: string,
        options: {
            calendarId?: string;
            deltaLink?: string;
        }
    ): Promise<{
        events: CalendarEvent[];
        deletedEventIds: string[];
        nextDeltaLink?: string;
    }> {
        const client = await this.getClient(accountId);
        const calendarId = options.calendarId || 'calendar';

        try {
            let query;

            if (options.deltaLink) {
                query = client.api(options.deltaLink);
            } else {
                query = client.api(`/me/calendars/${calendarId}/events/delta`);
            }

            const response = await query.get();

            const events: CalendarEvent[] = [];
            const deletedEventIds: string[] = [];

            for (const event of response.value) {
                if (event['@removed']) {
                    deletedEventIds.push(event.id);
                } else {
                    events.push(this.normalizeEvent(event, accountId, calendarId));
                }
            }

            return {
                events,
                deletedEventIds,
                nextDeltaLink: response['@odata.deltaLink']
            };
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    async setupSubscription(
        accountId: string,
        options: {
            webhookUrl: string;
            calendarId?: string;
        }
    ): Promise<{
        subscriptionId: string;
        expiration: Date;
        resourceId?: string;
    }> {
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
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    async renewSubscription(
        accountId: string,
        subscriptionId: string
    ): Promise<{ expiration: Date }> {
        const client = await this.getClient(accountId);

        try {
            const response = await client.api(`/subscriptions/${subscriptionId}`).patch({
                expirationDateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
            });

            return {
                expiration: new Date(response.expirationDateTime)
            };
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    async stopSubscription(
        accountId: string,
        subscriptionId: string
    ): Promise<void> {
        const client = await this.getClient(accountId);

        try {
            await client.api(`/subscriptions/${subscriptionId}`).delete();
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

    private normalizeCalendar(cal: GraphCalendar, accountId: string): Calendar {
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

    private normalizeEvent(
        event: GraphEvent,
        accountId: string,
        calendarId: string
    ): CalendarEvent {
        const organizer: Attendee = {
            email: event.organizer?.emailAddress?.address || 'unknown@unknown.com',
            name: event.organizer?.emailAddress?.name,
            isOrganizer: true,
            isOptional: false,
            responseStatus: 'accepted'
        };

        const attendees: Attendee[] = (event.attendees || []).map(a => ({
            email: a.emailAddress.address,
            name: a.emailAddress.name,
            isOrganizer: false,
            isOptional: a.type === 'optional',
            responseStatus: this.mapResponseStatus(a.status.response)
        }));

        const reminders: Reminder[] = event.isReminderOn && event.reminderMinutesBeforeStart
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

    private toGraphDateTime(
        dt: EventDateTime,
        timezone?: string
    ): { dateTime: string; timeZone: string } {
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

    private fromGraphDateTime(
        dt: { dateTime: string; timeZone: string }
    ): EventDateTime {
        return {
            dateTime: new Date(dt.dateTime + (dt.dateTime.includes('Z') ? '' : 'Z')),
            timezone: dt.timeZone
        };
    }

    private mapResponseStatus(status: string): Attendee['responseStatus'] {
        switch (status.toLowerCase()) {
            case 'accepted': return 'accepted';
            case 'declined': return 'declined';
            case 'tentativelyaccepted': return 'tentative';
            default: return 'needsAction';
        }
    }

    private normalizeError(error: unknown): ConnectorApiError {
        if (error instanceof ConnectorApiError) return error;

        const err = error as any;

        if (err.statusCode) {
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
