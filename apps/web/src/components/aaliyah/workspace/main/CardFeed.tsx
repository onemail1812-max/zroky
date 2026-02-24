"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import ReactMarkdown from "react-markdown"
import type { Variants } from "framer-motion"
import {
  CalendarRange, CheckCircle2, FileText, Mail, ArrowRight,
  Paperclip, X, Save, CornerUpLeft, Plus, Send, Edit,
  AlertCircle, Loader2, ShieldCheck, AlertTriangle, ShieldAlert,
  Sparkles, Bot, User, Check, Zap, Info, ChevronDown, ChevronRight, ChevronUp, Server, Code, MessageSquare
} from "lucide-react"

import { cn } from "@/lib/utils"
import type { IntelligenceTab } from "@/components/aaliyah/workspace/types"
import { Button } from "@/components/aaliyah/ui/Button"
import { EmailEditor } from "./EmailEditor"
import { updateDraft, confirmBooking } from "@/lib/aaliyah/api"
import type { BookingSlot } from "@/lib/aaliyah/api"
import { useViewerStore } from "@/lib/aaliyah/viewerStore"
import { MeetingSummaryCard } from "@/components/aaliyah/workspace/feed/MeetingSummaryCard"

// --- Types ---

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
  reasoning?: string
}

export type CardAction = {
  label: string
  type: "link" | "callback" | "snooze" | "approve" | "pay" | "open"
  icon?: string
  payload?: any
  primary?: boolean
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
  | { id: string; type: "artifact-grid"; title: string; slots: Array<{ slot: string; monday: string; tuesday: string; wednesday: string }>; actions?: CardAction[] }
  | { id: string; type: "health-report"; health: any }
  | { id: string; type: "sync-prompt"; onSync: () => void }
  | { id: string; type: "meeting-action"; bookingSlug: string; subject: string; proposedSlots: BookingSlot[]; actions?: CardAction[] }
  | { id: string; type: "meeting-summary"; eventTitle: string; summary: { executive_summary: string; decisions: string[]; action_items: { owner: string; task: string; due_date: string }[]; sentiment: string; keywords: string[] }; timestamp?: string; actions?: CardAction[] }
  | { id: string; type: "new-email-arrival"; sender: string; subject: string; snippet: string; timestamp: string; actions?: CardAction[]; threadId?: string }
  | { id: string; type: "followup-nudge"; sender: string; subject: string; threadId: string; timestamp: string; actions?: CardAction[] }

// --- Animation Variants ---

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.96, filter: "blur(4px)" },
  visible: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { type: "spring", stiffness: 300, damping: 24 } }
}

const contentLayoutSpring = { type: "spring", stiffness: 450, damping: 35 }

