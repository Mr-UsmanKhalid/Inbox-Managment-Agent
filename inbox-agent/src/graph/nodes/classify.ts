import { z } from "zod";
import { AgentState, Classification } from "../../types.js";
import { structuredModel, isMockMode } from "../../llm.js";

const ClassificationSchema = z.object({
  category: z.enum([
    "sales_inquiry",
    "support_request",
    "billing",
    "complaint",
    "order_status",
    "spam",
    "general",
    "other",
  ]),
  intent: z.string().describe("One short sentence describing what the sender wants."),
  urgency: z.number().min(0).max(100).describe("0 = no rush, 100 = needs attention immediately."),
  sentiment: z.enum(["positive", "neutral", "negative", "angry"]),
});

export async function classifyNode(state: AgentState): Promise<Partial<AgentState>> {
  const { message } = state;
  let classification: Classification;

  if (isMockMode()) {
    classification = mockClassify(message.subject, message.body);
  } else {
    const model = structuredModel(ClassificationSchema);
    classification = await model.invoke([
      {
        role: "system",
        content:
          "You classify inbound business emails. Be precise about urgency: refunds, threats to " +
          "dispute charges, repeated unanswered emails, and legal/complaint language should score high urgency.",
      },
      {
        role: "user",
        content: `Subject: ${message.subject}\n\nBody:\n${message.body}`,
      },
    ]);
  }

  return {
    classification,
    auditTrail: [
      {
        timestamp: new Date().toISOString(),
        threadId: message.threadId,
        messageId: message.id,
        step: "classify",
        data: classification,
      },
    ],
  };
}

// Deterministic keyword-based mock so the pipeline is fully testable offline.
function mockClassify(subject: string, body: string): Classification {
  const text = `${subject} ${body}`.toLowerCase();

  let category: Classification["category"] = "general";
  if (/order|shipp|track|deliver/.test(text)) category = "order_status";
  if (/refund|charge|invoice|bill/.test(text)) category = "billing";
  if (/terrible|complain|angry|disput|broken|third time/.test(text)) category = "complaint";
  if (/pricing|plan|enterprise|trial|seats|contract/.test(text)) category = "sales_inquiry";

  let urgency = 20;
  if (/refund|dispute|bank|third time|immediately|broken/.test(text)) urgency = 90;
  else if (/order|track|when will/.test(text)) urgency = 45;
  else if (/trial|pricing|how long/.test(text)) urgency = 15;

  let sentiment: Classification["sentiment"] = "neutral";
  if (/terrible|angry|disput|demand/.test(text)) sentiment = "angry";
  else if (/thanks|please|quick question/.test(text)) sentiment = "positive";

  return {
    category,
    intent: subject,
    urgency,
    sentiment,
  };
}
