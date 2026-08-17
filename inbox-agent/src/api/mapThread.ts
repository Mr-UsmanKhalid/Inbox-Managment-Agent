import { AgentState, InboundMessage } from "../types.js";

// Mirrors inbox-dashboard/lib/types.ts. Kept as a separate copy (rather than
// a shared package) since the two projects are deployed independently - if
// you later move both into a monorepo, replace this with a shared types
// package instead of hand-syncing.
export type ThreadStatus = "pending_review" | "escalated" | "sent" | "draft_saved";

export interface DashboardThread {
  id: string;
  from: string;
  subject: string;
  body: string;
  receivedAt: string;
  classification: {
    category: string;
    urgency: number;
    sentiment: string;
  };
  entities: {
    customerName?: string;
    orderNumber?: string;
    requirements: string[];
    crm?: {
      tier?: string;
      lifetimeValue?: string;
      openTickets?: string;
      notes?: string;
    };
  };
  retrieved: { content: string; source: string }[];
  draftBody: string;
  draftConfidence: number;
  escalation: {
    escalate: boolean;
    reason: string;
    triggeredRules: string[];
  };
  status: ThreadStatus;
  history: { timestamp: string; actor: "agent" | "human"; action: string; detail?: string }[];
}

function statusFromFinalAction(finalAction: AgentState["finalAction"]): ThreadStatus {
  switch (finalAction) {
    case "escalate":
      return "escalated";
    case "send":
      return "sent";
    case "save_draft":
    default:
      // Agent produced a draft but auto-send is off - a human still needs
      // to review it, so this lands in the review queue rather than
      // "draft_saved" (which is reserved for a human explicitly saving one
      // for later via the dashboard).
      return "pending_review";
  }
}

export function threadFromAgentState(message: InboundMessage, result: AgentState): DashboardThread {
  const history: DashboardThread["history"] = [];

  if (result.classification) {
    history.push({
      timestamp: new Date().toISOString(),
      actor: "agent",
      action: "Classified",
      detail: `${result.classification.category} · urgency ${result.classification.urgency} · ${result.classification.sentiment}`,
    });
  }

  if (result.escalation?.escalate) {
    history.push({
      timestamp: new Date().toISOString(),
      actor: "agent",
      action: "Escalated to human",
      detail: `${result.escalation.triggeredRules.length} rule(s) triggered`,
    });
  } else if (result.draft) {
    history.push({
      timestamp: new Date().toISOString(),
      actor: "agent",
      action: "Draft prepared",
      detail: `confidence ${result.draft.confidence}`,
    });
  }

  return {
    id: message.threadId,
    from: message.from,
    subject: message.subject,
    body: message.body,
    receivedAt: message.receivedAt,
    classification: {
      category: result.classification?.category ?? "general",
      urgency: result.classification?.urgency ?? 0,
      sentiment: result.classification?.sentiment ?? "neutral",
    },
    entities: {
      customerName: result.entities?.customerName,
      orderNumber: result.entities?.orderNumber,
      requirements: result.entities?.requirements ?? [],
      crm: result.entities?.otherEntities?.crmCustomerId
        ? {
            tier: result.entities.otherEntities.crmTier,
            lifetimeValue: result.entities.otherEntities.crmLifetimeValue,
            openTickets: result.entities.otherEntities.crmOpenTickets,
            notes: result.entities.otherEntities.crmNotes,
          }
        : undefined,
    },
    retrieved: (result.retrieved ?? []).map((r) => ({ content: r.content, source: r.source })),
    draftBody: result.draft?.body ?? "",
    draftConfidence: result.draft?.confidence ?? 0,
    escalation: result.escalation ?? { escalate: false, reason: "No escalation rules triggered.", triggeredRules: [] },
    status: statusFromFinalAction(result.finalAction),
    history,
  };
}
