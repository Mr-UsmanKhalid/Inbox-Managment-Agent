import { AgentState, EscalationDecision } from "../../types.js";

// Hard-coded guardrails - these should NOT depend purely on LLM judgment,
// since this is the safety net that prevents the agent from auto-handling
// something it shouldn't (refunds, legal, angry customers, low-confidence answers).
const URGENCY_THRESHOLD = 70;
const CONFIDENCE_THRESHOLD = 0.5;
const ESCALATION_KEYWORDS = [
  "lawsuit",
  "lawyer",
  "legal action",
  "sue",
  "dispute the charge",
  "chargeback",
  "cancel my account",
  "data breach",
  "gdpr",
  "unsubscribe",
];

export async function escalateNode(state: AgentState): Promise<Partial<AgentState>> {
  const { message, classification, draft, entities } = state;
  const triggeredRules: string[] = [];
  const bodyLower = message.body.toLowerCase();

  if (classification && classification.urgency >= URGENCY_THRESHOLD) {
    triggeredRules.push(`urgency_score>=${URGENCY_THRESHOLD} (${classification.urgency})`);
  }
  if (classification?.sentiment === "angry") {
    triggeredRules.push("sentiment=angry");
  }
  if (classification?.category === "complaint") {
    triggeredRules.push("category=complaint");
  }
  if (draft && draft.confidence < CONFIDENCE_THRESHOLD) {
    triggeredRules.push(`low_draft_confidence (${draft.confidence})`);
  }
  for (const kw of ESCALATION_KEYWORDS) {
    if (bodyLower.includes(kw)) triggeredRules.push(`keyword:"${kw}"`);
  }
  // Large refund amounts mentioned in the body (simple $ pattern), matches
  // the "refunds over $500 need a human" rule from the knowledge base policy.
  const dollarMatch = bodyLower.match(/\$(\d{3,})/);
  if (dollarMatch && parseInt(dollarMatch[1], 10) >= 500) {
    triggeredRules.push(`high_dollar_amount ($${dollarMatch[1]})`);
  }

  const escalation: EscalationDecision = {
    escalate: triggeredRules.length > 0,
    reason: triggeredRules.length > 0 ? triggeredRules.join("; ") : "No escalation rules triggered.",
    triggeredRules,
  };

  const finalAction: AgentState["finalAction"] = escalation.escalate
    ? "escalate"
    : draft && draft.confidence >= CONFIDENCE_THRESHOLD
    ? "save_draft" // default to draft-for-review rather than auto-send; see README for auto-send toggle
    : "escalate";

  return {
    escalation,
    finalAction,
    auditTrail: [
      {
        timestamp: new Date().toISOString(),
        threadId: message.threadId,
        messageId: message.id,
        step: "escalate",
        data: { escalation, finalAction },
      },
    ],
  };
}
