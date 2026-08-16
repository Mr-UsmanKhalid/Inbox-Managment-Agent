export type Category =
  | "sales_inquiry"
  | "support_request"
  | "billing"
  | "complaint"
  | "order_status"
  | "spam"
  | "general";

export type Sentiment = "positive" | "neutral" | "negative" | "angry";

export type ThreadStatus = "pending_review" | "escalated" | "sent" | "draft_saved";

export interface Classification {
  category: Category;
  urgency: number; // 0-100
  sentiment: Sentiment;
}

export interface ExtractedEntities {
  customerName?: string;
  orderNumber?: string;
  requirements: string[];
}

export interface RetrievedChunk {
  content: string;
  source: string;
}

export interface Escalation {
  escalate: boolean;
  reason: string;
  triggeredRules: string[];
}

export interface Thread {
  id: string;
  from: string;
  subject: string;
  body: string;
  receivedAt: string;
  classification: Classification;
  entities: ExtractedEntities;
  retrieved: RetrievedChunk[];
  draftBody: string;
  draftConfidence: number; // 0-1
  escalation: Escalation;
  status: ThreadStatus;
  history: { timestamp: string; actor: "agent" | "human"; action: string; detail?: string }[];
}
