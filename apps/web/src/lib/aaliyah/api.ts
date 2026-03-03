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

  return config
}

function handleResponseError(error: any) {
  if (error?.response?.status === 401) {
    // Global 401 Handler: The session was revoked or corrupted.
    // Redirect hard to the sign-in page to heal the session state.
    if (typeof window !== "undefined") {
      console.warn("API 401: Enterprise Revoke. Forcing redirect to /sign-in.");
      window.location.href = "/sign-in";
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
  baseURL: "/aaliyah",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 60000,
})

aaliyahApi.interceptors.request.use(withAuth)
aaliyahApi.interceptors.response.use((res) => res, handleResponseError)

export const assistApi = axios.create({
  baseURL: "/assist",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 60000,
})

assistApi.interceptors.request.use(withAuth)
assistApi.interceptors.response.use((res) => res, handleResponseError)

export async function sendChat(message: string, threadId?: string, workspaceId?: string, emailId?: string) {
  try {
    const response = await assistApi.post("/chat", {
      messages: [{ role: "user", content: message }],
      thread_id: threadId,
      workspace_id: workspaceId,
      email_id: emailId,
    })
    return response.data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function getChatMessages(threadId?: string, emailId?: string, limit = 50) {
  try {
    const response = await assistApi.get("/messages", {
      params: { thread_id: threadId, email_id: emailId, limit }
    })
    return response.data
  } catch (error) {
    throw toApiError(error)
  }
}

/**
 * Streams the chat response using Native SSE from DeepSeek-R1 via Aaliyah Orchestrator
 */
export async function sendChatStream(
  message: string,
  workspaceId: string | undefined,
  emailId: string | undefined,
  onChunk: (chunk: any) => void,
  onDone: () => void,
  onError: (error: any) => void
) {
  try {
    const response = await assistApi.post("/answer/stream",
      { message, workspace_id: workspaceId, email_id: emailId },
      {
        responseType: "stream",
        adapter: "fetch" // Required for streaming in axios with browser
      }
    );

    // If using fetch adapter, response.data is a ReadableStream
    if (response.data instanceof ReadableStream) {
      const reader = response.data.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunkStr = decoder.decode(value, { stream: true });
        const lines = chunkStr.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (dataStr === '[DONE]') {
              onDone();
              return;
            }
            if (dataStr) {
              try {
                const parsed = JSON.parse(dataStr);
                onChunk(parsed);
              } catch (e) {
                console.warn("Could not parse SSE JSON:", dataStr);
              }
            }
          }
        }
      }
      onDone();
    } else {
      // Fallback if not readable stream (e.g. testing environment)
      console.warn("Response data is not a ReadableStream, falling back to simple resolve");
      onDone();
    }

  } catch (error) {
    onError(toApiError(error));
  }
}

