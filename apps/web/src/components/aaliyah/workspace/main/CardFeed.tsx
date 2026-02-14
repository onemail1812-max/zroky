"use client"

import * as React from "react"
import { CalendarRange, CheckCircle2, FileText, Mail, ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"
import type { IntelligenceTab } from "@/components/aaliyah/workspace/types"
import { Button } from "@/components/aaliyah/ui/Button"

export type DraftArtifact = {
  to: string
  subject: string
  body: string
}

export type FeedItem =
  | { id: string; type: "user-command"; text: string; timestamp: string }
  | { id: string; type: "response"; title: string; text: string; tone?: "normal" | "error" }
  | { id: string; type: "proposal"; title: string; bullets: string[] }
  | { id: string; type: "approval"; title: string; detail: string }
  | { id: string; type: "receipt"; text: string; timestamp: string }
  | { id: string; type: "artifact-email"; draft: DraftArtifact }
  | { id: string; type: "artifact-calendar"; title: string; items: Array<{ time: string; update: string }> }
  | { id: string; type: "artifact-grid"; title: string; slots: Array<{ slot: string; monday: string; tuesday: string; wednesday: string }> }

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
  draft,
  onChange,
  onOpenDocument,
}: {
  draft: DraftArtifact
  onChange?: (draft: DraftArtifact) => void
  onOpenDocument?: () => void
}) {
  return (
    <CardShell className="overflow-hidden p-0">
      <div className="bg-surfaceElevated border-b border-borderSubtle px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 text-textSecondary">
          <Mail className="h-4 w-4" strokeWidth={1.5} />
          <h3 className="text-[13px] font-semibold text-textPrimary tracking-wide">Email Draft</h3>
        </div>

        {onOpenDocument && (
          <Button variant="ghost" size="sm" onClick={onOpenDocument} className="h-7 text-[11px] text-textMuted hover:text-textPrimary">
            Open Full Editor <ArrowRight className="ml-2 h-3 w-3" />
          </Button>
        )}
      </div>

      <div className="p-6 grid gap-4 bg-surface">
        <div className="grid grid-cols-[60px_1fr] gap-4 items-center">
          <span className="text-[12px] font-medium text-textMuted text-right">To</span>
          <input
            value={draft.to}
            onChange={(e) => onChange?.({ ...draft, to: e.target.value })}
            className="h-9 w-full rounded-md bg-transparent border-b border-borderSubtle px-0 text-[14px] text-textPrimary focus:border-textPrimary focus:outline-none transition-colors"
            placeholder="Recipient"
          />
        </div>
        <div className="grid grid-cols-[60px_1fr] gap-4 items-center">
          <span className="text-[12px] font-medium text-textMuted text-right">Subject</span>
          <input
            value={draft.subject}
            onChange={(e) => onChange?.({ ...draft, subject: e.target.value })}
            className="h-9 w-full rounded-md bg-transparent border-b border-borderSubtle px-0 text-[14px] font-medium text-textPrimary focus:border-textPrimary focus:outline-none transition-colors"
            placeholder="Subject line"
          />
        </div>
        <div className="mt-2 pl-[76px]">
          <textarea
            value={draft.body}
            onChange={(e) => onChange?.({ ...draft, body: e.target.value })}
            rows={6}
            className="w-full resize-y rounded-md bg-surfaceElevated/50 p-4 text-[13px] leading-7 text-textSecondary focus:bg-surfaceElevated focus:outline-none focus:ring-1 focus:ring-borderSubtle transition-all"
            placeholder="Draft content..."
          />
        </div>
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

export function CardFeed({
  items,
  onOpenIntelligence,
  onUpdateDraft,
  onApprovalAction,
}: {
  items: FeedItem[]
  onOpenIntelligence: (tab: IntelligenceTab) => void
  onUpdateDraft?: (id: string, draft: DraftArtifact) => void
  onApprovalAction?: (action: "approve" | "edit" | "reject", id: string) => void
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
                  draft={item.draft}
                  onChange={(draft) => onUpdateDraft?.(item.id, draft)}
                  onOpenDocument={() => onOpenIntelligence("Documents")}
                />
              </div>
            )

          case "artifact-calendar":
            return <div key={item.id} className="animate-in fade-in"><CalendarDiffArtifact title={item.title} items={item.items} /></div>

          case "artifact-grid":
            return <div key={item.id} className="animate-in fade-in"><MiniScheduleGridArtifact title={item.title} slots={item.slots} /></div>

          default:
            return null
        }
      })}
    </div>
  )
}
