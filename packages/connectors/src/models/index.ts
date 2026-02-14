/**
 * Aaliyah Connector Platform - Provider Agnostic Models
 * 
 * These models represent the unified data structures returned by all providers.
 * They abstract away provider-specific differences.
 */

// ============================================
// COMMON TYPES
// ============================================

export interface Participant {
    email: string;
    name?: string;
}

export interface Attachment {
    id: string;
    filename: string;
    mimeType: string;
    size: number;
    contentId?: string; // For inline attachments
}

// ============================================
// EMAIL MODELS
// ============================================

export interface Thread {
    id: string;
    accountId: string;

    subject: string;
    snippet: string;

    participants: Participant[];

    messageCount: number;
    unreadCount: number;

    labels: string[];
    folders: string[];

    lastMessageAt: Date;
    firstMessageAt: Date;

    // Optional: full messages if requested
    messages?: Message[];

    // Provider metadata
    providerThreadId: string;
}

export interface Message {
    id: string;
    threadId: string;
    accountId: string;

    // RFC 2822 Message-ID
    internetMessageId: string;

    // Participants
    from: Participant;
    to: Participant[];
    cc: Participant[];
    bcc: Participant[];
    replyTo: Participant[];

    // Content
    subject: string;
    snippet: string;
    bodyText?: string;
    bodyHtml?: string;

    // Classification
    labels: string[];
    folders: string[];

    // Status
    isRead: boolean;
    isStarred: boolean;
    isDraft: boolean;
    isTrash: boolean;
    isSpam: boolean;

    // Attachments
    attachments: Attachment[];
    hasAttachments: boolean;

    // Timestamps
    sentAt: Date;
    receivedAt: Date;

    // Threading
    inReplyTo?: string;
    references?: string[];

    // Provider metadata
    providerMessageId: string;
    rawHeaders?: Record<string, string>;
}

export interface Draft {
    id: string;
    accountId: string;

    to: Participant[];
    cc: Participant[];
    bcc: Participant[];

    subject: string;
    bodyText?: string;
    bodyHtml?: string;

    // If this draft is a reply
    replyToMessageId?: string;
    threadId?: string;

    attachments: DraftAttachment[];

    createdAt: Date;
    updatedAt: Date;

    providerDraftId: string;
}

export interface DraftAttachment {
    filename: string;
    mimeType: string;
    content: Buffer | string; // Base64 or Buffer
    contentId?: string;
    isInline?: boolean;
}

export interface Label {
    id: string;
    accountId: string;

    name: string;
    displayName: string;

    type: 'system' | 'user';

    // For nested labels
    parentId?: string;

    // Visual
    color?: string;

    // Counts (if available)
    messageCount?: number;
    unreadCount?: number;

    providerLabelId: string;
}

export interface Folder {
    id: string;
    accountId: string;

    name: string;
    displayName: string;

    type: 'system' | 'user';

    parentId?: string;

    messageCount?: number;
    unreadCount?: number;

    providerFolderId: string;
}

// ============================================
// CALENDAR MODELS
// ============================================

export interface Calendar {
    id: string;
    accountId: string;

    name: string;
    description?: string;

    isPrimary: boolean;
    isOwner: boolean;

    accessRole: 'owner' | 'writer' | 'reader' | 'freeBusyReader';

    timezone?: string;
    color?: string;

    providerCalendarId: string;
}

export interface CalendarEvent {
    id: string;
    accountId: string;
    calendarId: string;

    title: string;
    description?: string;
    location?: string;

    start: EventDateTime;
    end: EventDateTime;

    isAllDay: boolean;
    timezone?: string;

    // Recurrence
    recurrence?: RecurrenceRule;
    recurringEventId?: string;
    originalStartTime?: Date;

    // Participants
    organizer: Attendee;
    attendees: Attendee[];

    // Status
    status: EventStatus;
    visibility: EventVisibility;
    transparency: 'opaque' | 'transparent';

    // Response
    responseStatus?: ResponseStatus;

    // Conferencing
    conferenceData?: ConferenceData;

