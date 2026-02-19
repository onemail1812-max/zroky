"use client"

import * as React from "react"
import { CalendarRange, CheckCircle2, FileText, Mail, ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"
import type { IntelligenceTab } from "@/components/aaliyah/workspace/types"
import { Button } from "@/components/aaliyah/ui/Button"
import { EmailEditor } from "./EmailEditor"
import { Paperclip, X, Save, CornerUpLeft, Plus, Send, Edit, AlertCircle, Loader2, ShieldCheck, AlertTriangle, ShieldAlert } from "lucide-react"
import { updateDraft } from "@/lib/aaliyah/api"

export type Attachment = {
  id: string
  filename: string
  mime_type: string
  size: number
}

export type DraftArtifact = {
  to: string
  subject: string
  body: string
  attachments?: Attachment[]
}

export type Evidence = {
  type: "thread" | "event"
  id: string
  provider: "google" | "microsoft" | "unknown"
  timestamp?: string
}

export type FeedItem =
  | { id: string; type: "user-command"; text: string; timestamp: string }
  | { id: string; type: "response"; title: string; text: string; tone?: "normal" | "error" }
  | { id: string; type: "grounded-answer"; text: string; evidence: Evidence[]; status: "found" | "not_found" | "clarify" }
  | { id: string; type: "proposal"; title: string; bullets: string[] }
  | { id: string; type: "approval"; title: string; detail: string }
  | { id: string; type: "receipt"; text: string; timestamp: string }
  | { id: string; type: "artifact-email"; draft: DraftArtifact }
  | { id: string; type: "artifact-calendar"; title: string; items: Array<{ time: string; update: string }> }
  | { id: string; type: "artifact-grid"; title: string; slots: Array<{ slot: string; monday: string; tuesday: string; wednesday: string }> }
  | { id: string; type: "health-report"; health: any }

export function GroundedAnswerCard({
  text,
  evidence,
  status,
  onSourceClick,
}: {
  text: string
  evidence: Evidence[]
  status: "found" | "not_found" | "clarify"
  onSourceClick: (ev: Evidence) => void
}) {
  return (
    <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="max-w-2xl w-full">
        <div className="flex items-center gap-2 mb-2">
          <span className={cn(
            "h-1.5 w-1.5 rounded-full",
            status === "found" ? "bg-infoExecuting" : status === "clarify" ? "bg-warningWaiting" : "bg-errorBlocked"
          )}></span>
          <span className="text-[11px] font-semibold tracking-[0.14em] text-textMuted uppercase">Aaliyah Answer</span>
        </div>

        <div className="bg-surface rounded-2xl border border-borderSubtle p-4 shadow-sm">
          <div className="text-[14px] text-textSecondary leading-7 whitespace-pre-wrap mb-4">{text}</div>

          {evidence.length > 0 && (
            <div className="pt-3 border-t border-borderSubtle">
              <div className="text-[10px] font-bold text-textMuted uppercase tracking-wider mb-2">Sources</div>
              <div className="flex flex-wrap gap-2">
                {evidence.map((ev, idx) => (
                  <button
                    key={`${ev.id}-${idx}`}
                    onClick={() => onSourceClick(ev)}
                    className="flex items-center gap-2 px-2 py-1 rounded-md bg-surfaceElevated hover:bg-surfaceHover border border-borderSubtle transition-all group"
                  >
                    {ev.type === "thread" ? (
                      <Mail className="h-3 w-3 text-textMuted group-hover:text-textPrimary" />
                    ) : (
                      <CalendarRange className="h-3 w-3 text-textMuted group-hover:text-textPrimary" />
                    )}
                    <span className="text-[11px] font-medium text-textSecondary group-hover:text-textPrimary">
                      {ev.provider === "google" ? "Gmail" : ev.provider === "microsoft" ? "Outlook" : "Calendar"}
                    </span>
                    <ArrowRight className="h-2.5 w-2.5 text-textMuted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CardShell({
  children,
  indicatorClassName,
  className,
}: {
  children: React.ReactNode
  indicatorClassName?: string
  className?: string
}) {
  return (
    <article className={cn("group relative rounded-xl border border-borderSubtle bg-surface p-6 transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:border-borderStrong", className)}>
      {indicatorClassName && <span className={cn("absolute left-0 top-6 bottom-6 w-[3px] rounded-r-full opacity-80", indicatorClassName)} aria-hidden="true" />}
      {children}
    </article>
  )
}

export function ProposalCard({
  title,
  bullets,
  onAnalyze,
  onViewSources,
}: {
  title: string
  bullets: string[]
  onAnalyze: () => void
  onViewSources: () => void
}) {
  return (
    <CardShell indicatorClassName="bg-infoExecuting">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold tracking-[0.14em] text-textMuted uppercase mb-2">Proposal</div>
          <h3 className="text-[15px] font-medium text-textPrimary leading-tight">{title}</h3>
        </div>

        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="outline" size="sm" onClick={onAnalyze} className="h-8">
            Analyze
          </Button>
          <Button variant="outline" size="sm" onClick={onViewSources} className="h-8">
            Sources
          </Button>
        </div>
      </div>

      <ul className="mt-4 space-y-3">
        {bullets.map((item) => (
          <li key={item} className="flex gap-3 text-[13px] text-textSecondary leading-relaxed">
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-borderStrong" aria-hidden="true" />
            <span className="flex-1">{item}</span>
          </li>
        ))}
      </ul>
    </CardShell>
  )
}

export function ApprovalCard({
  title,
  detail,
  onApprove,
  onEdit,
  onReject,
}: {
  title: string
  detail: string
  onApprove: () => void
  onEdit: () => void
  onReject: () => void
}) {
  return (
    <CardShell indicatorClassName="bg-warningWaiting">
      <div className="flex justify-between items-start">
        <div className="text-[10px] font-semibold tracking-[0.14em] text-warningWaiting uppercase mb-1">Approval Required</div>
      </div>

      <h3 className="mt-1 text-[16px] font-semibold text-textPrimary tracking-tight">{title}</h3>
      <p className="mt-3 text-[14px] text-textSecondary leading-7 max-w-2xl">{detail}</p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button onClick={onApprove} className="bg-textPrimary hover:bg-black text-white px-6">
          Approve & Execute
        </Button>
        <Button variant="outline" onClick={onEdit}>
          Edit Details
        </Button>
        <Button variant="ghost" onClick={onReject} className="text-textMuted hover:text-errorBlocked hover:bg-errorBlocked/5">
          Reject
        </Button>
      </div>
    </CardShell>
  )
}

export function ExecutionReceipt({ text, timestamp }: { text: string; timestamp: string }) {
  return (
    <CardShell indicatorClassName="bg-successOnline" className="py-4">
      <div className="flex items-center gap-4">
        <div className="h-8 w-8 rounded-full bg-successOnline/10 flex items-center justify-center text-successOnline shrink-0">
          <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1 flex items-center justify-between">
          <div className="text-[13px] font-medium text-textPrimary">{text}</div>
          <div className="text-[11px] text-textMuted tabular-nums font-medium">{timestamp}</div>
        </div>
      </div>
    </CardShell>
  )
}

export function EmailDraftArtifact({
  emailId,
  draft,
  onChange,
  onOpenDocument,
  onSend,
}: {
  emailId: string
  draft: DraftArtifact
  onChange?: (draft: DraftArtifact) => void
  onOpenDocument?: () => void
  onSend?: () => void
}) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [localDraft, setLocalDraft] = React.useState(draft)
  const [isSaving, setIsSaving] = React.useState(false)
  const [sendError, setSendError] = React.useState<string | null>(null)
  const [isSending, setIsSending] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Sync from props if not editing
  React.useEffect(() => {
    if (!isEditing) {
      setLocalDraft(draft)
      setSendError(null)
    }
  }, [draft, isEditing])

  // Debounced Auto-save
  React.useEffect(() => {
    if (!isEditing) return

    const timer = setTimeout(async () => {
      setIsSaving(true)
      try {
        await updateDraft(emailId, localDraft)
        onChange?.(localDraft)
      } catch (e) {
        console.error("Auto-save failed", e)
      } finally {
        setIsSaving(false)
      }
    }, 3000)

    return () => clearTimeout(timer)
  }, [localDraft, isEditing, emailId, onChange])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateDraft(emailId, localDraft)
      onChange?.(localDraft)
      setIsEditing(false)
    } catch (e) {
      setSendError("Failed to save changes.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setLocalDraft(draft)
    setIsEditing(false)
    setSendError(null)
  }

  const handleRemoveAttachment = (id: string) => {
    const updated = {
      ...localDraft,
      attachments: localDraft.attachments?.filter(a => a.id !== id)
    }
    setLocalDraft(updated)
  }

  const handleAddAttachment = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const newAttachment: Attachment = {
      id: `local-${Date.now()}`,
      filename: file.name,
      mime_type: file.type,
      size: file.size
    }

    setLocalDraft(prev => ({
      ...prev,
      attachments: [...(prev.attachments || []), newAttachment]
    }))

    // Reset input
    e.target.value = ""
  }

  const handleApproveAndSend = async () => {
    setIsSending(true)
    setSendError(null)
    try {
      if (onSend) await onSend()
    } catch (e: any) {
      setSendError(e.message || "Failed to send email. Please try again.")
    } finally {
      setIsSending(false)
    }
  }

  return (
    <CardShell className="overflow-hidden p-0 border-borderStrong shadow-lg">
      <div className="bg-surfaceElevated border-b border-borderSubtle px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 text-textSecondary">
          <Mail className="h-4 w-4" strokeWidth={1.5} />
          <h3 className="text-[13px] font-semibold text-textPrimary tracking-wide">
            {isEditing ? "Edit Proposal" : "Email Proposal"}
          </h3>
          {isSaving && (
            <span className="text-[10px] text-textMuted animate-pulse flex items-center gap-1 ml-2">
              <Loader2 className="h-2.5 w-2.5 animate-spin" /> Saving...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isEditing ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-8 px-3 text-[11px] font-bold uppercase tracking-wider text-textSecondary hover:text-textPrimary hover:bg-surfaceHover"
            >
              <Edit className="mr-2 h-3.5 w-3.5" /> Edit
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="h-8 px-3 text-[11px] font-bold uppercase tracking-wider text-errorBlocked hover:bg-errorBlocked/5"
              >
                <CornerUpLeft className="mr-2 h-3.5 w-3.5" /> Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="h-8 px-3 text-[11px] font-bold uppercase tracking-wider bg-textPrimary text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Save className="mr-2 h-3.5 w-3.5" /> {isSaving ? "Saving..." : "Save"}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="p-6 bg-surface">
        {sendError && (
          <div className="mb-6 p-4 bg-errorBlocked/5 border border-errorBlocked/20 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="h-4 w-4 text-errorBlocked mt-0.5 shrink-0" />
            <div className="text-[13px] text-errorBlocked font-medium">{sendError}</div>
          </div>
        )}
        {/* Recipient & Subject Header */}
        <div className="grid gap-4 mb-6">
          <div className="grid grid-cols-[80px_1fr] gap-4 items-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-textMuted text-right">Recipient</span>
            {isEditing ? (
              <input
                value={localDraft.to}
                onChange={(e) => setLocalDraft({ ...localDraft, to: e.target.value })}
                className="h-9 w-full rounded-md bg-surfaceHover/50 border border-borderSubtle px-3 text-[13px] text-textPrimary focus:border-borderStrong focus:outline-none transition-all"
                placeholder="sarah@enterprise.com"
              />
            ) : (
              <span className="text-[14px] font-medium text-textPrimary">{draft.to || "Not specified"}</span>
            )}
          </div>
          <div className="grid grid-cols-[80px_1fr] gap-4 items-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-textMuted text-right">Subject</span>
            {isEditing ? (
              <input
                value={localDraft.subject}
                onChange={(e) => setLocalDraft({ ...localDraft, subject: e.target.value })}
                className="h-9 w-full rounded-md bg-surfaceHover/50 border border-borderSubtle px-3 text-[13px] font-medium text-textPrimary focus:border-borderStrong focus:outline-none transition-all"
                placeholder="Investor Update Q3"
              />
            ) : (
              <span className="text-[14px] font-medium text-textPrimary">{draft.subject || "No Subject"}</span>
            )}
          </div>
        </div>

        {/* Rich Text Editor Body */}
        <div className={cn(
          "mb-6 transition-all duration-300",
          isEditing ? "pl-0" : "pl-1 border-l-2 border-infoExecuting/20 ml-24"
        )}>
          <EmailEditor
            content={localDraft.body}
            onChange={(body) => setLocalDraft({ ...localDraft, body })}
            editable={isEditing}
          />
        </div>

        {/* Attachments Section */}
        {(localDraft.attachments && localDraft.attachments.length > 0 || isEditing) && (
          <div className={cn(
            "pt-4 border-t border-borderSubtle mt-6",
            !isEditing && localDraft.attachments?.length === 0 && "hidden"
          )}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] font-bold text-textMuted uppercase tracking-widest flex items-center gap-2">
                <Paperclip className="h-3 w-3" />
                Attachments ({localDraft.attachments?.length || 0})
              </div>
              {isEditing && (
                <>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <button
                    onClick={handleAddAttachment}
                    className="text-[10px] font-bold text-infoExecuting hover:underline flex items-center gap-1 group transition-all"
                  >
                    <Plus className="h-3 w-3 group-hover:scale-110 transition-transform" /> + Attach
                  </button>
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {localDraft.attachments?.map((att) => (
                <div key={att.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surfaceHover border border-borderSubtle text-[12px] text-textSecondary group hover:border-borderStrong transition-all shadow-sm">
                  <span className="truncate max-w-[150px] font-medium text-textPrimary">{att.filename}</span>
                  <span className="text-[10px] text-textMuted tabular-nums">
                    • {(att.size / (1024 * 1024)).toFixed(1)}MB
                  </span>
                  {isEditing && (
                    <button
                      onClick={() => handleRemoveAttachment(att.id)}
                      className="ml-1 p-0.5 rounded-full hover:bg-errorBlocked/10 text-textMuted hover:text-errorBlocked transition-colors"
                      title="Remove attachment"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
              {isEditing && localDraft.attachments?.length === 0 && (
                <div className="text-[11px] text-textMuted italic">No files attached.</div>
              )}
            </div>
          </div>
        )}

        {/* Final Actions (Only visible in preview or with explicit Send) */}
        {!isEditing && (
          <div className="mt-8 flex items-center justify-end gap-3">
            <Button
              onClick={handleApproveAndSend}
              disabled={isSending}
              className="px-6 h-10 bg-accentPrimary text-white rounded-full font-bold text-[12px] uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> Approve & Send
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </CardShell>
  )
}

export function CalendarDiffArtifact({ title, items }: { title: string; items: Array<{ time: string; update: string }> }) {
  return (
    <CardShell>
      <div className="flex items-center gap-3 mb-4">
        <div className="h-8 w-8 rounded-lg bg-surfaceElevated flex items-center justify-center text-textSecondary">
          <CalendarRange className="h-4 w-4" strokeWidth={1.5} />
        </div>
        <h3 className="text-[14px] font-medium text-textPrimary">{title}</h3>
      </div>
      <div className="space-y-px bg-borderSubtle rounded-lg overflow-hidden border border-borderSubtle">
        {items.map((entry) => (
          <div key={entry.time} className="flex gap-4 bg-surface px-4 py-3 text-[13px]">
            <span className="text-textMuted tabular-nums font-medium w-12 shrink-0">{entry.time}</span>
            <span className="text-textSecondary">{entry.update}</span>
          </div>
        ))}
      </div>
    </CardShell>
  )
}

export function MiniScheduleGridArtifact({
  title,
  slots,
}: {
  title: string
  slots: Array<{ slot: string; monday: string; tuesday: string; wednesday: string }>
}) {
  return (
    <CardShell>
      <div className="flex items-center gap-3 mb-4">
        <div className="h-8 w-8 rounded-lg bg-surfaceElevated flex items-center justify-center text-textSecondary">
          <FileText className="h-4 w-4" strokeWidth={1.5} />
        </div>
        <h3 className="text-[14px] font-medium text-textPrimary">{title}</h3>
      </div>

      <div className="overflow-hidden rounded-lg border border-borderSubtle">
        <div className="grid grid-cols-4 bg-surfaceElevated px-4 py-2.5 text-[10px] font-semibold tracking-wider text-textMuted uppercase">
          <span>Slot</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
        </div>
        {slots.map((entry) => (
          <div key={entry.slot} className="grid grid-cols-4 border-t border-borderSubtle bg-surface px-4 py-3 text-[12px] text-textSecondary hover:bg-surfaceHover transition-colors">
            <span className="tabular-nums font-medium text-textMuted">{entry.slot}</span>
            <span className="truncate">{entry.monday}</span>
            <span className="truncate">{entry.tuesday}</span>
            <span className="truncate">{entry.wednesday}</span>
          </div>
        ))}
      </div>
    </CardShell>
  )
}

export function HealthReportCard({ health }: { health: any }) {
  if (!health) return null

  const email = health.email || health.email_health
  const cal = health.calendar || health.calendar_health

  return (
    <CardShell className="max-w-xl">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-8 w-8 rounded-lg bg-surfaceElevated flex items-center justify-center text-infoExecuting">
          <ShieldCheck className="h-4 w-4" strokeWidth={1.5} />
        </div>
        <h3 className="text-[14px] font-semibold text-textPrimary tracking-tight">System Health Report</h3>
      </div>

      <div className="space-y-3">
        <HealthStatusItem
          label="Email Connection"
          status={email?.status}
          provider={email?.provider}
          details={email?.error_code}
        />
        <HealthStatusItem
          label="Calendar Connection"
          status={cal?.status}
          provider={cal?.provider}
          details={cal?.error_code}
        />
      </div>

      {email?.status !== 'OK' && (
        <div className="mt-6 pt-4 border-t border-borderSubtle">
          <Button
            className="w-full bg-textPrimary text-white"
            onClick={() => window.location.href = '/settings/integrations'}
          >
            Authorize Connection
          </Button>
        </div>
      )}
    </CardShell>
  )
}

function HealthStatusItem({ label, status, provider, details }: any) {
  const isOk = status === 'OK'
  const isErr = status === 'REVOKED' || status === 'EXPIRED' || status === 'ERROR'

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-borderSubtle bg-surfaceElevated/50">
      <div className="flex items-center gap-3">
        <div className={cn(
          "h-6 w-6 rounded-full flex items-center justify-center",
          isOk ? "bg-green-100 text-green-700" : isErr ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
        )}>
          {isOk ? <ShieldCheck className="h-3.5 w-3.5" /> : isErr ? <ShieldAlert className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
        </div>
        <div>
          <div className="text-[12px] font-medium text-textPrimary">{label}</div>
          <div className="text-[10px] text-textMuted uppercase tracking-wider">{provider || 'not connected'}</div>
        </div>
      </div>
      <div className={cn(
        "text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter",
        isOk ? "text-green-700 bg-green-50" : isErr ? "text-red-700 bg-red-50" : "text-amber-700 bg-amber-50"
      )}>
        {status || 'Unknown'}
      </div>
    </div>
  )
}

export function CardFeed({
  items,
  onOpenIntelligence,
  onUpdateDraft,
  onApprovalAction,
  onSourceClick,
}: {
  items: FeedItem[]
  onOpenIntelligence: (tab: IntelligenceTab) => void
  onUpdateDraft?: (id: string, draft: DraftArtifact) => void
  onApprovalAction?: (action: "approve" | "edit" | "reject", id: string) => void
  onSourceClick?: (ev: Evidence) => void
}) {
  if (items.length === 0) {
    return (
      <CardShell className="bg-surfaceElevated/50 border-dashed border-borderSubtle flex items-center justify-center min-h-[120px]">
        <div className="text-[13px] text-textMuted font-medium">System ready. Awaiting command.</div>
      </CardShell>
    )
  }

  return (
    <div className="space-y-6">
      {items.map((item) => {
        switch (item.type) {
          case "user-command":
            return (
              <div key={item.id} className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="rounded-2xl rounded-tr-sm bg-surfaceElevated px-5 py-3 border border-borderSubtle max-w-2xl">
                  <div className="text-[14px] text-textPrimary leading-relaxed">{item.text}</div>
                  <div className="mt-1 text-[10px] text-textMuted text-right font-medium opacity-70">{item.timestamp}</div>
                </div>
              </div>
            )

          case "response":
            return (
              <div key={item.id} className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="max-w-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-infoExecuting"></span>
                    <span className="text-[11px] font-semibold tracking-[0.14em] text-textMuted uppercase">AALIYAH</span>
                  </div>
                  <div className="text-[14px] text-textSecondary leading-7 whitespace-pre-wrap">{item.text}</div>
                </div>
              </div>
            )

          case "grounded-answer":
            return (
              <div key={item.id} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                <GroundedAnswerCard
                  text={item.text}
                  evidence={item.evidence}
                  status={item.status}
                  onSourceClick={(ev) => onSourceClick?.(ev)}
                />
              </div>
            )

          case "proposal":
            return (
              <div key={item.id} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <ProposalCard
                  title={item.title}
                  bullets={item.bullets}
                  onAnalyze={() => onOpenIntelligence("Research")}
                  onViewSources={() => onOpenIntelligence("Sources")}
                />
              </div>
            )

          case "approval":
            return (
              <div key={item.id} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <ApprovalCard
                  title={item.title}
                  detail={item.detail}
                  onApprove={() => onApprovalAction?.("approve", item.id)}
                  onEdit={() => onApprovalAction?.("edit", item.id)}
                  onReject={() => onApprovalAction?.("reject", item.id)}
                />
              </div>
            )

          case "receipt":
            return <div key={item.id} className="animate-in fade-in"><ExecutionReceipt text={item.text} timestamp={item.timestamp} /></div>

          case "artifact-email":
            return (
              <div key={item.id} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <EmailDraftArtifact
                  emailId={item.id}
                  draft={item.draft}
                  onChange={(draft) => onUpdateDraft?.(item.id, draft)}
                  onOpenDocument={() => onOpenIntelligence("Documents")}
                  onSend={() => onApprovalAction?.("approve", item.id)}
                />
              </div>
            )

          case "artifact-calendar":
            return <div key={item.id} className="animate-in fade-in"><CalendarDiffArtifact title={item.title} items={item.items} /></div>

          case "artifact-grid":
            return <div key={item.id} className="animate-in fade-in"><MiniScheduleGridArtifact title={item.title} slots={item.slots} /></div>

          case "health-report":
            return <div key={item.id} className="animate-in fade-in"><HealthReportCard health={item.health} /></div>

          default:
            return null
        }
      })}
    </div>
  )
}
