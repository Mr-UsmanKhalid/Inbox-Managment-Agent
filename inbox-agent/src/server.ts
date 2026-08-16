import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";

import { MockEmailConnector } from "./connectors/email/mockConnector.js";
import { buildInboxAgentGraph } from "./graph/buildGraph.js";
import {
  AgentState,
  InboundMessage,
  ConversationStatus,
} from "./types.js";
import {
  upsertConversationStatus,
  appendAuditEntries,
} from "./storage/db.js";
import {
  isMockMode,
  getActiveProvider,
} from "./llm.js";
import {
  DashboardThread,
  threadFromAgentState,
  ThreadStatus,
} from "./api/mapThread.js";

const DASHBOARD_ORIGIN =
  process.env.DASHBOARD_ORIGIN || "http://localhost:3000";

// In-memory table of processed threads.
// This is fine for testing, but it is not persistent on Vercel.
const threads = new Map<string, DashboardThread>();

const connector = new MockEmailConnector();

async function processMessage(
  message: InboundMessage,
  graph: ReturnType<typeof buildInboxAgentGraph>
) {
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

  await upsertConversationStatus(
    message.threadId,
    status,
    result.classification?.category
  );

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
    `Warmed up ${threads.size} thread(s) in ${
      isMockMode()
        ? "MOCK LLM"
        : `LIVE (${getActiveProvider()})`
    } mode.`
  );
}

const app = express();

app.use(
  cors({
    origin: DASHBOARD_ORIGIN,
  })
);

app.use(express.json());

/**
 * Health check
 */
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    mode: isMockMode() ? "mock" : getActiveProvider(),
    threadCount: threads.size,
  });
});

/**
 * Get all inbox threads
 */
app.get("/api/threads", (_req: Request, res: Response) => {
  const list = Array.from(threads.values()).sort(
    (a, b) =>
      new Date(b.receivedAt).getTime() -
      new Date(a.receivedAt).getTime()
  );

  res.json({
    threads: list,
  });
});

/**
 * Get one thread
 */
app.get(
  "/api/threads/:id",
  (req: Request, res: Response) => {
    const thread = threads.get(req.params.id);

    if (!thread) {
      res.status(404).json({
        error: "Thread not found",
      });

      return;
    }

    res.json({
      thread,
    });
  }
);

/**
 * Perform an action on a thread
 */
app.post(
  "/api/threads/:id/action",
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const {
        action,
        draftBody,
      } = req.body as {
        action?: string;
        draftBody?: string;
      };

      const thread = threads.get(id);

      if (!thread) {
        res.status(404).json({
          error: "Thread not found",
        });

        return;
      }

      /**
       * Update draft body if changed
       */
      if (
        typeof draftBody === "string" &&
        draftBody !== thread.draftBody
      ) {
        thread.draftBody = draftBody;

        thread.history.push({
          timestamp: new Date().toISOString(),
          actor: "human",
          action: "Edited draft",
        });
      }

      let newStatus: ThreadStatus;
      let conversationStatus: ConversationStatus;

      switch (action) {
        /**
         * Send reply
         */
        case "send":
          await connector.sendReply(
            id,
            thread.from,
            thread.draftBody
          );

          newStatus = "sent";
          conversationStatus = "resolved_by_human";

          thread.history.push({
            timestamp: new Date().toISOString(),
            actor: "human",
            action: "Approved & sent",
          });

          break;

        /**
         * Save draft
         */
        case "save_draft":
          await connector.saveDraft(
            id,
            thread.draftBody
          );

          newStatus = "draft_saved";
          conversationStatus = "in_progress";

          thread.history.push({
            timestamp: new Date().toISOString(),
            actor: "human",
            action: "Saved draft for later",
          });

          break;

        /**
         * Escalate
         */
        case "escalate":
          await connector.markEscalated(
            id,
            "Manually escalated by reviewer"
          );

          newStatus = "escalated";
          conversationStatus = "escalated";

          thread.history.push({
            timestamp: new Date().toISOString(),
            actor: "human",
            action: "Manually escalated",
          });

          break;

        /**
         * Unknown action
         */
        default:
          res.status(400).json({
            error: "Unknown action",
          });

          return;
      }

      thread.status = newStatus;

      await upsertConversationStatus(
        id,
        conversationStatus,
        thread.classification.category
      );

      res.json({
        thread,
      });
    } catch (error) {
      console.error(
        "Thread action failed:",
        error
      );

      res.status(500).json({
        error: "Failed to process thread action",
      });
    }
  }
);

/**
 * Export Express app for Vercel.
 *
 * IMPORTANT:
 * Do not use app.listen() here.
 * Vercel handles the HTTP server.
 */
export { app, warmUp };