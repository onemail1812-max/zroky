/**
 * Aaliyah Connector Platform - Provider Agnostic Models
 *
 * These models represent the unified data structures returned by all providers.
 * They abstract away provider-specific differences.
 */
export interface Participant {
    email: string;
    name?: string;
}
export interface Attachment {
    id: string;
    filename: string;
    mimeType: string;
    size: number;
    contentId?: string;
}
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
    messages?: Message[];
    providerThreadId: string;
}
export interface Message {
    id: string;
    threadId: string;
    accountId: string;
    internetMessageId: string;
    from: Participant;
    to: Participant[];
    cc: Participant[];
    bcc: Participant[];
    replyTo: Participant[];
    subject: string;
    snippet: string;
    bodyText?: string;
    bodyHtml?: string;
    labels: string[];
    folders: string[];
    isRead: boolean;
    isStarred: boolean;
    isDraft: boolean;
    isTrash: boolean;
    isSpam: boolean;
    attachments: Attachment[];
    hasAttachments: boolean;
    sentAt: Date;
    receivedAt: Date;
    inReplyTo?: string;
    references?: string[];
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
    content: Buffer | string;
    contentId?: string;
    isInline?: boolean;
}
export interface Label {
    id: string;
    accountId: string;
    name: string;
    displayName: string;
    type: 'system' | 'user';
    parentId?: string;
    color?: string;
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
    recurrence?: RecurrenceRule;
    recurringEventId?: string;
    originalStartTime?: Date;
    organizer: Attendee;
    attendees: Attendee[];
    status: EventStatus;
    visibility: EventVisibility;
    transparency: 'opaque' | 'transparent';
    responseStatus?: ResponseStatus;
    conferenceData?: ConferenceData;
    reminders: Reminder[];
    useDefaultReminders: boolean;
    createdAt: Date;
    updatedAt: Date;
    providerEventId: string;
    htmlLink?: string;
    iCalUID?: string;
}
export interface EventDateTime {
    dateTime?: Date;
    date?: string;
    timezone?: string;
}
export interface RecurrenceRule {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval?: number;
    count?: number;
    until?: Date;
    byDay?: string[];
    byMonthDay?: number[];
    byMonth?: number[];
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
export interface SyncResult<T> {
    items: T[];
    nextSyncToken?: string;
    nextPageToken?: string;
    deltaLink?: string;
    historyId?: string;
    hasMore: boolean;
}
export interface WebhookPayload {
    provider: 'google' | 'microsoft';
    type: 'mail' | 'calendar';
    accountId: string;
    resourceId?: string;
    changeType?: string;
    subscriptionId?: string;
    sequenceNumber?: number;
    rawPayload: unknown;
}
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
export interface ConnectorError {
    code: string;
    message: string;
    provider?: 'google' | 'microsoft';
    statusCode: number;
    retryable: boolean;
    retryAfter?: number;
    details?: Record<string, unknown>;
}
export declare class ConnectorApiError extends Error {
    readonly code: string;
    readonly statusCode: number;
    readonly retryable: boolean;
    readonly details?: Record<string, unknown>;
    constructor(code: string, message: string, statusCode?: number, retryable?: boolean, details?: Record<string, unknown>);
}
//# sourceMappingURL=index.d.ts.map