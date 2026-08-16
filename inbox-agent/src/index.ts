import "dotenv/config";
import { MockEmailConnector } from "./connectors/email/mockConnector.js";
import { buildInboxAgentGraph } from "./graph/buildGraph.js";
import { AgentState, InboundMessage } from "./types.js";
import { upsertConversationStatus, appendAuditEntries, getAllAuditEntries } from "./storage/db.js";
import { isMockMode, getActiveProvider } from "./llm.js";

async function processMessage(message: InboundMessage, graph: ReturnType<typeof buildInboxAgentGraph>) {
  const connector = new MockEmailConnector();
  const history = await connector.fetchThreadHistory(message.threadId);

  const initialState: Partial<AgentState> = {
    message,
    history,
    auditTrail: [],
  };

  const result = (await graph.invoke(initialState)) as AgentState;

  await appendAuditEntries(result.auditTrail);

  switch (result.finalAction) {
    case "save_draft":
      await connector.saveDraft(message.threadId, result.draft?.body || "");
      await upsertConversationStatus(message.threadId, "auto_resolved", result.classification?.category);
      break;
    case "escalate":
      await connector.markEscalated(message.threadId, result.escalation?.reason || "unspecified");
      await upsertConversationStatus(message.threadId, "escalated", result.classification?.category);
      break;
    case "send":
      await connector.sendReply(message.threadId, message.from, result.draft?.body || "");
      await upsertConversationStatus(message.threadId, "auto_resolved", result.classification?.category);
      break;
    default:
      await upsertConversationStatus(message.threadId, "new", result.classification?.category);
  }

  console.log("─".repeat(70));
  console.log(`Thread: ${message.threadId} | From: ${message.from}`);
  console.log(`Subject: ${message.subject}`);
  console.log(`Category: ${result.classification?.category} | Urgency: ${result.classification?.urgency} | Sentiment: ${result.classification?.sentiment}`);
  console.log(`Entities: ${JSON.stringify(result.entities)}`);
  console.log(`Draft confidence: ${result.draft?.confidence}`);
  console.log(`Final action: ${result.finalAction}`);
  if (result.escalation?.escalate) {
    console.log(`Escalation reason: ${result.escalation.reason}`);
  }
}

async function main() {
  const vectorBackend = (process.env.VECTOR_STORE || "memory").toLowerCase();
  console.log(
    `Running in ${isMockMode() ? "MOCK LLM" : `LIVE (${getActiveProvider()})`} mode. ` +
      `Vector store: ${vectorBackend}.\n`
  );

  const connector = new MockEmailConnector();
  const messages = await connector.fetchNewMessages();
  const graph = buildInboxAgentGraph();

  for (const message of messages) {
    await processMessage(message, graph);
  }

  const auditLog = await getAllAuditEntries();
  console.log("\n" + "═".repeat(70));
  console.log(`Done. ${messages.length} messages processed, ${auditLog.length} audit entries logged to data/db.json`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
