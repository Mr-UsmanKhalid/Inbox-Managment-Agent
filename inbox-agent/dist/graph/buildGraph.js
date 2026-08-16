import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { classifyNode } from "./nodes/classify.js";
import { extractNode } from "./nodes/extract.js";
import { retrieveNode } from "./nodes/retrieve.js";
import { draftNode } from "./nodes/draft.js";
import { escalateNode } from "./nodes/escalate.js";
// LangGraph state channels. Most fields just get overwritten each run;
// auditTrail accumulates across nodes.
const StateAnnotation = Annotation.Root({
    message: Annotation(),
    history: Annotation({
        reducer: (_prev, next) => next,
        default: () => [],
    }),
    classification: Annotation(),
    entities: Annotation(),
    retrieved: Annotation(),
    draft: Annotation(),
    escalation: Annotation(),
    finalAction: Annotation(),
    auditTrail: Annotation({
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
