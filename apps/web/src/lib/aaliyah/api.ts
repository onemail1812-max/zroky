import axios, { AxiosError, InternalAxiosRequestConfig } from "axios"

export const WORKSPACE_KEYS = ["workspace_id", "tenant_id", "x_workspace_id"]

export function readLocalStorage(keys: string[]): string | null {
  if (typeof window === "undefined") return null
  for (const key of keys) {
    const value = window.localStorage.getItem(key)
    if (value && value.trim()) return value.trim()
  }
  return null
}

async function withAuth(config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> {
  // 1. DYNAMICALLY FETCH TOKEN (Enterprise Fix)
  // We no longer rely on a brittle 50s sync loop. We ask Clerk directly for a fresh token
  // right before every single request. Clerk handles its own memory cache, short-circuit, and refresh logic natively.
  let token = null;
  if (typeof window !== "undefined" && (window as any).Clerk?.session) {
    try {
      token = await (window as any).Clerk.session.getToken();
    } catch (e) {
      console.warn("API: Failed to get fresh Clerk token", e);
    }
  }

  // Fallback for dev/SSR if absolutely needed, though Clerk session above takes precedence
  if (!token) {
    token = readLocalStorage(["auth_token", "clerk_token", "__session"]);
  }

  const workspaceId = readLocalStorage(WORKSPACE_KEYS)

  if (!config.headers) {
    return config
  }
  if (token) {
    if (typeof config.headers.set === "function") {
      config.headers.set("Authorization", `Bearer ${token}`)
    } else {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  if (workspaceId) {
    if (typeof config.headers.set === "function") {
      config.headers.set("x-workspace-id", workspaceId)
    } else {
      config.headers["x-workspace-id"] = workspaceId
    }
  }

  // CSRF protection: custom header required by the API middleware
  if (typeof config.headers.set === "function") {
    config.headers.set("X-Zroky-CSRF", "1")
  } else {
    config.headers["X-Zroky-CSRF"] = "1"
  }

  return config
}

const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 5000,
  statusCodesToRetry: [429, 502, 503, 504],
};

/**
 * Global 401 Unauthorized handler.
 * Triggers the AuthErrorOverlay via the system store.
 */
export function handleUnauthorized() {
  if (typeof window !== "undefined") {
    console.warn("API 401: Unauthorized. Triggering Auth Error Overlay.");
    // Late-bind store to avoid circular refs
    const { useSystemStore } = require("./store");
    useSystemStore.getState().setAuthError(true);
  }
}

function handleResponseError(error: any) {
  const { config, response } = error;

  // 1. Global 401 Handler
  if (response?.status === 401) {
    handleUnauthorized();
    return Promise.reject(error);
  }

  // 2. Exponential Backoff Retry Logic
  if (config && RETRY_CONFIG.statusCodesToRetry.includes(response?.status)) {
    config.__retryCount = config.__retryCount || 0;

    if (config.__retryCount < RETRY_CONFIG.maxRetries) {
      config.__retryCount += 1;

      const delay = Math.min(
        RETRY_CONFIG.initialDelay * Math.pow(2, config.__retryCount - 1),
        RETRY_CONFIG.maxDelay
      );

      console.warn(`API Error ${response.status}: Retrying in ${delay}ms (Attempt ${config.__retryCount}/${RETRY_CONFIG.maxRetries})...`);

      return new Promise((resolve) => {
        setTimeout(() => resolve(axios(config)), delay);
      });
    }
  }

  return Promise.reject(error);
}

function toApiError(error: unknown): Error {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.error?.message ?? error.response?.data?.detail
    if (typeof detail === "string" && detail.length > 0) return new Error(detail)
    if (typeof error.message === "string" && error.message.length > 0) return new Error(error.message)
  }
  if (error instanceof Error) return error
  return new Error("Request failed")
}

export const aaliyahApi = axios.create({
  baseURL: "/api/v1/aaliyah",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 60000,
})

aaliyahApi.interceptors.request.use(withAuth)
aaliyahApi.interceptors.response.use((res) => res, handleResponseError)

export const assistApi = axios.create({
  baseURL: "/api/v1/assist",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 60000,
})

assistApi.interceptors.request.use(withAuth)
assistApi.interceptors.response.use((res) => res, handleResponseError)

export async function sendChat(message: string, threadId?: string, workspaceId?: string, emailId?: string, signal?: AbortSignal) {
  try {
    const response = await assistApi.post("/chat", {
      messages: [{ role: "user", content: message }],
      thread_id: threadId,
      workspace_id: workspaceId,
      email_id: emailId,
    }, { signal })
    return response.data
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw toApiError(error)
  }
}

export async function getChatMessages(threadId?: string, emailId?: string, limit = 50, signal?: AbortSignal) {
  try {
    const response = await assistApi.get("/messages", {
      params: { thread_id: threadId, email_id: emailId, limit },
      signal
    })
    return response.data
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw toApiError(error)
  }
}

export async function getThreadDetails(threadId: string, provider: string, signal?: AbortSignal) {
  try {
    const response = await assistApi.get(`/thread/${threadId}`, {
      params: { provider },
      signal
    })
    return response.data
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw toApiError(error)
  }
}

export async function getEventDetails(eventId: string, provider: string, signal?: AbortSignal) {
  try {
    const response = await assistApi.get(`/event/${eventId}`, {
      params: { provider },
      signal
    })
    return response.data
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw toApiError(error)
  }
}

export async function getEventPrep(eventId: string, force: boolean = false, signal?: AbortSignal) {
  try {
    const response = await aaliyahApi.get(`/calendar/events/${eventId}/prep`, {
      params: { force },
      signal
    })
    return response.data
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw toApiError(error)
  }
}

export async function getStatus(workspaceId?: string, signal?: AbortSignal) {
  try {
    const response = await aaliyahApi.get("/status", {
      params: workspaceId ? { workspace_id: workspaceId } : undefined,
      signal
    })
    return response.data
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw toApiError(error)
  }
}

// ── Onboarding Gate ──────────────────────────────────────────────────

export interface OnboardingStatusResponse {
  onboarding_status: "pending" | "completed"
  first_name: string | null
}

export interface OnboardingCompletePayload {
  capabilities: string[]
  working_hours_start: string
  working_hours_end: string
  meeting_duration: number
  notes_mode: string
  draft_tone: string
  signature?: string
  examples?: string
  vips: string[]
  safe_auto_send: boolean
  follow_up_days?: number
  max_follow_ups?: number
  always_require_approval?: boolean
  approval_required_topics?: string[]

  // Rulebook Specifics
  emoji_usage?: boolean
  directness?: number // 1 to 5 (1=Soft, 5=Direct)
  draft_disclosure?: boolean
  project_keywords?: string[]
  vip_roles?: string[]
  buffer_time_mins?: number
  focus_blocks?: string[]
  morning_briefing_time?: string
  newsletter_policy?: "archive" | "tab" | "ignore"
  receipts_policy?: "auto_label" | "ignore"
}


export async function getOnboardingStatus(signal?: AbortSignal): Promise<OnboardingStatusResponse> {
  try {
    const response = await aaliyahApi.get("/onboarding/status", { params: { t: Date.now() }, signal })
    return response.data
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw toApiError(error)
  }
}

export async function completeOnboarding(payload: OnboardingCompletePayload, signal?: AbortSignal) {
  try {
    const response = await aaliyahApi.post("/onboarding/complete", payload, { signal })
    return response.data
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw toApiError(error)
  }
}

export async function getStats(workspaceId?: string, signal?: AbortSignal) {
  try {
    const response = await aaliyahApi.get("/stats", {
      params: workspaceId ? { workspace_id: workspaceId } : undefined,
      signal
    })
    return response.data
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw toApiError(error)
  }
}

export async function runPreflight(signal?: AbortSignal) {
  try {
    const response = await aaliyahApi.post("/preflight/run", {}, { signal })
    return response.data
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw toApiError(error)
  }
}


export async function triggerHistoricalSync(days = 180, signal?: AbortSignal) {
  try {
    const response = await assistApi.post("/historical-sync", { days }, { signal })
    return response.data
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw toApiError(error)
  }
}

export async function getCounts(signal?: AbortSignal) {
  try {
    const response = await aaliyahApi.get("/counts", { signal })
    return response.data
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw toApiError(error)
  }
}

export async function getThreads(queue?: string, limit = 50, signal?: AbortSignal) {
  try {
    const response = await aaliyahApi.get("/threads", { params: { queue, limit }, signal })
    return response.data
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw toApiError(error)
  }
}

export async function getThreadItem(threadId: string, signal?: AbortSignal) {
  try {
    const response = await aaliyahApi.get(`/threads/${threadId}`, { signal })
    return response.data
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw toApiError(error)
  }
}

export async function getInbox(params?: {
  limit?: number
  category?: string
  priority?: string
  include_noise?: boolean
  signal?: AbortSignal
}) {
  try {
    const { signal, ...restParams } = params || {};
    const response = await aaliyahApi.get("/inbox", { params: restParams, signal })
    return response.data
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw toApiError(error)
  }
}

export async function getCalendarConflicts(limit = 50, signal?: AbortSignal) {
  try {
    const response = await aaliyahApi.get("/calendar/conflicts", { params: { limit }, signal })
    return response.data
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw toApiError(error)
  }
}

export async function syncInbox(payload?: { provider?: string; max_results?: number }, signal?: AbortSignal) {
  try {
    const response = await aaliyahApi.post("/sync/inbox", payload || {}, { signal })
    return response.data
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw toApiError(error)
  }
}

export async function syncCalendar(payload?: { provider?: string; window_days?: number; buffer_minutes?: number }, signal?: AbortSignal) {
  try {
    const response = await aaliyahApi.post("/sync/calendar", payload || {}, { signal })
    return response.data
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw toApiError(error)
  }
}
export async function getUpcomingMeetings(limit = 10, lookaheadHours = 24, signal?: AbortSignal) {
  try {
    const response = await aaliyahApi.get("/calendar/upcoming", {
      params: { limit, lookahead_hours: lookaheadHours },
      signal
    })
    return response.data
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw toApiError(error)
  }
}
export async function getLiveToken(signal?: AbortSignal) {
  try {
    const response = await aaliyahApi.get("/live/token", { params: { t: Date.now() }, signal })
    const token = response.data?.stream_token
    if (typeof token !== "string" || !token) throw new Error("Missing live stream token")
    return token
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw toApiError(error)
  }
}

export interface LabelingPreferencesPayload {
  enabled_labels: string[]
  vip_senders?: string[]
  internal_domains?: string[]
  keyword_rules?: Record<string, string[]>
  auto_label_enabled?: boolean
  auto_sync_interval_seconds?: number
}

export async function getLabelingPreferences(signal?: AbortSignal) {
  try {
    const response = await aaliyahApi.get("/labeling/preferences", { signal })
    return response.data.preferences
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw toApiError(error)
  }
}

export async function updateLabelingPreferences(payload: LabelingPreferencesPayload, signal?: AbortSignal) {
  try {
    const response = await aaliyahApi.put("/labeling/preferences", payload, { signal })
    return response.data
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw toApiError(error)
  }
}

export async function setLabelingOverride(payload: {
  scope: "message" | "thread"
  target_id: string
  disable_auto?: boolean
  labels?: string[]
  mode?: "replace" | "add"
}, signal?: AbortSignal) {
  try {
    const response = await aaliyahApi.post("/labeling/override", payload, { signal })
    return response.data
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw toApiError(error)
  }
}

export async function undoLabelingAction(auditId: string, signal?: AbortSignal) {
  try {
    const response = await aaliyahApi.post(`/labeling/undo/${encodeURIComponent(auditId)}`, {}, { signal })
    return response.data
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw toApiError(error)
  }
}

export async function sendDraft(workspaceId: string, emailId: string, signal?: AbortSignal) {
  try {
    const response = await aaliyahApi.post("/drafts/send", {
      workspace_id: workspaceId,
      email_id: emailId,
      is_explicit_approval: true,
    }, { signal })
    return response.data
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw toApiError(error)
  }
}

export async function archiveEmail(emailId: string, signal?: AbortSignal) {
  try {
    // Attempting to match the backend pattern used in inboxService
    // If /aaliyah base is used, it might be /aaliyah/inbox/id/archive
    const response = await aaliyahApi.post(`/inbox/${emailId}/archive`, {}, { signal })
    return response.data
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw toApiError(error)
  }
}

export async function updateDraft(emailId: string, payload: { to?: string; subject?: string; body: string; attachments?: unknown[] }, signal?: AbortSignal) {
  try {
    const response = await aaliyahApi.put(`/inbox/${emailId}/draft`, payload, { signal })
    return response.data
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw toApiError(error)
  }
}

export interface AaliyahSettings {
  workspace_id?: string
  // Inbox & Autopilot
  organize_inbox_enabled: boolean
  draft_replies_enabled: boolean
  archive_less_important: boolean
  track_follow_ups: boolean
  follow_up_days?: number
  max_follow_ups?: number

  // Capabilities
  capabilities?: string[]

  // Meetings
  calendar_assist_enabled: boolean
  working_hours_start: string
  working_hours_end: string
  default_meeting_duration: number
  notes_mode?: string
  attend_meetings?: boolean

  // Persona
  auto_send_enabled: boolean
  draft_tone?: string
  signature?: string
  examples?: string

  // VIPs
  vip_senders?: string[]

  // Security & Approvals
  approval_required_topics?: string[]
  always_require_approval?: boolean

  // ── 5-Point Rulebook ──

  // 1. Style DNA
  emoji_usage?: boolean
  directness?: number // 1 to 5
  draft_disclosure?: boolean

  // 2. Priority Logic
  project_keywords?: string[]
  vip_roles?: string[]

  // 3. Scheduling Protocols
  buffer_time_mins?: number
  focus_blocks?: string[]
  morning_briefing_time?: string

  // 4. Handling Noise
  newsletter_policy?: "archive" | "tab" | "ignore"
  receipts_policy?: "auto_label" | "ignore"
}


export async function getAaliyahSettings(signal?: AbortSignal) {
  try {
    const response = await aaliyahApi.get("/settings", { signal })
    return response.data.settings as AaliyahSettings
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw toApiError(error)
  }
}

export async function updateAaliyahSettings(settings: AaliyahSettings, signal?: AbortSignal) {
  try {
    const response = await aaliyahApi.put("/settings", settings, { signal })
    return response.data
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw toApiError(error)
  }
}

export interface Template {
  id: string
  name: string
  subject: string | null
  body: string
  updated_at: string
}

export async function getTemplates(signal?: AbortSignal) {
  try {
    const response = await aaliyahApi.get("/templates", { signal })
    return response.data as { items: Template[]; count: number }
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw toApiError(error)
  }
}

export async function createTemplate(data: { name: string; subject?: string; body: string }, signal?: AbortSignal) {
  try {
    const response = await aaliyahApi.post("/templates", data, { signal })
    return response.data
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw toApiError(error)
  }
}

export async function deleteTemplate(templateId: string, signal?: AbortSignal) {
  try {
    const response = await aaliyahApi.delete(`/templates/${templateId}`, { signal })
    return response.data
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw toApiError(error)
  }
}

export interface ActionLogItem {
  id: string
  type: string
  created_at: string
  details: Record<string, string>
  status: string
  explain?: string
}

export async function getActions(limit = 50, signal?: AbortSignal) {
  try {
    const response = await aaliyahApi.get("/actions", { params: { limit }, signal })
    return response.data as { items: ActionLogItem[] }
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw toApiError(error)
  }
}

export async function getDebugSnapshot(signal?: AbortSignal) {
  try {
    const response = await aaliyahApi.get("/debug/snapshot", { signal })
    return response.data
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw toApiError(error)
  }
}

export interface SyncProgressItem {
  status: "syncing" | "done" | "waiting"
  count: number
  progress?: number // [v2.1 Hardening] Granular progress tracking
  synced_at: string | null
  message: string
}

export interface SyncStatusResponse {
  workspace_id: string
  runtime_status: string
  inbox: SyncProgressItem
  calendar: SyncProgressItem
}

export async function triggerInitialSync(signal?: AbortSignal) {
  try {
    const response = await aaliyahApi.post("/sync/initial", {}, { signal })
    return response.data
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw toApiError(error)
  }
}

export async function getSyncStatus(signal?: AbortSignal): Promise<SyncStatusResponse> {
  try {
    const response = await aaliyahApi.get("/sync/status", { signal })
    return response.data as SyncStatusResponse
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw toApiError(error)
  }
}

// ── Booking (One-Tap Calendar Sync) ──────────────────────────────────

export interface BookingSlot {
  start: string
  end?: string
  label?: string
}

export interface BookingLinkData {
  slug: string
  recipient_email: string | null
  subject: string | null
  proposed_slots: BookingSlot[]
  status: string
  expires_at: string | null
}

export const publicApi = axios.create({
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
})

export async function getBookingLink(slug: string, signal?: AbortSignal): Promise<BookingLinkData> {
  try {
    const response = await publicApi.get(`/booking/${slug}`, { signal })
    return response.data
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw toApiError(error)
  }
}

export async function confirmBooking(slug: string, selectedSlot: BookingSlot, bookerEmail?: string, signal?: AbortSignal) {
  try {
    const response = await publicApi.post(`/booking/${slug}/confirm`, {
      selected_slot: selectedSlot,
      booker_email: bookerEmail,
    }, { signal })
    return response.data
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw toApiError(error)
  }
}
export async function composeEmail(payload: {
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  body: string
  workspace_id?: string
}, signal?: AbortSignal) {
  try {
    const response = await assistApi.post("/compose", payload, { signal })
    return response.data
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw toApiError(error)
  }
}
