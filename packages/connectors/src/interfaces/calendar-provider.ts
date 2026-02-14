/**
 * Calendar Provider Interface
 * 
 * Unified interface for calendar operations across all providers.
 */

import type {
    Calendar,
    CalendarEvent,
    FreeBusyRequest,
    FreeBusyResponse,
    EventDateTime,
    Attendee,
    Reminder,
    EventVisibility,
    SyncResult,
    RecurrenceRule,
} from '../models/index.js';

// ============================================
// REQUEST TYPES
// ============================================

export interface ListCalendarsOptions {
    includeHidden?: boolean;
    includeSubscribed?: boolean;
}

export interface ListEventsOptions {
    calendarId?: string;

    // Time range (required for most queries)
    timeMin?: Date;
    timeMax?: Date;

    // Filtering
    query?: string;
    showDeleted?: boolean;
    singleEvents?: boolean; // Expand recurring events

    // Pagination
    maxResults?: number;
    pageToken?: string;

    // Sync
    syncToken?: string;
}

export interface GetEventOptions {
    // For recurring events
    maxAttendees?: number;
    timeZone?: string;
}

export interface CreateEventOptions {
    calendarId: string;

    title: string;
    description?: string;
    location?: string;

    start: EventDateTime;
    end: EventDateTime;

    isAllDay?: boolean;
    timezone?: string;

    attendees?: Omit<Attendee, 'responseStatus' | 'isOrganizer'>[];

    visibility?: EventVisibility;
    transparency?: 'opaque' | 'transparent';

    recurrence?: RecurrenceRule;

    reminders?: Reminder[];
    useDefaultReminders?: boolean;

    // Conference
    createConference?: boolean;
    conferenceType?: 'hangoutsMeet' | 'teamsForBusiness';

    // Notifications
    sendUpdates?: 'all' | 'externalOnly' | 'none';
}

export interface UpdateEventOptions {
    calendarId: string;
    eventId: string;

    title?: string;
    description?: string;
    location?: string;

    start?: EventDateTime;
    end?: EventDateTime;

    attendees?: Omit<Attendee, 'responseStatus' | 'isOrganizer'>[];

    visibility?: EventVisibility;

    reminders?: Reminder[];

    // For recurring events
    updateScope?: 'this' | 'thisAndFollowing' | 'all';

    sendUpdates?: 'all' | 'externalOnly' | 'none';
}

export interface DeleteEventOptions {
    calendarId: string;
    eventId: string;

    // For recurring events
    deleteScope?: 'this' | 'thisAndFollowing' | 'all';

    sendUpdates?: 'all' | 'externalOnly' | 'none';
}

export interface RespondToEventOptions {
    calendarId: string;
    eventId: string;

    response: 'accepted' | 'tentative' | 'declined';

    comment?: string;

    sendResponse?: boolean;
}

// ============================================
// CALENDAR PROVIDER INTERFACE
// ============================================

export interface CalendarProvider {
    /**
     * Provider identifier
     */
    readonly providerId: 'google' | 'microsoft';

    // ==========================================
    // CALENDARS
    // ==========================================

    /**
     * List all calendars the user has access to
     */
    listCalendars(
        accountId: string,
        options?: ListCalendarsOptions
    ): Promise<Calendar[]>;

    /**
     * Get a specific calendar
     */
    getCalendar(
        accountId: string,
        calendarId: string
    ): Promise<Calendar>;

    /**
     * Get the primary calendar
     */
    getPrimaryCalendar(
        accountId: string
    ): Promise<Calendar>;

    // ==========================================
    // EVENTS
    // ==========================================

    /**
     * List events with optional filtering
     */
    listEvents(
        accountId: string,
        options?: ListEventsOptions
    ): Promise<SyncResult<CalendarEvent>>;

    /**
     * Get a specific event
     */
    getEvent(
        accountId: string,
        calendarId: string,
        eventId: string,
        options?: GetEventOptions
    ): Promise<CalendarEvent>;

    /**
     * Search events
     */
    searchEvents(
        accountId: string,
        query: string,
        options?: Omit<ListEventsOptions, 'query'>
    ): Promise<SyncResult<CalendarEvent>>;

    /**
     * Create a new event (may require approval)
     */
    createEvent(
        accountId: string,
        options: CreateEventOptions
    ): Promise<CalendarEvent>;

    /**
     * Update an existing event (may require approval)
     */
    updateEvent(
        accountId: string,
        options: UpdateEventOptions
    ): Promise<CalendarEvent>;

    /**
     * Delete an event (requires approval)
     */
    deleteEvent(
        accountId: string,
        options: DeleteEventOptions
    ): Promise<void>;

    /**
     * Respond to an event invitation
     */
    respondToEvent(
        accountId: string,
        options: RespondToEventOptions
    ): Promise<CalendarEvent>;

    // ==========================================
    // AVAILABILITY
    // ==========================================

    /**
     * Get free/busy information
     */
    getFreeBusy(
        accountId: string,
        request: FreeBusyRequest
    ): Promise<FreeBusyResponse>;

    /**
     * Find available meeting times
     */
    findAvailableTimes(
        accountId: string,
        options: {
            attendees: string[];
            duration: number; // minutes
            timeMin: Date;
            timeMax: Date;
            timezone?: string;
        }
    ): Promise<{
        suggestions: {
            start: Date;
            end: Date;
            confidence: number;
        }[];
    }>;

    // ==========================================
    // SYNC
    // ==========================================

    /**
     * Get incremental changes since last sync
     */
    getIncrementalChanges(
        accountId: string,
        options: {
            calendarId?: string;
            syncToken?: string;
            deltaLink?: string;
        }
    ): Promise<{
        events: CalendarEvent[];
        deletedEventIds: string[];
        nextSyncToken?: string;
        nextDeltaLink?: string;
    }>;

    /**
     * Set up webhook/subscription for calendar changes
     */
    setupSubscription(
        accountId: string,
        options: {
            webhookUrl: string;
            calendarId?: string;
        }
    ): Promise<{
        subscriptionId: string;
        expiration: Date;
        resourceId?: string;
    }>;

    /**
     * Renew a subscription
     */
    renewSubscription(
        accountId: string,
        subscriptionId: string
    ): Promise<{
        expiration: Date;
    }>;

    /**
     * Stop a subscription
     */
    stopSubscription(
        accountId: string,
        subscriptionId: string
    ): Promise<void>;
}