    // Reminders
    reminders: Reminder[];
    useDefaultReminders: boolean;

    // Metadata
    createdAt: Date;
    updatedAt: Date;

    // Provider specific
    providerEventId: string;
    htmlLink?: string;
    iCalUID?: string;
}

export interface EventDateTime {
    dateTime?: Date;   // For timed events
    date?: string;     // For all-day events (YYYY-MM-DD)
    timezone?: string;
}

export interface RecurrenceRule {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval?: number;
    count?: number;
    until?: Date;
    byDay?: string[];      // MO, TU, WE, etc.
    byMonthDay?: number[];
    byMonth?: number[];

    // Original RRULE string for complex cases
    rrule?: string;
}

export interface Attendee {
    email: string;
    name?: string;

    isOrganizer: boolean;
    isOptional: boolean;

    responseStatus: ResponseStatus;

    comment?: string;
}

export type EventStatus = 'confirmed' | 'tentative' | 'cancelled';
export type EventVisibility = 'default' | 'public' | 'private' | 'confidential';
export type ResponseStatus = 'needsAction' | 'declined' | 'tentative' | 'accepted';

export interface ConferenceData {
    type: 'hangoutsMeet' | 'teams' | 'zoom' | 'other';

    conferenceId?: string;

    entryPoints: ConferenceEntryPoint[];

    notes?: string;
}

export interface ConferenceEntryPoint {
    type: 'video' | 'phone' | 'sip' | 'more';
    uri?: string;
    label?: string;
    pin?: string;
    regionCode?: string;
}

export interface Reminder {
    method: 'email' | 'popup' | 'sms';
    minutes: number;
}

// ============================================
// AVAILABILITY
// ============================================

export interface FreeBusyRequest {
    timeMin: Date;
    timeMax: Date;
    calendars: string[];
}

export interface FreeBusyResponse {
    calendars: Record<string, CalendarFreeBusy>;
}

export interface CalendarFreeBusy {
    busy: TimeRange[];
    errors?: FreeBusyError[];
}

export interface TimeRange {
    start: Date;
    end: Date;
}

export interface FreeBusyError {
    domain: string;
    reason: string;
}

// ============================================
// SYNC MODELS
// ============================================

export interface SyncResult<T> {
    items: T[];

    // For incremental sync
    nextSyncToken?: string;
    nextPageToken?: string;
    deltaLink?: string;

    // For Gmail history
    historyId?: string;

    hasMore: boolean;
}

export interface WebhookPayload {
    provider: 'google' | 'microsoft';
    type: 'mail' | 'calendar';

    accountId: string;

    // Provider-specific notification data
    resourceId?: string;
    changeType?: string;

    // For deduplication
    subscriptionId?: string;
    sequenceNumber?: number;

    rawPayload: unknown;
}

// ============================================
// ACTION PAYLOADS
// ============================================

export interface SendEmailPayload {
    draftId?: string;

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

export interface CreateEventPayload {
    calendarId: string;

    title: string;
    description?: string;
    location?: string;

    start: EventDateTime;
    end: EventDateTime;

    isAllDay?: boolean;
    timezone?: string;

    attendees?: Omit<Attendee, 'responseStatus'>[];

    visibility?: EventVisibility;

    reminders?: Reminder[];

    conferenceData?: {
        createRequest?: boolean;
    };
}

export interface UpdateEventPayload extends Partial<CreateEventPayload> {
    eventId: string;
    sendUpdates?: 'all' | 'externalOnly' | 'none';
}

// ============================================
// ERROR TYPES
// ============================================

export interface ConnectorError {
    code: string;
    message: string;

    provider?: 'google' | 'microsoft';

    statusCode: number;

    retryable: boolean;
    retryAfter?: number;

    details?: Record<string, unknown>;
}

export class ConnectorApiError extends Error {
    constructor(
        public readonly code: string,
        message: string,
        public readonly statusCode: number = 500,
        public readonly retryable: boolean = false,
        public readonly details?: Record<string, unknown>
    ) {
        super(message);
        this.name = 'ConnectorApiError';
    }
}
