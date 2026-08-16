import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import { MockEmailConnector } from "./connectors/email/mockConnector.js";
import { buildInboxAgentGraph } from "./graph/buildGraph.js";
import { AgentState, InboundMessage, ConversationStatus } from "./types.js";
import { upsertConversationStatus, appendAuditEntries } from "./storage/db.js";
import { isMockMode, getActiveProvider } from "./llm.js";
import { DashboardThread, threadFromAgentState, ThreadStatus } from "./api/mapThread.js";

const PORT = Number(process.env.PORT || 4000);
const DASHBOARD_ORIGIN = process.env.DASHBOARD_ORIGIN || "http://localhost:3000";

// In-memory table of processed threads, keyed by threadId. This is what the
// dashboard reads/writes through the HTTP API below. Swap for a real
// database when the mock connector is replaced with a live one - see the
// README section "Wiring it to the real backend".
const threads = new Map<string, DashboardThread>();
const connector = new MockEmailConnector();

async function processMessage(message: InboundMessage, graph: ReturnType<typeof buildInboxAgentGraph>) {
  const history = await connector.fetchThreadHistory(message.threadId);

  const initialState: Partial<AgentState> = {
    message,
    history,
    auditTrail: [],
  };

  const result = (await graph.invoke(initialState)) as AgentState;
  await appendAuditEntries(result.auditTrail);

  const status: ConversationStatus =
    result.finalAction === "escalate"
      ? "escalated"
      : result.finalAction === "send"
      ? "auto_resolved"
      : result.finalAction === "save_draft"
      ? "in_progress"
      : "new";
  await upsertConversationStatus(message.threadId, status, result.classification?.category);

  const thread = threadFromAgentState(message, result);
  threads.set(thread.id, thread);
  return thread;
}

async function warmUp() {
  const graph = buildInboxAgentGraph();
  const messages = await connector.fetchNewMessages();
  for (const message of messages) {
    await processMessage(message, graph);
  }
  console.log(
    `Warmed up ${threads.size} thread(s) in ${isMockMode() ? "MOCK LLM" : `LIVE (${getActiveProvider()})`} mode.`
  );
}

const app = express();
app.use(cors({ origin: DASHBOARD_ORIGIN }));
app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true, mode: isMockMode() ? "mock" : getActiveProvider(), threadCount: threads.size });
});

app.get("/api/threads", (_req: Request, res: Response) => {
  const list = Array.from(threads.values()).sort(
    (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
  );
  res.json({ threads: list });
});

app.get("/api/threads/:id", (req: Request, res: Response) => {
  const thread = threads.get(req.params.id);
  if (!thread) {
    res.status(404).json({ error: "Thread not found" });
    return;
  }
  res.json({ thread });
});

app.post("/api/threads/:id/action", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { action, draftBody } = req.body as { action?: string; draftBody?: string };

  const thread = threads.get(id);
  if (!thread) {
    res.status(404).json({ error: "Thread not found" });
    return;
  }

  if (typeof draftBody === "string" && draftBody !== thread.draftBody) {
    thread.draftBody = draftBody;
    thread.history.push({ timestamp: new Date().toISOString(), actor: "human", action: "Edited draft" });
  }

  let newStatus: ThreadStatus;
  let conversationStatus: ConversationStatus;
  switch (action) {
    case "send":
      await connector.sendReply(id, thread.from, thread.draftBody);
      newStatus = "sent";
      conversationStatus = "resolved_by_human";
      thread.history.push({ timestamp: new Date().toISOString(), actor: "human", action: "Approved & sent" });
      break;
    case "save_draft":
      await connector.saveDraft(id, thread.draftBody);
      newStatus = "draft_saved";
      conversationStatus = "in_progress";
      thread.history.push({ timestamp: new Date().toISOString(), actor: "human", action: "Saved draft for later" });
      break;
    case "escalate":
      await connector.markEscalated(id, "Manually escalated by reviewer");
      newStatus = "escalated";
      conversationStatus = "escalated";
      thread.history.push({ timestamp: new Date().toISOString(), actor: "human", action: "Manually escalated" });
      break;
    default:
      res.status(400).json({ error: "Unknown action" });
      return;
  }

  thread.status = newStatus;
  await upsertConversationStatus(id, conversationStatus, thread.classification.category);

  res.json({ thread });
});

async function main() {
  await warmUp();
  app.listen(PORT, () => {
    console.log(`Inbox agent API listening on http://localhost:${PORT}`);
    console.log(`Allowing requests from dashboard origin: ${DASHBOARD_ORIGIN}`);
  });
}

main().catch((err) => {
  console.error("Fatal error starting server:", err);
  process.exit(1);
});
