export type ConversationState =
  | "Shadow Mode"
  | "Waiting Approval"
  | "Executing"
  | "Completed"
  | "Blocked by Rule"
  | "Needs Clarification"

export type IntelligenceTab = "Research" | "Sources" | "Documents" | "Memory" | "Timeline"

export interface ConversationSummary {
  id: string
  title: string
  subtitle: string
  timestamp: string
  status: ConversationState
}
