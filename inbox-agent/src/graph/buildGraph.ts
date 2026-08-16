import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { AgentState } from "../types.js";
import { classifyNode } from "./nodes/classify.js";
import { extractNode } from "./nodes/extract.js";
import { retrieveNode } from "./nodes/retrieve.js";
import { draftNode } from "./nodes/draft.js";
import { escalateNode } from "./nodes/escalate.js";

// LangGraph state channels. Most fields just get overwritten each run;
// auditTrail accumulates across nodes.
const StateAnnotation = Annotation.Root({
  message: Annotation<AgentState["message"]>(),
  history: Annotation<AgentState["history"]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),
  classification: Annotation<AgentState["classification"]>(),
  entities: Annotation<AgentState["entities"]>(),
  retrieved: Annotation<AgentState["retrieved"]>(),
  draft: Annotation<AgentState["draft"]>(),
  escalation: Annotation<AgentState["escalation"]>(),
  finalAction: Annotation<AgentState["finalAction"]>(),
  auditTrail: Annotation<AgentState["auditTrail"]>({
    reducer: (prev, next) => [...(prev || []), ...(next || [])],
    default: () => [],
  }),
});

export function buildInboxAgentGraph() {
  const graph = new StateGraph(StateAnnotation)
    .addNode("classify", classifyNode)
    .addNode("extract", extractNode)
    .addNode("retrieve", retrieveNode)
    .addNode("draftReply", draftNode)
    .addNode("escalate", escalateNode)
    .addEdge(START, "classify")
    .addEdge("classify", "extract")
    .addEdge("extract", "retrieve")
    .addEdge("retrieve", "draftReply")
    .addEdge("draftReply", "escalate")
    .addEdge("escalate", END);

  return graph.compile();
}
