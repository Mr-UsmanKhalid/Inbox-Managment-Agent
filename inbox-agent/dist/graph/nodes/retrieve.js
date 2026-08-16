import { getKnowledgeStore } from "../../knowledge/index.js";
export async function retrieveNode(state) {
    const { message } = state;
    const store = await getKnowledgeStore();
    const query = `${message.subject}\n${message.body}`;
    const retrieved = await store.search(query, 3);
    return {
        retrieved,
        auditTrail: [
            {
                timestamp: new Date().toISOString(),
                threadId: message.threadId,
                messageId: message.id,
                step: "retrieve",
                data: retrieved.map((r) => ({ source: r.source, score: r.score })),
            },
        ],
    };
}
