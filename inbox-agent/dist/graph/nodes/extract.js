import { z } from "zod";
import { structuredModel, isMockMode } from "../../llm.js";
const EntitiesSchema = z.object({
    customerName: z.string().optional(),
    orderNumber: z.string().optional(),
    dates: z.array(z.string()).optional(),
    requirements: z.array(z.string()).optional().describe("Any specific asks, e.g. 'wants a refund', 'needs SSO'."),
});
export async function extractNode(state) {
    const { message } = state;
    let entities;
    if (isMockMode()) {
        entities = mockExtract(message.from, message.body);
    }
    else {
        const model = structuredModel(EntitiesSchema);
        entities = await model.invoke([
            {
                role: "system",
                content: "Extract structured entities from this email. Leave fields empty if not present - do not guess.",
            },
            {
                role: "user",
                content: `From: ${message.from}\nSubject: ${message.subject}\n\nBody:\n${message.body}`,
            },
        ]);
    }
    return {
        entities,
        auditTrail: [
            {
                timestamp: new Date().toISOString(),
                threadId: message.threadId,
                messageId: message.id,
                step: "extract",
                data: entities,
            },
        ],
    };
}
function mockExtract(from, body) {
    const orderMatch = body.match(/order\s*#?(\d{4,})/i);
    const nameGuess = from.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const requirements = [];
    if (/refund/i.test(body))
        requirements.push("wants a refund");
    if (/sso/i.test(body))
        requirements.push("needs SSO");
    if (/trial/i.test(body))
        requirements.push("asking about free trial terms");
    return {
        customerName: nameGuess,
        orderNumber: orderMatch ? orderMatch[1] : undefined,
        dates: [],
        requirements,
    };
}
