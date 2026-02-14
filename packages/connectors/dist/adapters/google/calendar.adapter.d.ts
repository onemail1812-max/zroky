/**
 * Google Calendar Adapter
 *
 * Implements CalendarProvider interface for Google Calendar API.
 */
import type { CalendarProvider, ListCalendarsOptions, ListEventsOptions, GetEventOptions, CreateEventOptions, UpdateEventOptions, DeleteEventOptions, RespondToEventOptions } from '../../interfaces/calendar-provider.js';
import type { Calendar, CalendarEvent, FreeBusyRequest, FreeBusyResponse, SyncResult } from '../../models/index.js';
import { TokenService } from '../../services/token.service.js';
export declare class GoogleCalendarAdapter implements CalendarProvider {
    readonly providerId: "google";
    private readonly tokenService;
    constructor(tokenService: TokenService);
    listCalendars(accountId: string, options?: ListCalendarsOptions): Promise<Calendar[]>;
    getCalendar(accountId: string, calendarId: string): Promise<Calendar>;
    getPrimaryCalendar(accountId: string): Promise<Calendar>;
    listEvents(accountId: string, options?: ListEventsOptions): Promise<SyncResult<CalendarEvent>>;
    getEvent(accountId: string, calendarId: string, eventId: string, options?: GetEventOptions): Promise<CalendarEvent>;
    searchEvents(accountId: string, query: string, options?: Omit<ListEventsOptions, 'query'>): Promise<SyncResult<CalendarEvent>>;
    createEvent(accountId: string, options: CreateEventOptions): Promise<CalendarEvent>;
    updateEvent(accountId: string, options: UpdateEventOptions): Promise<CalendarEvent>;
    deleteEvent(accountId: string, options: DeleteEventOptions): Promise<void>;
    respondToEvent(accountId: string, options: RespondToEventOptions): Promise<CalendarEvent>;
    getFreeBusy(accountId: string, request: FreeBusyRequest): Promise<FreeBusyResponse>;
    findAvailableTimes(accountId: string, options: {
        attendees: string[];
        duration: number;
        timeMin: Date;
        timeMax: Date;
        timezone?: string;
    }): Promise<{
        suggestions: {
            start: Date;
            end: Date;
            confidence: number;
        }[];
    }>;
    getIncrementalChanges(accountId: string, options: {
        calendarId?: string;
        syncToken?: string;
    }): Promise<{
        events: CalendarEvent[];
        deletedEventIds: string[];
        nextSyncToken?: string;
    }>;
    setupSubscription(accountId: string, options: {
        webhookUrl: string;
        calendarId?: string;
    }): Promise<{
        subscriptionId: string;
        expiration: Date;
        resourceId?: string;
    }>;
    renewSubscription(accountId: string, subscriptionId: string): Promise<{
        expiration: Date;
    }>;
    stopSubscription(accountId: string, subscriptionId: string): Promise<void>;
    private getClient;
    private normalizeCalendar;
    private normalizeEvent;
    private normalizeConference;
    private toGoogleDateTime;
    private fromGoogleDateTime;
    private toRRule;
    private parseRRule;
    private normalizeError;
}
//# sourceMappingURL=calendar.adapter.d.ts.map