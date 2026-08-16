import { ChatOpenAI } from "@langchain/openai";
import { ChatGroq } from "@langchain/groq";
function getProvider() {
    const p = (process.env.LLM_PROVIDER || "openai").toLowerCase();
    return p === "groq" ? "groq" : "openai";
}
function hasKeyForProvider(provider) {
    return provider === "groq" ? !!process.env.GROQ_API_KEY : !!process.env.OPENAI_API_KEY;
}
const PROVIDER = getProvider();
const USE_MOCK = process.env.MOCK_LLM === "true" || !hasKeyForProvider(PROVIDER);
export function getChatModel(temperature = 0) {
    if (USE_MOCK) {
        throw new Error("getChatModel() called in mock mode - nodes should check isMockMode() first and use mock logic instead.");
    }
    if (PROVIDER === "groq") {
        // Groq: fast/cheap inference. Good models for structured output:
        // llama-3.3-70b-versatile, llama-3.1-8b-instant, mixtral-8x7b-32768
        return new ChatGroq({
            model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
            temperature,
        });
    }
    return new ChatOpenAI({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature,
    });
}
export function isMockMode() {
    return USE_MOCK;
}
export function getActiveProvider() {
    return PROVIDER;
}
/**
 * Returns a runnable that invokes the active chat model and parses its
 * output against `schema`. Both ChatOpenAI and ChatGroq implement
 * withStructuredOutput, but TypeScript can't unify their overloaded
 * signatures across the union type returned by getChatModel() - this
 * helper isolates the necessary cast in one place instead of scattering
 * `as any` through every graph node.
 */
export function structuredModel(schema, temperature = 0) {
    const model = getChatModel(temperature);
    return model.withStructuredOutput(schema);
}
