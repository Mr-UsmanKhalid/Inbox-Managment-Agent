// Core domain types shared across the whole pipeline.
// Keeping these channel-agnostic means Gmail, Outlook, or any other
// connector can all feed the same graph.

export interface InboundMessage {
  id: string;
  threadId: string;
  channel: "gmail" | "outlook" | "mock";
  from: string;
  to: string;
  subject: string;
  body: string;
  receivedAt: string; // ISO timestamp
  attachments?: { filename: string; contentType: string }[];
}

export type Category =
  | "sales_inquiry"
  | "support_request"
  | "billing"
  | "complaint"
  | "order_status"
  | "spam"
  | "general"
  | "other";

export interface Classification {
  category: Category;
  intent: string; // short free-text description of what the sender wants
  urgency: number; // 0-100
  sentiment: "positive" | "neutral" | "negative" | "angry";
}

export interface ExtractedEntities {
  customerName?: string;
  orderNumber?: string;
  dates?: string[];
  requirements?: string[];
  otherEntities?: Record<string, string>;
}

export interface RetrievedChunk {
  content: string;
  source: string;
  score: number;
}

export interface DraftResponse {
  body: string;
  confidence: number; // 0-1, how confident the agent is this answer is correct/complete
  usedSources: string[];
}

export interface EscalationDecision {
  escalate: boolean;
  reason: string;
  triggeredRules: string[];
}

export type ConversationStatus =
  | "new"
  | "in_progress"
  | "auto_resolved"
  | "escalated"
  | "resolved_by_human";

export interface AuditLogEntry {
  timestamp: string;
  threadId: string;
  messageId: string;
  step: string;
  data: unknown;
}

// The state object that flows through every node of the LangGraph.
export interface AgentState {
  message: InboundMessage;
  history: InboundMessage[]; // prior messages in the thread, for context
  classification?: Classification;
  entities?: ExtractedEntities;
  retrieved?: RetrievedChunk[];
  draft?: DraftResponse;
  escalation?: EscalationDecision;
  finalAction?: "send" | "save_draft" | "escalate" | "ignore";
  auditTrail: AuditLogEntry[];
}
