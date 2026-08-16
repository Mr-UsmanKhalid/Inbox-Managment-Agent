import { z } from "zod";
import { structuredModel, isMockMode } from "../../llm.js";
const DraftSchema = z.object({
    body: z.string().describe("The email reply body, professional and concise."),
    confidence: z.number().min(0).max(1).describe("How confident you are this fully and correctly answers the sender."),
});
export async function draftNode(state) {
    const { message, classification, entities, retrieved } = state;
    let draft;
    const context = (retrieved || []).map((r) => `[${r.source}] ${r.content}`).join("\n\n");
    const usedSources = (retrieved || []).map((r) => r.source);
    if (isMockMode()) {
        draft = mockDraft(message.body, context, entities?.customerName, classification?.category);
    }
    else {
        const model = structuredModel(DraftSchema, 0.3);
        const result = await model.invoke([
            {
                role: "system",
                content: "You draft customer support/sales email replies for a business. Use ONLY the provided " +
                    "knowledge base context to answer factual questions. If the context doesn't fully cover the " +
                    "question, say so honestly and set confidence low rather than guessing. Be concise and professional.",
            },
            {
                role: "user",
                content: `Customer email:\nSubject: ${message.subject}\n${message.body}\n\n` +
                    `Extracted info: ${JSON.stringify(entities)}\n\n` +
                    `Category: ${classification?.category}\n\n` +
                    `Knowledge base context:\n${context || "(no relevant context found)"}`,
            },
        ]);
        draft = { ...result, usedSources };
    }
    return {
        draft,
        auditTrail: [
            {
                timestamp: new Date().toISOString(),
                threadId: message.threadId,
                messageId: message.id,
                step: "draft",
                data: draft,
            },
        ],
    };
}
function mockDraft(body, context, name, category) {
    const greeting = name ? `Hi ${name},` : "Hi,";
    if (!context) {
        return {
            body: `${greeting}\n\nThanks for reaching out. I don't have enough information in our knowledge base to fully answer this yet, so I'm flagging it for a team member to follow up shortly.\n\nBest,\nSupport Team`,
            confidence: 0.2,
            usedSources: [],
        };
    }
    return {
        body: `${greeting}\n\nThanks for your message. Here's what I can share:\n\n${context.slice(0, 400)}\n\nLet me know if you have any other questions!\n\nBest,\nSupport Team`,
        confidence: 0.75,
        usedSources: [],
    };
}