// --- Sub-components ---

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
    <motion.div variants={itemVariants} className="flex justify-start w-full relative group">
      <div className="max-w-3xl w-full">
        <div className="flex items-center gap-2.5 mb-3 px-1">
          <div className="relative flex items-center justify-center">
            <span className={cn(
              "absolute inset-0 rounded-full animate-ping opacity-20",
              status === "found" ? "bg-emerald-500" : status === "clarify" ? "bg-amber-500" : "bg-zinc-500"
            )} />
            <span className={cn(
              "h-2 w-2 rounded-full relative",
              status === "found" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" : status === "clarify" ? "bg-amber-500" : "bg-zinc-400"
            )} />
          </div>
          <span className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase">Grounded Response</span>
        </div>

        <div className="relative rounded-3xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-xl p-5 shadow-sm transition-all hover:bg-white/80 dark:hover:bg-zinc-950/80">
          <div className="text-[15px] text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap font-medium" data-testid="grounded-answer-text">
            {text}
          </div>

          {evidence.length > 0 && (
            <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-3.5 w-3.5 text-zinc-400" />
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Verified Sources</span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {evidence.map((ev, idx) => (
                  <button
                    key={`${ev.id}-${idx}`}
                    onClick={() => onSourceClick(ev)}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 shadow-sm border border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md transition-all group/src"
                  >
                    {ev.type === "thread" ? (
                      <Mail className="h-3.5 w-3.5 text-indigo-500 group-hover/src:text-indigo-600 transition-colors" />
                    ) : (
                      <CalendarRange className="h-3.5 w-3.5 text-rose-500 group-hover/src:text-rose-600 transition-colors" />
                    )}
                    <span className="text-[12px] font-semibold text-zinc-700 dark:text-zinc-300">
                      {ev.provider === "google" ? "Gmail" : ev.provider === "microsoft" ? "Outlook" : "Calendar"}
                    </span>
                    <ArrowRight className="h-3 w-3 text-zinc-300 group-hover/src:text-zinc-600 group-hover/src:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function ActionsRow({
  actions,
  onAction,
}: {
  actions?: CardAction[]
  onAction?: (action: CardAction) => void
}) {
  if (!actions || actions.length === 0) return null

  return (
    <div className="mt-5 flex flex-wrap gap-2.5">
      {actions.map((action, idx) => {
        const Icon = action.type === "approve" ? ShieldCheck : action.type === "pay" ? Zap : action.type === "snooze" ? CalendarRange : ArrowRight

        return (
          <button
            key={`${action.label}-${idx}`}
            onClick={(e) => {
              e.stopPropagation()
              onAction?.(action)
            }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-2xl text-[12px] font-bold tracking-tight transition-all",
              action.primary
                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 shadow-sm"
            )}
          >
            <Icon className={cn("h-3.5 w-3.5", action.primary ? "text-zinc-100 dark:text-zinc-900" : "text-zinc-400")} />
            {action.label}
          </button>
        )
      })}
    </div>
  )
}

function CardShell({
  children,
  headerIcon: HeaderIcon,
  headerLabel,
  headerColorClass,
  className,
}: {
  children: React.ReactNode
  headerIcon?: React.ElementType
  headerLabel?: string
  headerColorClass?: string
  className?: string
}) {
  return (
    <motion.article
      variants={itemVariants}
      className={cn(
        "group relative rounded-3xl border border-zinc-200/60 bg-white p-6 transition-all shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:border-zinc-300",
        className
      )}
    >
      {headerLabel && (
        <div className="flex items-center gap-2 mb-4">
          {HeaderIcon && <HeaderIcon className={cn("h-4 w-4", headerColorClass || "text-zinc-400")} />}
          <span className={cn("text-[11px] font-bold tracking-[0.15em] uppercase", headerColorClass || "text-zinc-400")}>
            {headerLabel}
          </span>
        </div>
      )}
      {children}
    </motion.article>
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
    <CardShell headerIcon={Sparkles} headerLabel="AI Proposal" headerColorClass="text-indigo-500">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-5">
        <h3 className="text-[18px] font-bold text-zinc-900 dark:text-zinc-100 leading-snug">{title}</h3>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={onAnalyze} className="h-8 rounded-full text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800">
            Analyze Deeply
          </Button>
          <Button variant="outline" size="sm" onClick={onViewSources} className="h-8 rounded-full text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800">
            View Material
          </Button>
        </div>
      </div>

      <ul className="space-y-3">
        {bullets.map((item, i) => (
          <li key={i} className="flex gap-3.5 text-[14px] text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium">
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500/50 shadow-[0_0_6px_rgba(99,102,241,0.5)]" aria-hidden="true" />
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
    <CardShell
      headerIcon={AlertCircle}
      headerLabel="Executive Approval Required"
      headerColorClass="text-amber-500"
      className="bg-amber-50/30 dark:bg-amber-500/5 border-amber-200/50 dark:border-amber-500/20"
    >
      <h3 className="mt-1 text-[18px] font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">{title}</h3>
      <p className="mt-3 text-[14.5px] text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl font-medium">{detail}</p>

      <div className="mt-7 flex flex-wrap items-center gap-3">
        <button
          onClick={onApprove}
          className="flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-6 py-2.5 rounded-full font-bold text-[13px] hover:scale-105 transition-transform shadow-lg shadow-zinc-900/20"
        >
          <CheckCircle2 className="h-4 w-4" /> Approve & Execute
        </button>
        <button
          onClick={onEdit}
          className="flex items-center gap-2 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 px-5 py-2.5 rounded-full font-bold text-[13px] hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-sm"
        >
          <Edit className="h-4 w-4" /> Adjust Parameters
        </button>
        <button
          onClick={onReject}
          className="flex items-center gap-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 px-4 py-2.5 rounded-full font-bold text-[13px] transition-colors ml-auto"
        >
          <X className="h-4 w-4" /> Discard
        </button>
      </div>
    </CardShell>
  )
}

export function ExecutionReceipt({ text, timestamp }: { text: string; timestamp: string }) {
  return (
    <motion.div variants={itemVariants} className="flex justify-center w-full my-2">
      <div className="flex items-center gap-3 bg-white/60 dark:bg-zinc-950/60 backdrop-blur border border-zinc-200/50 dark:border-zinc-800/50 pl-2 pr-4 py-1.5 rounded-full shadow-sm">
        <div className="h-6 w-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </div>
        <div className="text-[12px] font-bold text-zinc-800 dark:text-zinc-200">{text}</div>
        <div className="w-[1px] h-3 bg-zinc-300 dark:bg-zinc-700 mx-1" />
        <div className="text-[10px] text-zinc-400 font-semibold tabular-nums tracking-wider">{timestamp}</div>
      </div>
    </motion.div>
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
  const [isReasoningOpen, setIsReasoningOpen] = React.useState(true) // Open by default
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const { openDocument } = useViewerStore()

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
        // Auto-save error suppressed in UI
      } finally {
        setIsSaving(false)
      }
    }, 2500)

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
    e.target.value = ""
  }

  const handleApproveAndSend = async () => {
    setIsSending(true)
    setSendError(null)
    try {
      if (onSend) await onSend()
    } catch (e: any) {
      setSendError(e.message || "Execution blocked. System error occurred.")
    } finally {
      setIsSending(false)
    }
  }

  const [showOriginal, setShowOriginal] = React.useState(false)
  const [originalContent, setOriginalContent] = React.useState<string | null>(null)
  const [isLoadingOriginal, setIsLoadingOriginal] = React.useState(false)

  const toggleOriginal = async () => {
    if (!showOriginal && !originalContent) {
      setIsLoadingOriginal(true)
      try {
        const { inboxService } = await import("@/services/inbox.service")
        const body = await inboxService.getEmailBody(emailId)
        setOriginalContent(body)
      } catch (e) {
        // Original fetch error suppressed
      } finally {
        setIsLoadingOriginal(false)
      }
    }
    setShowOriginal(!showOriginal)
  }

  return (
    <motion.div
      variants={itemVariants}
      layout
      className={cn(
        "group relative flex flex-col rounded-[32px] border overflow-hidden transition-all duration-500",
        isEditing
          ? "border-indigo-500/40 bg-white dark:bg-zinc-950 shadow-[0_20px_60px_-15px_rgba(99,102,241,0.15)] ring-4 ring-indigo-500/5 z-10"
          : "border-zinc-200/60 dark:border-zinc-800/60 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-3xl shadow-2xl shadow-zinc-200/20 dark:shadow-black/20 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-3xl"
      )}
    >
      {/* Dynamic Header */}
      <motion.div layout="position" className="relative flex items-center justify-between px-7 py-5 bg-gradient-to-b from-zinc-50/80 to-transparent dark:from-zinc-900/50 dark:to-transparent border-b border-zinc-100 dark:border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100/50 dark:border-indigo-500/20">
            {showOriginal ? <Mail className="h-5 w-5" /> : <Sparkles className="h-5 w-5" strokeWidth={2} />}
          </div>
          <div>
            <h3 className="text-[15px] font-black tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              {showOriginal ? "Original Incoming Email" : isEditing ? "Modifying Draft" : "Prepared Communication"}
              {(isEditing || isLoadingOriginal) && <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />}
            </h3>
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
              {showOriginal ? <Mail className="h-3 w-3" /> : <Zap className="h-3 w-3 text-amber-500" />}
              {showOriginal ? "VERIFICATION MODE" : "EXECUTIVE ACTION"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isEditing && (
            <button
              onClick={toggleOriginal}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all border shadow-sm",
                showOriginal
                  ? "bg-black dark:bg-white text-white dark:text-black border-black"
                  : "bg-white dark:bg-zinc-900 text-zinc-600 border-zinc-200 hover:border-zinc-400"
              )}
            >
              <Info className="h-3.5 w-3.5" />
              {showOriginal ? "Back to Draft" : "Show Original"}
            </button>
          )}

          {!isEditing && !showOriginal && (
            <button
              onClick={() => setIsEditing(true)}
              className="group/btn flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <Edit className="h-3.5 w-3.5 text-zinc-400 group-hover/btn:text-indigo-500 transition-colors" /> Override
            </button>
          )}

          {isEditing && (
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-[12px] font-bold bg-indigo-500 text-white shadow-md hover:bg-indigo-600 disabled:opacity-50 transition-all"
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {isSaving ? "Saving" : "Lock Draft"}
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Reasoning Dropdown */}
      {draft.reasoning && !isEditing && (
        <div className="border-b border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50">
          <button
            onClick={() => setIsReasoningOpen(!isReasoningOpen)}
            className="w-full flex items-center justify-between px-7 py-3 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-6 w-6 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <span className="text-[12px] font-bold text-zinc-700 dark:text-zinc-300 tracking-tight">Aaliyah's Logic Trace</span>
            </div>
            {isReasoningOpen ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
          </button>
          <AnimatePresence>
            {isReasoningOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-7 pb-4 pt-1">
                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 text-[13px] font-medium text-zinc-600 dark:text-zinc-400 leading-relaxed shadow-inner">
                    {draft.reasoning}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Main Content Area */}
      <motion.div layout="position" className="p-7">

        {sendError && (
          <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0" />
            <div className="text-[13px] text-rose-700 dark:text-rose-400 font-semibold">{sendError}</div>
          </div>
        )}

        {/* Form Fields: iOS / Sleek style */}
        <div className="space-y-4 mb-6 relative">
          <div className="relative flex items-center">
            <div className="w-20 shrink-0 text-[11px] font-bold uppercase tracking-widest text-zinc-400">To:</div>
            {isEditing ? (
              <input
                value={localDraft.to}
                onChange={(e) => setLocalDraft({ ...localDraft, to: e.target.value })}
                className="flex-1 min-w-0 bg-transparent border-b border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 pb-1 text-[15px] font-medium text-zinc-800 dark:text-zinc-200 outline-none transition-colors"
                placeholder="Target email coordinates"
              />
            ) : (
              <div className="flex-1 min-w-0 text-[15px] font-semibold text-zinc-800 dark:text-zinc-200 pb-1">
                {draft.to}
              </div>
            )}
          </div>

          <div className="relative flex items-center">
            <div className="w-20 shrink-0 text-[11px] font-bold uppercase tracking-widest text-zinc-400">Subject:</div>
            {isEditing ? (
              <input
                value={localDraft.subject}
                onChange={(e) => setLocalDraft({ ...localDraft, subject: e.target.value })}
                className="flex-1 min-w-0 bg-transparent border-b border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 pb-1 text-[15px] font-semibold text-zinc-900 dark:text-white outline-none transition-colors"
                placeholder="Directive subject"
              />
            ) : (
              <div className="flex-1 min-w-0 text-[15px] font-bold text-zinc-900 dark:text-white pb-1">
                {draft.subject}
              </div>
            )}
          </div>
        </div>

        {/* The Content Area: Draft or Original */}
        <div className={cn(
          "rounded-3xl transition-all duration-300 overflow-hidden min-h-[100px]",
          isEditing
            ? "border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 min-h-[300px] shadow-inner"
            : showOriginal
              ? "bg-zinc-50 dark:bg-zinc-900/50 border border-dashed border-zinc-300 dark:border-zinc-700 p-5"
              : "pl-3 border-l-[3px] border-indigo-500/30"
        )}>
          {showOriginal ? (
            <div className="text-[14px] leading-relaxed text-zinc-600 dark:text-zinc-400 font-serif italic whitespace-pre-wrap">
              {isLoadingOriginal ? (
                <div className="flex items-center justify-center py-10 gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Fetching original source...</span>
                </div>
              ) : (
                originalContent || "Original content not available."
              )}
            </div>
          ) : (
            <EmailEditor
              content={localDraft.body}
              onChange={(body) => setLocalDraft({ ...localDraft, body })}
              editable={isEditing}
            />
          )}
        </div>

        {/* Attachments UI */}
        <AnimatePresence>
          {(localDraft.attachments && localDraft.attachments.length > 0 || isEditing) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800/80"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  <Paperclip className="h-3.5 w-3.5" />
                  Payload Files ({localDraft.attachments?.length || 0})
                </div>
                {isEditing && (
                  <>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                    <button
                      onClick={handleAddAttachment}
                      className="px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center gap-1.5"
                    >
                      <Plus className="h-3 w-3" /> Add File
                    </button>
                  </>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                {localDraft.attachments?.map((att) => (
                  <div key={att.id} className="group relative flex items-center gap-3 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm hover:border-zinc-300 transition-all cursor-pointer"
                    onClick={() => {
                      const docType = att.mime_type?.includes("pdf") ? "pdf" : att.mime_type?.includes("image") ? "image" : att.mime_type?.includes("spreadsheet") || att.filename.endsWith(".csv") ? "sheet" : "unknown"
                      const url = att.id.startsWith("local-") ? URL.createObjectURL(new File([], att.filename)) : `/api/v1/attachments/${att.id}/download?filename=${encodeURIComponent(att.filename)}`
                      openDocument({
                        id: att.id,
                        name: att.filename,
                        type: docType,
                        url: url,
                        size: att.size,
                        mimeType: att.mime_type
                      })
                    }}
                  >
                    <div className="h-8 w-8 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                      <FileText className="h-4 w-4 group-hover:text-indigo-500 transition-colors" />
                    </div>
                    <div>
                      <div className="text-[13px] font-bold text-zinc-800 dark:text-zinc-200 truncate max-w-[160px] group-hover:text-indigo-600 transition-colors">{att.filename}</div>
                      <div className="text-[10px] text-zinc-400 font-semibold tracking-wider uppercase">{(att.size / (1024 * 1024)).toFixed(2)} MB</div>
                    </div>
                    {isEditing && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveAttachment(att.id)
                        }}
                        className="ml-2 h-7 w-7 rounded-full bg-zinc-50 dark:bg-zinc-800 hover:bg-rose-50 hover:text-rose-500 flex items-center justify-center text-zinc-400 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Giant Execute Button - ONLY visible when NOT editing & NOT showing original */}
        <AnimatePresence>
          {!isEditing && !showOriginal && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800/80"
            >
              <button
                onClick={handleApproveAndSend}
                disabled={isSending}
                className="group relative w-full h-14 overflow-hidden rounded-[24px] bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black text-[14px] uppercase tracking-widest shadow-2xl hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] dark:hover:shadow-[0_20px_40px_-15px_rgba(255,255,255,0.3)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-3"
              >
                {/* Shine effect */}
                <span className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 dark:via-black/10 to-transparent skew-x-12" />

                {isSending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" /> ENCRYPTING & SENDING
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5 group-hover:translate-x-1 transition-transform" /> APPROVE AND SEND
                  </>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </motion.div>
  )
}

export function CalendarDiffArtifact({ title, items }: { title: string; items: Array<{ time: string; update: string }> }) {
  return (
    <CardShell headerIcon={CalendarRange} headerLabel="Calendar Mutation" headerColorClass="text-rose-500">
      <h3 className="text-[18px] font-bold text-zinc-900 dark:text-zinc-100 mb-5">{title}</h3>
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 overflow-hidden divide-y divide-zinc-200 dark:divide-zinc-800">
        {items.map((entry) => (
          <div key={entry.time} className="flex gap-4 px-5 py-4 text-[14px]">
            <span className="text-rose-500 tabular-nums font-black tracking-wider w-16 shrink-0">{entry.time}</span>
            <span className="text-zinc-700 dark:text-zinc-300 font-medium">{entry.update}</span>
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
    <CardShell headerIcon={FileText} headerLabel="Matrix Analysis" headerColorClass="text-emerald-500">
      <h3 className="text-[18px] font-bold text-zinc-900 dark:text-zinc-100 mb-5">{title}</h3>
      <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <div className="grid grid-cols-4 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-5 py-3 text-[11px] font-black tracking-widest text-zinc-500 uppercase">
          <span>Slot</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
        </div>
        <div className="divide-y divide-zinc-200/50 dark:divide-zinc-800/50 bg-white/50 dark:bg-zinc-950/50">
          {slots.map((entry) => (
            <div key={entry.slot} className="grid grid-cols-4 px-5 py-4 text-[13px] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors font-medium">
              <span className="tabular-nums font-bold text-zinc-500">{entry.slot}</span>
              <span className="truncate pr-2">{entry.monday}</span>
              <span className="truncate pr-2">{entry.tuesday}</span>
              <span className="truncate">{entry.wednesday}</span>
            </div>
          ))}
        </div>
      </div>
    </CardShell>
  )
}

export function SyncPromptCard({ onSync }: { onSync: () => void }) {
  const [syncing, setSyncing] = React.useState(false)

  const handleSync = async () => {
    setSyncing(true)
    try {
      await onSync()
    } finally {
    }
  }

  return (
    <motion.div variants={itemVariants} className="flex justify-start w-full relative">
      <div className="max-w-2xl w-full">
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
          <span className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase">System Offline</span>
        </div>

        <div className="relative rounded-3xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-xl p-6 md:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
            <div className="h-16 w-16 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 flex items-center justify-center shrink-0">
              <Zap className={cn("h-7 w-7 text-amber-500", syncing && "animate-pulse")} />
            </div>

            <div className="flex-1">
              <h2 className="text-[20px] font-black text-zinc-900 dark:text-zinc-100 mb-2 leading-tight">
                Data pipeline established. Awaiting initial extraction.
              </h2>
              <p className="text-[14px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium mb-6">
                Connect your accounts to securely stream the last 7 days of inbox data and 14 days of calendar mapping into the core matrix.
              </p>

              <button
                onClick={handleSync}
                disabled={syncing}
                className={cn(
                  "inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-[13px] font-bold uppercase tracking-widest transition-all duration-300 shadow-xl w-full md:w-auto justify-center",
                  syncing
                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed shadow-none"
                    : "bg-amber-500 hover:bg-amber-400 text-white hover:scale-105 hover:shadow-amber-500/25 active:scale-95"
                )}
              >
                {syncing ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> ESTABLISHING LINK...</>
                ) : (
                  <><Server className="h-4 w-4" /> INITIATE SYNC SEQUENCE</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export function HealthReportCard({ health }: { health: any }) {
  if (!health) return null

  const email = health.email || health.email_health
  const cal = health.calendar || health.calendar_health

  const emailOk = email?.status === 'OK'
  const isError = email?.status === 'REVOKED' || email?.status === 'EXPIRED' || email?.status === 'ERROR'
  const emailMissing = !email || !email.status

  // If everything is OK, we don't necessarily need to show a chunky card in the feed.
  // But if we do, make it subtle.
  if (emailOk) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl w-full mx-auto"
      >
        <div className="flex items-center justify-between p-4 rounded-2xl border border-zinc-200/40 dark:border-white/5 bg-white/40 dark:bg-black/20 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Check className="h-4 w-4 text-emerald-500" strokeWidth={3} />
            </div>
            <span className="text-[13px] font-medium text-zinc-600 dark:text-zinc-400">Accounts connected and syncing seamlessly.</span>
          </div>
          <a href="/brain" className="text-[12px] font-semibold text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">Manage</a>
        </div>
      </motion.div>
    )
  }

  // Premium Empty State / Disconnected State
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl w-full mx-auto mt-8 relative group"
    >
      {/* Decorative subtle glow */}
      <div className="absolute inset-0 bg-gradient-to-tr from-zinc-50 to-white rounded-[32px] blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-700 -z-10" />

      <div className="relative border border-zinc-200/60 bg-white rounded-[32px] p-8 md:p-12 shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden">

        {/* Top visual indicator */}
        <div className="mb-8">
          <div className={cn(
            "h-14 w-14 rounded-2xl flex items-center justify-center border",
            isError
              ? "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-500"
              : "bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white"
          )}>
            {isError ? <ShieldAlert className="h-7 w-7" strokeWidth={1.5} /> : <Zap className="h-7 w-7" strokeWidth={1.5} />}
          </div>
        </div>

        <div className="space-y-4 max-w-lg">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900">
            {isError ? "Connection interrupted" : "Hi there, let's get you set up."}
          </h2>
          <p className="text-[15px] leading-relaxed text-zinc-500 font-medium">
            {isError
              ? "Aaliyah lost access to your primary accounts. Please reconnect to resume intelligent triaging and scheduling."
              : "I need access to your communication systems to automatically prioritize your work, draft responses, and manage your schedule behind the scenes."
            }
          </p>
        </div>

        <div className="mt-10 flex items-center gap-4">
          <a
            href="/brain"
            className="group relative inline-flex items-center justify-center gap-3 bg-zinc-900 text-white px-8 py-4 rounded-full font-semibold text-[15px] transition-all"
          >
            {/* Soft glowing shadow underneath */}
            <div className="absolute inset-0 rounded-full bg-zinc-900 opacity-20 blur-xl group-hover:opacity-40 transition-opacity duration-500"></div>

            <span className="relative z-10 flex items-center gap-2">
              {isError ? "Reconnect Accounts" : "Connect Accounts"}
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </a>
          {!isError && (
            <span className="text-[13px] font-medium text-zinc-400">Takes less than a minute</span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// --- Meeting Action Card (One-Tap Calendar Sync) ---

function MeetingActionCard({
  bookingSlug,
  subject,
  proposedSlots,
}: {
  bookingSlug: string
  subject: string
  proposedSlots: BookingSlot[]
}) {
  const [confirmedSlot, setConfirmedSlot] = React.useState<BookingSlot | null>(null)
  const [loading, setLoading] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const handleBook = async (slot: BookingSlot) => {
    setLoading(slot.start)
    setError(null)
    try {
      await confirmBooking(bookingSlug, slot)
      setConfirmedSlot(slot)
    } catch (e: any) {
      setError(e.message || "Booking failed")
    } finally {
      setLoading(null)
    }
  }

  const formatSlot = (slot: BookingSlot) => {
    try {
      const d = new Date(slot.start)
      return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) +
        ", " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    } catch {
      return slot.label || slot.start
    }
  }

  if (confirmedSlot) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl w-full mx-auto"
      >
        <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/50 p-6">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="h-8 w-8 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" strokeWidth={2.5} />
            </div>
            <span className="text-[10px] font-bold tracking-[0.2em] text-emerald-600 uppercase">Meeting Booked</span>
          </div>
          <div className="text-[14px] font-semibold text-zinc-800 mb-2">{subject}</div>
          <div className="flex items-center gap-2 text-emerald-600">
            <Check className="h-4 w-4" />
            <span className="text-[13px] font-medium">Confirmed: {formatSlot(confirmedSlot)}</span>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-xl w-full mx-auto"
    >
      <div className="rounded-2xl border border-blue-200/60 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="h-8 w-8 rounded-xl bg-blue-100 flex items-center justify-center">
            <CalendarRange className="h-4 w-4 text-blue-600" strokeWidth={2.5} />
          </div>
          <span className="text-[10px] font-bold tracking-[0.2em] text-blue-600 uppercase">Meeting Request</span>
        </div>
        <div className="text-[14px] font-semibold text-zinc-800 mb-1">{subject}</div>
        <p className="text-[12px] text-zinc-500 mb-4">Tap a slot to book instantly:</p>
        <div className="flex flex-wrap gap-2">
          {proposedSlots.slice(0, 5).map((slot) => (
            <button
              key={slot.start}
              onClick={() => handleBook(slot)}
              disabled={loading !== null}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all",
                "bg-blue-50 text-blue-700 border border-blue-200/60 hover:bg-blue-100 hover:border-blue-300",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                loading === slot.start && "animate-pulse"
              )}
            >
              <CalendarRange className="h-3.5 w-3.5" />
              {formatSlot(slot)}
            </button>
          ))}
        </div>
        {error && (
          <div className="flex items-center gap-2 text-rose-600 text-[12px] mt-3">
            <AlertCircle className="h-3.5 w-3.5" />
            {error}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export function CardFeed({
  items,
  onOpenIntelligence,
  onUpdateDraft,
  onApprovalAction,
  onSourceClick,
  onCardAction,
}: {
  items: FeedItem[]
  onOpenIntelligence: (tab: IntelligenceTab) => void
  onUpdateDraft?: (emailId: string, draft: any) => void
  onApprovalAction?: (action: "approve" | "edit" | "reject", emailId: string) => void
  onSourceClick?: (ev: Evidence) => void
  onCardAction?: (action: CardAction, itemId: string) => void
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] opacity-40">
        <Code className="h-8 w-8 text-zinc-300 mb-3" />
        <div className="text-[12px] font-bold text-zinc-400 tracking-widest uppercase">System Terminal Standby</div>
      </div>
    )
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: { transition: { staggerChildren: 0.1 } }
      }}
      className="space-y-6 md:space-y-8"
    >
      {items.map((item) => {
        switch (item.type) {
          case "user-command":
            return (
              <motion.div layout key={item.id} variants={itemVariants} className="flex justify-end w-full relative">
                <div className="max-w-4xl w-full flex justify-end gap-3 items-end">
                  <div className="relative rounded-[28px] rounded-br-[4px] bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-6 py-4 shadow-xl mb-1">
                    <div className="text-[15px] font-medium leading-relaxed">{item.text}</div>
                    <div className="absolute -bottom-6 right-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                      {item.timestamp}
                    </div>
                  </div>
                  <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center text-white text-[15px] font-bold shadow-md ring-2 ring-white">
                    N
                  </div>
                </div>
              </motion.div>
            )

          case "response":
            return (
              <motion.div layout key={item.id} variants={itemVariants} className="flex justify-start w-full relative group">
                <div className="max-w-4xl w-full flex items-start gap-4">
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[12px] bg-white flex items-center justify-center shadow-md ring-1 ring-black/5">
                    <img src="/app-logo.png" alt="Aaliyah" className="w-full h-full object-cover" />
                    <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-emerald-500 rounded-full ring-2 ring-white shadow-sm" />
                  </div>
                  <div className="flex-1 mt-1">
                    <div className="flex items-center gap-2.5 mb-2 px-1">
                      <span className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase">{item.title || "AALIYAH CORE"}</span>
                    </div>
                    <div className={cn(
                      "text-[15px] leading-relaxed font-medium bg-white dark:bg-zinc-900 rounded-[24px] rounded-tl-[4px] p-5 shadow-sm border border-zinc-100 dark:border-zinc-800",
                      item.tone === "error" ? "text-rose-600 dark:text-rose-400 border-rose-100" : "text-zinc-800 dark:text-zinc-200"
                    )}>
                      <div className="prose prose-zinc dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-zinc-100 dark:prose-pre:bg-zinc-800 prose-pre:text-zinc-900 dark:prose-pre:text-zinc-100">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
                            strong: ({ children }) => <strong className="font-bold text-zinc-900 dark:text-zinc-100">{children}</strong>,
                            ul: ({ children }) => <ul className="list-disc pl-4 mb-4 last:mb-0">{children}</ul>,
                            li: ({ children }) => <li className="mb-1 last:mb-0">{children}</li>
                          }}
                        >
                          {item.text}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )

          case "grounded-answer":
            return (
              <GroundedAnswerCard
                key={item.id}
                text={item.text}
                evidence={item.evidence}
                status={item.status}
                onSourceClick={(ev) => onSourceClick?.(ev)}
              />
            )

          case "proposal":
            return (
              <ProposalCard
                key={item.id}
                title={item.title}
                bullets={item.bullets}
                onAnalyze={() => onOpenIntelligence("Research")}
                onViewSources={() => onOpenIntelligence("Sources")}
              />
            )

          case "approval":
            return (
              <ApprovalCard
                key={item.id}
                title={item.title}
                detail={item.detail}
                onApprove={() => onApprovalAction?.("approve", item.id)}
                onEdit={() => onApprovalAction?.("edit", item.id)}
                onReject={() => onApprovalAction?.("reject", item.id)}
              />
            )

          case "receipt":
            return <ExecutionReceipt key={item.id} text={item.text} timestamp={item.timestamp} />

          case "artifact-email":
            return (
              <EmailDraftArtifact
                key={item.id}
                emailId={item.id}
                draft={item.draft}
                onChange={(draft) => onUpdateDraft?.(item.id, draft)}
                onOpenDocument={() => onOpenIntelligence("Documents")}
                onSend={() => onApprovalAction?.("approve", item.id)}
              />
            )

          case "artifact-calendar":
            return <CalendarDiffArtifact key={item.id} title={item.title} items={item.items} />

          case "artifact-grid":
            return <MiniScheduleGridArtifact key={item.id} title={item.title} slots={item.slots} />

          case "health-report":
            return <motion.div layout key={item.id} variants={itemVariants} className="w-full flex justify-center"><HealthReportCard health={item.health} /></motion.div>

          case "sync-prompt":
            return <motion.div layout key={item.id} className="w-full flex justify-center"><SyncPromptCard onSync={item.onSync} /></motion.div>

          case "meeting-action":
            return (
              <motion.div layout key={item.id} variants={itemVariants} className="w-full">
                <MeetingActionCard
                  bookingSlug={item.bookingSlug}
                  subject={item.subject}
                  proposedSlots={item.proposedSlots}
                />
              </motion.div>
            )

          case "meeting-summary":
            return (
              <motion.div layout key={item.id} variants={itemVariants} className="w-full max-w-3xl">
                <MeetingSummaryCard
                  eventTitle={item.eventTitle}
                  summary={item.summary}
                  timestamp={item.timestamp}
                />
              </motion.div>
            )

          case "new-email-arrival":
            return (
              <motion.div
                layout
                key={item.id}
                initial={{ opacity: 0, x: -20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                variants={itemVariants}
                className="flex justify-start w-full relative group"
              >
                <div className="max-w-xl w-full">
                  <div className="flex items-center gap-2.5 mb-3 px-1">
                    <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-pulse" />
                    <span className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase">Live Arrival</span>
                  </div>

                  <div className="relative overflow-hidden rounded-[32px] rounded-tl-[4px] border border-blue-100 dark:border-blue-900/30 bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-950/20 dark:to-zinc-950 p-6 shadow-sm hover:shadow-md transition-all group-hover:scale-[1.01]">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 shrink-0 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg">
                        <Mail className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-black text-zinc-900 dark:text-zinc-100 truncate pr-4">
                            {item.sender}
                          </h4>
                          <span className="text-[10px] font-bold text-blue-600/60 uppercase tracking-widest whitespace-nowrap">
                            {item.timestamp}
                          </span>
                        </div>
                        <p className="text-[13px] font-bold text-zinc-800 dark:text-zinc-200 mb-1 truncate">
                          {item.subject}
                        </p>
                        <p className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed italic opacity-80">
                          "{item.snippet}..."
                        </p>
                      </div>
                    </div>

                    {/* Ambient Glow */}
                    <div className="absolute top-0 right-0 h-24 w-24 bg-blue-400/5 blur-[40px] rounded-full -mr-12 -mt-12 pointer-events-none" />
                  </div>
                  <ActionsRow actions={item.actions} onAction={(action) => onCardAction?.(action, item.id)} />
                </div>
              </motion.div>
            )

          case "followup-nudge":
            return (
              <motion.div
                layout
                key={item.id}
                initial={{ opacity: 0, x: -20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                variants={itemVariants}
                className="flex justify-start w-full relative group"
              >
                <div className="max-w-xl w-full">
                  <div className="flex items-center gap-2.5 mb-3 px-1">
                    <div className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse" />
                    <span className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase">Attention Required</span>
                  </div>

                  <div className="relative overflow-hidden rounded-[32px] rounded-tl-[4px] border border-amber-100 dark:border-amber-900/30 bg-gradient-to-br from-amber-50/50 to-white dark:from-amber-950/20 dark:to-zinc-950 p-6 shadow-sm hover:shadow-md transition-all group-hover:scale-[1.01]">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 shrink-0 rounded-2xl bg-amber-600 flex items-center justify-center text-white shadow-lg">
                        <MessageSquare className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-black text-zinc-900 dark:text-zinc-100 truncate pr-4">
                            Forgotten Thread: {item.sender}
                          </h4>
                          <span className="text-[10px] font-bold text-amber-600/60 uppercase tracking-widest whitespace-nowrap">
                            {item.timestamp}
                          </span>
                        </div>
                        <p className="text-[13px] font-bold text-zinc-800 dark:text-zinc-200 mb-3 line-clamp-2">
                          "{item.subject}"
                        </p>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => onSourceClick?.({ type: 'thread', id: item.threadId, provider: 'google' })}
                            className="text-[11px] font-bold text-amber-700 dark:text-amber-400 underline underline-offset-4 hover:text-amber-600 transition-colors"
                          >
                            View Thread
                          </button>
                          <div className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                          <button
                            onClick={() => onOpenIntelligence?.('Sources')}
                            className="text-[11px] font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                          >
                            Analyze Intent
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Ambient Glow */}
                    <div className="absolute top-0 right-0 h-24 w-24 bg-amber-400/5 blur-[40px] rounded-full -mr-12 -mt-12 pointer-events-none" />
                  </div>
                  <ActionsRow actions={item.actions} onAction={(action) => onCardAction?.(action, item.id)} />
                </div>
              </motion.div>
            )

          default:
            return null
        }
      })}
    </motion.div>
  )
}