export async function getThreadDetails(threadId: string, provider: string) {
  try {
    const response = await assistApi.get(`/thread/${threadId}`, {
      params: { provider }
    })
    return response.data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function getEventDetails(eventId: string, provider: string) {
  try {
    const response = await assistApi.get(`/event/${eventId}`, {
      params: { provider }
    })
    return response.data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function getEventPrep(eventId: string, force: boolean = false) {
  try {
    const response = await assistApi.get(`/calendar/events/${eventId}/prep`, {
      params: { force }
    })
    return response.data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function getStatus(workspaceId?: string) {
  try {
    const response = await aaliyahApi.get("/status", {
      params: workspaceId ? { workspace_id: workspaceId } : undefined,
    })
    return response.data
  } catch (error) {
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


export async function getOnboardingStatus(): Promise<OnboardingStatusResponse> {
  try {
    const response = await aaliyahApi.get("/onboarding/status", { params: { t: Date.now() } })
    return response.data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function completeOnboarding(payload: OnboardingCompletePayload) {
  try {
    const response = await aaliyahApi.post("/onboarding/complete", payload)
    return response.data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function getStats(workspaceId?: string) {
  try {
    const response = await aaliyahApi.get("/stats", {
      params: workspaceId ? { workspace_id: workspaceId } : undefined,
    })
    return response.data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function runPreflight() {
  try {
    const response = await aaliyahApi.post("/preflight/run")
    return response.data
  } catch (error) {
    throw toApiError(error)
  }
}


export async function triggerHistoricalSync(days = 180) {
  try {
    const response = await assistApi.post("/historical-sync", { days })
    return response.data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function getCounts() {
  try {
    const response = await aaliyahApi.get("/counts")
    return response.data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function getThreads(queue?: string, limit = 50) {
  try {
    const response = await aaliyahApi.get("/threads", { params: { queue, limit } })
    return response.data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function getThreadItem(threadId: string) {
  try {
    const response = await aaliyahApi.get(`/threads/${threadId}`)
    return response.data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function getInbox(params?: {
  limit?: number
  category?: string
  priority?: string
  include_noise?: boolean
}) {
  try {
    const response = await aaliyahApi.get("/inbox", { params })
    return response.data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function getCalendarConflicts(limit = 50) {
  try {
    const response = await aaliyahApi.get("/calendar/conflicts", { params: { limit } })
    return response.data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function syncInbox(payload?: { provider?: string; max_results?: number }) {
  try {
    const response = await aaliyahApi.post("/sync/inbox", payload || {})
    return response.data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function syncCalendar(payload?: { provider?: string; window_days?: number; buffer_minutes?: number }) {
  try {
    const response = await aaliyahApi.post("/sync/calendar", payload || {})
    return response.data
  } catch (error) {
    throw toApiError(error)
  }
}
export async function getUpcomingMeetings(limit = 10, lookaheadHours = 24) {
  try {
    const response = await aaliyahApi.get("/calendar/upcoming", {
      params: { limit, lookahead_hours: lookaheadHours }
    })
    return response.data
  } catch (error) {
    throw toApiError(error)
  }
}
export async function getLiveToken() {
  try {
    const response = await aaliyahApi.get("/live/token", { params: { t: Date.now() } })
    const token = response.data?.stream_token
    if (typeof token !== "string" || !token) throw new Error("Missing live stream token")
    return token
  } catch (error) {
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

export async function getLabelingPreferences() {
  try {
    const response = await aaliyahApi.get("/labeling/preferences")
    return response.data.preferences
  } catch (error) {
    throw toApiError(error)
  }
}

export async function updateLabelingPreferences(payload: LabelingPreferencesPayload) {
  try {
    const response = await aaliyahApi.put("/labeling/preferences", payload)
    return response.data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function setLabelingOverride(payload: {
  scope: "message" | "thread"
  target_id: string
  disable_auto?: boolean
  labels?: string[]
  mode?: "replace" | "add"
}) {
  try {
    const response = await aaliyahApi.post("/labeling/override", payload)
    return response.data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function undoLabelingAction(auditId: string) {
  try {
    const response = await aaliyahApi.post(`/labeling/undo/${encodeURIComponent(auditId)}`)
    return response.data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function sendDraft(workspaceId: string, emailId: string) {
  try {
    const response = await aaliyahApi.post("/drafts/send", {
      workspace_id: workspaceId,
      email_id: emailId,
    })
    return response.data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function updateDraft(emailId: string, payload: { to?: string; subject?: string; body: string; attachments?: unknown[] }) {
  try {
    const response = await aaliyahApi.put(`/inbox/${emailId}/draft`, payload)
    return response.data
  } catch (error) {
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


export async function getAaliyahSettings() {
  try {
    const response = await aaliyahApi.get("/settings")
    return response.data.settings as AaliyahSettings
  } catch (error) {
    throw toApiError(error)
  }
}

export async function updateAaliyahSettings(settings: AaliyahSettings) {
  try {
    const response = await aaliyahApi.put("/settings", settings)
    return response.data
  } catch (error) {
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

export async function getTemplates() {
  try {
    const response = await aaliyahApi.get("/templates")
    return response.data as { items: Template[]; count: number }
  } catch (error) {
    throw toApiError(error)
  }
}

export async function createTemplate(data: { name: string; subject?: string; body: string }) {
  try {
    const response = await aaliyahApi.post("/templates", data)
    return response.data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function deleteTemplate(templateId: string) {
  try {
    const response = await aaliyahApi.delete(`/templates/${templateId}`)
    return response.data
  } catch (error) {
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

export async function getActions(limit = 50) {
  try {
    const response = await aaliyahApi.get("/actions", { params: { limit } })
    return response.data as { items: ActionLogItem[] }
  } catch (error) {
    throw toApiError(error)
  }
}

export async function getDebugSnapshot() {
  try {
    const response = await aaliyahApi.get("/debug/snapshot")
    return response.data
  } catch (error) {
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

export async function triggerInitialSync() {
  try {
    const response = await aaliyahApi.post("/sync/initial")
    return response.data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function getSyncStatus(): Promise<SyncStatusResponse> {
  try {
    const response = await aaliyahApi.get("/sync/status")
    return response.data as SyncStatusResponse
  } catch (error) {
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

export async function getBookingLink(slug: string): Promise<BookingLinkData> {
  try {
    const response = await aaliyahApi.get(`/booking/${slug}`)
    return response.data as BookingLinkData
  } catch (error) {
    throw toApiError(error)
  }
}

export async function confirmBooking(slug: string, selectedSlot: BookingSlot, bookerEmail?: string) {
  try {
    const response = await aaliyahApi.post(`/booking/${slug}/confirm`, {
      selected_slot: selectedSlot,
      booker_email: bookerEmail,
    })
    return response.data
  } catch (error) {
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
}) {
  try {
    const response = await assistApi.post("/compose", payload)
    return response.data
  } catch (error) {
    throw toApiError(error)
  }
}
