import "dotenv/config";
import express from "express";
import cors from "cors";
import { MockEmailConnector } from "./connectors/email/mockConnector.js";
import { buildInboxAgentGraph } from "./graph/buildGraph.js";
import { upsertConversationStatus, appendAuditEntries } from "./storage/db.js";
import { isMockMode, getActiveProvider } from "./llm.js";
import { threadFromAgentState } from "./api/mapThread.js";
const DASHBOARD_ORIGIN = process.env.DASHBOARD_ORIGIN || "http://localhost:3000";
// In-memory table of processed threads, keyed by threadId. This is what the
// dashboard reads/writes through the HTTP API below. Swap for a real
// database when the mock connector is replaced with a live one - see the
// README section "Wiring it to the real backend".
const threads = new Map();
const connector = new MockEmailConnector();
async function processMessage(message, graph) {
    const history = await connector.fetchThreadHistory(message.threadId);
    const initialState = {
        message,
        history,
        auditTrail: [],
    };
    const result = (await graph.invoke(initialState));
    await appendAuditEntries(result.auditTrail);
    const status = result.finalAction === "escalate"
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
    console.log(`Warmed up ${threads.size} thread(s) in ${isMockMode() ? "MOCK LLM" : `LIVE (${getActiveProvider()})`} mode.`);
}
const app = express();
app.use(cors({ origin: DASHBOARD_ORIGIN }));
app.use(express.json());
app.get("/health", (_req, res) => {
    res.json({ ok: true, mode: isMockMode() ? "mock" : getActiveProvider(), threadCount: threads.size });
});
app.get("/api/threads", (_req, res) => {
    const list = Array.from(threads.values()).sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
    res.json({ threads: list });
});
app.get("/api/threads/:id", (req, res) => {
    const thread = threads.get(req.params.id);
    if (!thread) {
        res.status(404).json({ error: "Thread not found" });
        return;
    }
    res.json({ thread });
});
app.post("/api/threads/:id/action", async (req, res) => {
    const { id } = req.params;
    const { action, draftBody } = req.body;
    const thread = threads.get(id);
    if (!thread) {
        res.status(404).json({ error: "Thread not found" });
        return;
    }
    if (typeof draftBody === "string" && draftBody !== thread.draftBody) {
        thread.draftBody = draftBody;
        thread.history.push({ timestamp: new Date().toISOString(), actor: "human", action: "Edited draft" });
    }
    let newStatus;
    let conversationStatus;
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
export { app, warmUp };
