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
import { CalendarWidget } from "@/components/aaliyah/workspace/feed/CalendarWidget"
import { EmailDraftArtifact } from "./EmailDraftArtifact"
import type { DraftArtifact } from "./EmailDraftArtifact"
export type { DraftArtifact }
import { GroundedAnswerCard } from "@/components/aaliyah/workspace/feed/GroundedAnswerCard"
import type { Evidence } from "@/components/aaliyah/workspace/feed/GroundedAnswerCard"
export type { Evidence }
import { ProposalCard, ActionsRow } from "@/components/aaliyah/workspace/feed/ProposalCard"
import type { CardAction } from "@/components/aaliyah/workspace/feed/ProposalCard"
export type { CardAction }
import { CardShell } from "@/components/aaliyah/workspace/feed/CardShell"
import { ApprovalCard } from "@/components/aaliyah/workspace/feed/ApprovalCard"
import { SyncPromptCard } from "@/components/aaliyah/workspace/feed/SyncPromptCard"
import { ExecutionReceipt, CalendarDiffArtifact, MiniScheduleGridArtifact } from "@/components/aaliyah/workspace/feed/ArtifactCards"
import { HealthReportCard } from "@/components/aaliyah/workspace/feed/HealthReportCard"
import { MeetingActionCard } from "@/components/aaliyah/workspace/feed/MeetingActionCard"

// --- Types ---

// Types imported from EmailDraftArtifact

// CardAction imported from ProposalCard

// Evidence imported from GroundedAnswerCard

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

// GroundedAnswerCard, ActionsRow, and CardShell extracted to separate files

// ProposalCard extracted to separate file

// ApprovalCard extracted to separate file

// ExecutionReceipt, CalendarDiffArtifact, and MiniScheduleGridArtifact extracted to separate files

// SyncPromptCard extracted to separate file

// HealthReportCard and MeetingActionCard extracted to separate files

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
