import axios, { AxiosError, InternalAxiosRequestConfig } from "axios"

const TOKEN_KEYS = ["auth_token", "clerk_token", "__session"]
const WORKSPACE_KEYS = ["workspace_id", "tenant_id", "x_workspace_id"]

function readLocalStorage(keys: string[]): string | null {
  if (typeof window === "undefined") return null
  for (const key of keys) {
    const value = window.localStorage.getItem(key)
    if (value && value.trim()) return value.trim()
  }
  return null
}

function withAuth(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  const token = readLocalStorage(TOKEN_KEYS)
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

function toApiError(error: unknown): Error {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.error?.message
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
  timeout: 20000,
})

aaliyahApi.interceptors.request.use((config) => withAuth(config))

export const assistApi = axios.create({
  baseURL: "/assist",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 20000,
})

assistApi.interceptors.request.use((config) => withAuth(config))

export async function sendChat(message: string, workspaceId?: string) {
  try {
    const response = await assistApi.post("/answer", {
      message,
      workspace_id: workspaceId,
    })
    return response.data
  } catch (error) {
    throw toApiError(error)
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
  draft_tone: string
  signature?: string
  vips: string[]
  safe_auto_send: boolean
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
    const response = await aaliyahApi.get("/live/token")
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
    return response.data
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

export async function updateDraft(emailId: string, payload: { to?: string; subject?: string; body: string; attachments?: any[] }) {
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

  // Meetings
  calendar_assist_enabled: boolean
  working_hours_start: string
  working_hours_end: string
  default_meeting_duration: number

  // Legacy/Existing
  auto_send_enabled: boolean
  draft_tone?: string
  signature?: string

  // Read-only info
  approval_required_topics?: string[]
  always_require_approval?: boolean
}

export async function getAaliyahSettings() {
  try {
    const response = await aaliyahApi.get("/settings")
    return response.data as AaliyahSettings
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
